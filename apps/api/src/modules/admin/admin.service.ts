import { advanceMatchTree, createBracketInDatabase } from "../../lib/brackets";
import { prisma } from "../../lib/prisma";
import type { Role } from "../../types/domain";
import { ApiError } from "../../utils/api-error";
import { tournamentsService } from "../tournaments/tournaments.service";
import { tournamentsRepository } from "../tournaments/tournaments.repository";

type ResultInput = {
  scoreA: number;
  scoreB: number;
  forceEdit?: boolean;
};

type ReplayResult = {
  key: string;
  scoreA: number;
  scoreB: number;
};

const getMatchKey = (match: {
  bracketType: string;
  round: number;
  slot: number;
}) => `${match.bracketType}:${match.round}:${match.slot}`;

const collectDescendantMatchIds = (
  matches: Awaited<ReturnType<typeof tournamentsRepository.listMatchesForTournament>>,
  sourceMatchId: string
) => {
  const descendants = new Set<string>();
  const matchesById = new Map(matches.map((match) => [match.id, match]));
  const queue = [sourceMatchId];

  while (queue.length > 0) {
    const currentId = queue.shift()!;
    const currentMatch = matchesById.get(currentId);

    if (!currentMatch) {
      continue;
    }

    [currentMatch.nextWinMatchId, currentMatch.nextLoseMatchId].forEach((nextId) => {
      if (nextId && !descendants.has(nextId)) {
        descendants.add(nextId);
        queue.push(nextId);
      }
    });
  }

  return descendants;
};

const applyResolvedMatchResult = async (
  transaction: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
  matchId: string,
  input: { scoreA: number; scoreB: number }
) => {
  const match = await transaction.match.findUnique({
    where: { id: matchId },
    include: {
      tournament: true
    }
  });

  if (!match) {
    throw new ApiError(404, "Match not found");
  }

  if (!match.teamAId || !match.teamBId) {
    throw new ApiError(400, "Both teams must be assigned before entering a result");
  }

  if (input.scoreA === input.scoreB) {
    throw new ApiError(400, "Matches cannot end in a draw");
  }

  const winnerId = input.scoreA > input.scoreB ? match.teamAId : match.teamBId;
  const loserId = input.scoreA > input.scoreB ? match.teamBId : match.teamAId;

  await transaction.match.update({
    where: { id: matchId },
    data: {
      scoreA: input.scoreA,
      scoreB: input.scoreB,
      winnerId,
      status: "COMPLETED"
    }
  });

  await advanceMatchTree(transaction, matchId, winnerId, loserId);
  return match.tournamentId;
};

const syncTournamentStatus = async (
  transaction: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
  tournamentId: string
) => {
  const [remaining, tournament] = await Promise.all([
    transaction.match.count({
      where: {
        tournamentId,
        status: {
          not: "COMPLETED"
        }
      }
    }),
    transaction.tournament.findUnique({
      where: { id: tournamentId }
    })
  ]);

  if (!tournament) {
    throw new ApiError(404, "Tournament not found");
  }

  if (remaining === 0) {
    await transaction.tournament.update({
      where: { id: tournamentId },
      data: {
        status: "FINISHED"
      }
    });
    return;
  }

  if (tournament.status !== "LIVE") {
    await transaction.tournament.update({
      where: { id: tournamentId },
      data: {
        status: "LIVE"
      }
    });
  }
};

const rebuildTournamentWithReplay = async (
  transaction: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
  tournamentId: string,
  replayResults: ReplayResult[]
) => {
  const tournament = await transaction.tournament.findUnique({
    where: { id: tournamentId },
    include: {
      participants: {
        where: {
          status: "APPROVED"
        },
        orderBy: [{ seed: "asc" }, { createdAt: "asc" }],
        include: {
          team: true
        }
      }
    }
  });

  if (!tournament) {
    throw new ApiError(404, "Tournament not found");
  }

  await transaction.match.deleteMany({
    where: { tournamentId }
  });

  await createBracketInDatabase(transaction, tournamentId, tournament.format, tournament.participants);

  const pending = [...replayResults];

  while (pending.length > 0) {
    const matches = await transaction.match.findMany({
      where: { tournamentId },
      orderBy: [{ bracketType: "asc" }, { round: "asc" }, { slot: "asc" }]
    });
    const matchesByKey = new Map(matches.map((match) => [getMatchKey(match), match]));
    let progressed = false;

    for (const result of [...pending]) {
      const match = matchesByKey.get(result.key);

      if (!match || !match.teamAId || !match.teamBId || match.status === "COMPLETED") {
        continue;
      }

      await applyResolvedMatchResult(transaction, match.id, result);
      pending.splice(pending.indexOf(result), 1);
      progressed = true;
    }

    if (!progressed) {
      break;
    }
  }

  await syncTournamentStatus(transaction, tournamentId);
};

