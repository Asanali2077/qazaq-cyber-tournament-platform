import { createBracketInDatabase } from "../../lib/brackets";
import { prisma } from "../../lib/prisma";
import type { Role, TournamentFormat } from "../../types/domain";
import { ApiError } from "../../utils/api-error";
import { tournamentsRepository } from "./tournaments.repository";

type LeaderboardEntry = {
  teamId: string;
  teamName: string;
  wins: number;
  matchesPlayed: number;
};

const mapTournamentCard = (
  tournament: Awaited<ReturnType<typeof tournamentsRepository.listTournaments>>[number]
) => ({
  id: tournament.id,
  name: tournament.name,
  game: tournament.game,
  format: tournament.format,
  status: tournament.status,
  startDate: tournament.startDate,
  registrationClosesAt: tournament.registrationClosesAt,
  organizer: {
    id: tournament.organizer.id,
    name: tournament.organizer.name
  },
  participantCount: tournament.participants.length,
  approvedTeams: tournament.participants.filter((participant) => participant.status === "APPROVED")
    .length,
  completedMatches: tournament.matches.filter((match) => match.status === "COMPLETED").length
});

const buildLeaderboardFromMatches = <
  T extends {
    teamAId: string | null;
    teamBId: string | null;
    winnerId: string | null;
    teamA: { id: string; name: string } | null;
    teamB: { id: string; name: string } | null;
    winner?: { id: string; name: string } | null;
  }
>(
  matches: T[]
): LeaderboardEntry[] => {
  const board = new Map<string, LeaderboardEntry>();

  const ensureTeam = (team: { id: string; name: string } | null) => {
    if (!team) {
      return;
    }

    if (!board.has(team.id)) {
      board.set(team.id, {
        teamId: team.id,
        teamName: team.name,
        wins: 0,
        matchesPlayed: 0
      });
    }
  };

  matches.forEach((match) => {
    ensureTeam(match.teamA);
    ensureTeam(match.teamB);

    if (match.teamA) {
      board.get(match.teamA.id)!.matchesPlayed += 1;
    }

    if (match.teamB) {
      board.get(match.teamB.id)!.matchesPlayed += 1;
    }

    if (match.winnerId) {
      const winner = match.winner ?? match.teamA ?? match.teamB;

      if (winner) {
        ensureTeam(winner);
        board.get(winner.id)!.wins += 1;
      }
    }
  });

  return [...board.values()].sort((left, right) => {
    if (right.wins !== left.wins) {
      return right.wins - left.wins;
    }

    if (left.matchesPlayed !== right.matchesPlayed) {
      return left.matchesPlayed - right.matchesPlayed;
    }

    return left.teamName.localeCompare(right.teamName);
  });
};

const mapTournamentDetails = (
  tournament: NonNullable<Awaited<ReturnType<typeof tournamentsRepository.getTournamentById>>>
) => {
  const leaderboard = buildLeaderboardFromMatches(
    tournament.matches.filter((match) => match.status === "COMPLETED")
  );
  const completedMatches = tournament.matches.filter((match) => match.status === "COMPLETED")
    .length;
  const readyMatches = tournament.matches.filter((match) => match.status === "READY").length;
  const activeMatches = tournament.matches.filter((match) => match.status === "LIVE").length;
  const completionRate = tournament.matches.length
    ? Math.round((completedMatches / tournament.matches.length) * 100)
    : 0;
  const mvp = leaderboard[0] ?? null;

  return {
    id: tournament.id,
    name: tournament.name,
    game: tournament.game,
    format: tournament.format,
    status: tournament.status,
    startDate: tournament.startDate,
    registrationClosesAt: tournament.registrationClosesAt,
    organizer: {
      id: tournament.organizer.id,
      name: tournament.organizer.name,
      email: tournament.organizer.email
    },
    stats: {
      totalMatches: tournament.matches.length,
      completedMatches,
      readyMatches,
      activeMatches,
      completionRate
    },
    participants: tournament.participants.map((participant) => ({
      id: participant.id,
      status: participant.status,
      seed: participant.seed,
      team: {
        id: participant.team.id,
        name: participant.team.name,
        logoUrl: participant.team.logoUrl,
        captainId: participant.team.captainId,
        captainName: participant.team.captain.name,
        members: participant.team.members.map((member) => ({
          id: member.user.id,
          name: member.user.name
        }))
      }
    })),
    leaderboard,
    mvp,
    matches: tournament.matches.map((match) => ({
      id: match.id,
      round: match.round,
      slot: match.slot,
      label: match.label,
      bracketType: match.bracketType,
      status: match.status,
      scoreA: match.scoreA,
      scoreB: match.scoreB,
      teamA: match.teamA,
      teamB: match.teamB,
      winnerId: match.winnerId,
      nextWinMatchId: match.nextWinMatchId,
      nextWinSlot: match.nextWinSlot,
      nextLoseMatchId: match.nextLoseMatchId,
      nextLoseSlot: match.nextLoseSlot,
      updatedAt: match.updatedAt,
      isAutoAdvanced:
        Boolean(match.winnerId) && Boolean(match.teamAId || match.teamBId) && !(match.teamAId && match.teamBId)
    }))
  };
};

export const tournamentsService = {
  async listTournaments() {
    const tournaments = await tournamentsRepository.listTournaments();
    return tournaments.map(mapTournamentCard);
  },

  async getTournament(id: string) {
    const tournament = await tournamentsRepository.getTournamentById(id);

    if (!tournament) {
      throw new ApiError(404, "Tournament not found");
    }

    return mapTournamentDetails(tournament);
  },

  async createTournament(
    user: { id: string; role: Role },
    input: {
      name: string;
      game: string;
      format: TournamentFormat;
      startDate: string;
      registrationClosesAt: string;
    }
  ) {
    if (!["ADMIN", "ORGANIZER"].includes(user.role)) {
      throw new ApiError(403, "Only organizers or admins can create tournaments");
    }

    const startDate = new Date(input.startDate);
    const registrationClosesAt = new Date(input.registrationClosesAt);

    if (registrationClosesAt >= startDate) {
      throw new ApiError(
        400,
        "Registration close date must be earlier than the tournament start date"
      );
    }

    const tournament = await tournamentsRepository.createTournament({
      name: input.name,
      game: input.game,
      format: input.format,
      startDate,
      registrationClosesAt,
      organizerId: user.id
    });

    return {
      id: tournament.id,
      name: tournament.name,
      game: tournament.game,
      format: tournament.format,
      status: tournament.status,
      startDate: tournament.startDate,
      registrationClosesAt: tournament.registrationClosesAt
    };
  },

  async registerTeamToTournament(userId: string, tournamentId: string, teamId: string) {
    const tournament = await tournamentsRepository.getTournamentById(tournamentId);

    if (!tournament) {
      throw new ApiError(404, "Tournament not found");
    }

    if (tournament.status !== "REGISTRATION") {
      throw new ApiError(400, "Registrations are closed for this tournament");
    }

    if (new Date(tournament.registrationClosesAt) < new Date()) {
      throw new ApiError(400, "Registration window has already closed");
    }

    const team = await tournamentsRepository.getTeam(teamId);

    if (!team) {
      throw new ApiError(404, "Team not found");
    }

    if (team.captainId !== userId) {
      throw new ApiError(403, "Only the team captain can register the team");
    }

    const existingParticipant =
      await tournamentsRepository.getParticipantByTournamentAndTeam(tournamentId, teamId);

    if (existingParticipant) {
      throw new ApiError(409, "Team is already registered for this tournament");
    }

    const participant = await tournamentsRepository.createParticipant({
      tournamentId,
      teamId
    });

    return {
      id: participant.id,
      status: participant.status,
      team: participant.team
    };
  },

  async buildLeaderboard(tournamentId?: string) {
    const matches = await tournamentsRepository.listCompletedMatches(tournamentId);
    return buildLeaderboardFromMatches(matches);
  },

  async getDashboard(user: { id: string; role: Role }) {
    const [
      activeTournaments,
      upcomingMatches,
      leaderboard,
      totalTournaments,
      registeredTeams,
      activeMatches,
      completedMatches,
      totalMatches
    ] = await Promise.all([
      tournamentsRepository.listActiveTournaments(),
      tournamentsRepository.listDashboardMatches(user.id, user.role),
      this.buildLeaderboard(),
      tournamentsRepository.countTournaments(),
      tournamentsRepository.countRegisteredTeams(),
      tournamentsRepository.countActiveMatches(),
      tournamentsRepository.countCompletedMatches(),
      tournamentsRepository.countAllMatches()
    ]);

    return {
      analytics: {
        totalTournaments,
        activeMatches,
        registeredTeams,
        completionRate: totalMatches ? Math.round((completedMatches / totalMatches) * 100) : 0
      },
      activeTournaments: activeTournaments.map((tournament) => ({
        id: tournament.id,
        name: tournament.name,
        game: tournament.game,
        format: tournament.format,
        startDate: tournament.startDate,
        status: tournament.status,
        participantCount: tournament.participants.length,
        completedMatches: tournament.matches.length
      })),
      upcomingMatches: upcomingMatches.map((match) => ({
        id: match.id,
        round: match.round,
        slot: match.slot,
        tournamentName: match.tournament.name,
        teamA: match.teamA,
        teamB: match.teamB,
        status: match.status
      })),
      leaderboard,
      mvp: leaderboard[0] ?? null
    };
  },

  async listManagedTournaments(user: { id: string; role: Role }) {
    const tournaments = await tournamentsRepository.listManagedTournaments(
      user.id,
      user.role
    );

    return tournaments.map((tournament) => ({
      id: tournament.id,
      name: tournament.name,
      game: tournament.game,
      format: tournament.format,
      status: tournament.status,
      startDate: tournament.startDate,
      registrationClosesAt: tournament.registrationClosesAt,
      pendingParticipants: tournament.participants.filter(
        (participant) => participant.status === "PENDING"
      ).length,
      approvedParticipants: tournament.participants.filter(
        (participant) => participant.status === "APPROVED"
      ).length,
      participants: tournament.participants.map((participant) => ({
        id: participant.id,
        status: participant.status,
        seed: participant.seed,
        team: participant.team
      })),
      matches: tournament.matches.map((match) => ({
        id: match.id,
        round: match.round,
        slot: match.slot,
        bracketType: match.bracketType,
        label: match.label,
        status: match.status,
        scoreA: match.scoreA,
        scoreB: match.scoreB,
        teamA: match.teamA,
        teamB: match.teamB,
        updatedAt: match.updatedAt
      }))
    }));
  },

  async approveParticipant(user: { id: string; role: Role }, participantId: string) {
    const participant = await tournamentsRepository.getParticipantById(participantId);

    if (!participant) {
      throw new ApiError(404, "Participant not found");
    }

    if (user.role !== "ADMIN" && participant.tournament.organizerId !== user.id) {
      throw new ApiError(403, "You cannot manage this tournament");
    }

    const approvedCount = await tournamentsRepository.countApprovedParticipants(
      participant.tournamentId
    );

    return tournamentsRepository.updateParticipantStatus(
      participantId,
      "APPROVED",
      approvedCount + 1
    );
  },

  async rejectParticipant(user: { id: string; role: Role }, participantId: string) {
    const participant = await tournamentsRepository.getParticipantById(participantId);

    if (!participant) {
      throw new ApiError(404, "Participant not found");
    }

    if (user.role !== "ADMIN" && participant.tournament.organizerId !== user.id) {
      throw new ApiError(403, "You cannot manage this tournament");
    }

    return tournamentsRepository.updateParticipantStatus(participantId, "REJECTED", null);
  },

  async generateBracket(user: { id: string; role: Role }, tournamentId: string) {
    const tournament = await tournamentsRepository.getTournamentById(tournamentId);

    if (!tournament) {
      throw new ApiError(404, "Tournament not found");
    }

    if (user.role !== "ADMIN" && tournament.organizerId !== user.id) {
      throw new ApiError(403, "You cannot manage this tournament");
    }

    if (new Date(tournament.registrationClosesAt) > new Date()) {
      throw new ApiError(400, "Registration must be closed before generating the bracket");
    }

    const existingMatches = await tournamentsRepository.countMatchesForTournament(tournamentId);

    if (existingMatches > 0) {
      throw new ApiError(409, "Bracket already exists for this tournament");
    }

    const approvedParticipants =
      await tournamentsRepository.listApprovedParticipantsForTournament(tournamentId);

    if (approvedParticipants.length < 2) {
      throw new ApiError(400, "At least two approved teams are required");
    }

    await createBracketInDatabase(prisma, tournamentId, tournament.format, approvedParticipants);
    await tournamentsRepository.updateTournamentStatus(tournamentId, "LIVE");
    return this.getTournament(tournamentId);
  }
};