export const adminService = {
  async getOverview(user: { id: string; role: Role }) {
    return tournamentsService.listManagedTournaments(user);
  },

  async approveParticipant(user: { id: string; role: Role }, participantId: string) {
    return tournamentsService.approveParticipant(user, participantId);
  },

  async rejectParticipant(user: { id: string; role: Role }, participantId: string) {
    return tournamentsService.rejectParticipant(user, participantId);
  },

  async generateBracket(user: { id: string; role: Role }, tournamentId: string) {
    return tournamentsService.generateBracket(user, tournamentId);
  },

  async resetTournament(user: { id: string; role: Role }, tournamentId: string) {
    const tournament = await tournamentsRepository.getTournamentById(tournamentId);

    if (!tournament) {
      throw new ApiError(404, "Tournament not found");
    }

    if (user.role !== "ADMIN" && tournament.organizerId !== user.id) {
      throw new ApiError(403, "You cannot manage this tournament");
    }

    await prisma.$transaction(async (transaction) => {
      await transaction.match.deleteMany({
        where: { tournamentId }
      });

      const approvedCount = await transaction.participant.count({
        where: {
          tournamentId,
          status: "APPROVED"
        }
      });

      const nextStatus =
        new Date(tournament.registrationClosesAt) > new Date() || approvedCount < 2
          ? "REGISTRATION"
          : "READY";

      await transaction.tournament.update({
        where: { id: tournamentId },
        data: {
          status: nextStatus
        }
      });
    });

    return tournamentsService.getTournament(tournamentId);
  },

  async updateMatchResult(
    user: { id: string; role: Role },
    matchId: string,
    input: ResultInput
  ) {
    const tournamentMatch = await tournamentsRepository.getMatchById(matchId);

    if (!tournamentMatch) {
      throw new ApiError(404, "Match not found");
    }

    if (user.role !== "ADMIN" && tournamentMatch.tournament.organizerId !== user.id) {
      throw new ApiError(403, "You cannot manage this match");
    }

    if (!tournamentMatch.teamAId || !tournamentMatch.teamBId) {
      throw new ApiError(400, "Both teams must be assigned before entering a result");
    }

    if (tournamentMatch.status === "COMPLETED" && !input.forceEdit) {
      throw new ApiError(
        409,
        "This match is locked after completion. Confirm edit to replay downstream matches."
      );
    }

    if (tournamentMatch.status !== "COMPLETED") {
      await prisma.$transaction(async (transaction) => {
        await applyResolvedMatchResult(transaction, matchId, input);
        await syncTournamentStatus(transaction, tournamentMatch.tournamentId);
      });

      return tournamentsService.getTournament(tournamentMatch.tournamentId);
    }

    const tournament = await tournamentsRepository.getTournamentById(tournamentMatch.tournamentId);

    if (!tournament) {
      throw new ApiError(404, "Tournament not found");
    }

    const descendants = collectDescendantMatchIds(tournament.matches, matchId);
    const replayResults = tournament.matches
      .filter(
        (match) =>
          match.status === "COMPLETED" &&
          match.id !== matchId &&
          !descendants.has(match.id)
      )
      .map<ReplayResult>((match) => ({
        key: getMatchKey(match),
        scoreA: match.scoreA,
        scoreB: match.scoreB
      }));

    replayResults.push({
      key: getMatchKey(tournamentMatch),
      scoreA: input.scoreA,
      scoreB: input.scoreB
    });

    await prisma.$transaction(async (transaction) => {
      await rebuildTournamentWithReplay(transaction, tournament.id, replayResults);
    });

    return tournamentsService.getTournament(tournament.id);
  }
};
