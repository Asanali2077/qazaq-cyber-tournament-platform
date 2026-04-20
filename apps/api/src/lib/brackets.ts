import { randomUUID } from "crypto";
import type { PrismaClient } from "@prisma/client";
import type { BracketType, MatchStatus, TournamentFormat } from "../types/domain";
import { ApiError } from "../utils/api-error";

type TeamSeed = {
  id: string;
  seed: number | null;
  team: {
    id: string;
  };
};

type MatchSeed = {
  id: string;
  tournamentId: string;
  round: number;
  slot: number;
  label?: string;
  bracketType: BracketType;
  teamAId: string | null;
  teamBId: string | null;
  scoreA: number;
  scoreB: number;
  winnerId: string | null;
  status: MatchStatus;
  nextWinMatchId: string | null;
  nextWinSlot: number | null;
  nextLoseMatchId: string | null;
  nextLoseSlot: number | null;
};

type BracketDb = {
  match: Pick<PrismaClient["match"], "createMany" | "findUnique" | "update">;
};

const nextPowerOfTwo = (value: number) => {
  let result = 1;

  while (result < value) {
    result *= 2;
  }

  return result;
};

const createMatch = (
  tournamentId: string,
  round: number,
  slot: number,
  bracketType: BracketType,
  label?: string
): MatchSeed => ({
  id: randomUUID(),
  tournamentId,
  round,
  slot,
  label,
  bracketType,
  teamAId: null,
  teamBId: null,
  scoreA: 0,
  scoreB: 0,
  winnerId: null,
  status: "PENDING",
  nextWinMatchId: null,
  nextWinSlot: null,
  nextLoseMatchId: null,
  nextLoseSlot: null
});

const syncStatus = (match: MatchSeed) => {
  if (match.winnerId) {
    match.status = "COMPLETED";
    return;
  }

  match.status = match.teamAId && match.teamBId ? "READY" : "PENDING";
};

const assignTeam = (match: MatchSeed, slot: number, teamId: string | null) => {
  if (slot === 1) {
    match.teamAId = teamId;
  } else {
    match.teamBId = teamId;
  }

  syncStatus(match);
};

const propagateByes = (matches: MatchSeed[]) => {
  let changed = true;

  while (changed) {
    changed = false;

    for (const match of matches) {
      if (match.winnerId || !match.nextWinMatchId) {
        continue;
      }

      if (match.teamAId && !match.teamBId) {
        match.winnerId = match.teamAId;
      } else if (!match.teamAId && match.teamBId) {
        match.winnerId = match.teamBId;
      }

      if (!match.winnerId) {
        syncStatus(match);
        continue;
      }

      match.status = "COMPLETED";
      const nextMatch = matches.find((entry) => entry.id === match.nextWinMatchId);

      if (nextMatch && match.nextWinSlot) {
        assignTeam(nextMatch, match.nextWinSlot, match.winnerId);
      }

      changed = true;
    }
  }

  matches.forEach(syncStatus);
};

export const createBracketSeeds = (
  tournamentId: string,
  format: TournamentFormat,
  approvedParticipants: TeamSeed[]
) => {
  const ordered = [...approvedParticipants].sort(
    (a, b) => (a.seed ?? Number.MAX_SAFE_INTEGER) - (b.seed ?? Number.MAX_SAFE_INTEGER)
  );

  if (ordered.length < 2) {
    throw new ApiError(400, "At least two approved teams are required");
  }

  if (format === "SINGLE_ELIMINATION") {
    return buildSingleEliminationSeeds(tournamentId, ordered);
  }

  return buildDoubleEliminationSeeds(tournamentId, ordered);
};

const buildSingleEliminationSeeds = (
  tournamentId: string,
  teams: TeamSeed[]
): MatchSeed[] => {
  const bracketSize = nextPowerOfTwo(teams.length);
  const rounds = Math.log2(bracketSize);
  const matches: MatchSeed[] = [];
  const roundsByMatches: MatchSeed[][] = [];

  for (let round = 1; round <= rounds; round += 1) {
    const matchCount = bracketSize / 2 ** round;
    const roundMatches = Array.from({ length: matchCount }, (_value, index) =>
      createMatch(
        tournamentId,
        round,
        index + 1,
        "WINNERS",
        round === rounds ? "Grand Final" : `Round ${round}`
      )
    );

    roundsByMatches.push(roundMatches);
    matches.push(...roundMatches);
  }

  roundsByMatches.forEach((roundMatches, roundIndex) => {
    const nextRound = roundsByMatches[roundIndex + 1];

    if (!nextRound) {
      return;
    }

    roundMatches.forEach((match, index) => {
      const target = nextRound[Math.floor(index / 2)];
      match.nextWinMatchId = target.id;
      match.nextWinSlot = index % 2 === 0 ? 1 : 2;
    });
  });

  roundsByMatches[0].forEach((match, index) => {
    assignTeam(match, 1, teams[index * 2]?.team.id ?? null);
    assignTeam(match, 2, teams[index * 2 + 1]?.team.id ?? null);
  });

  propagateByes(matches);
  return matches;
};

const buildDoubleEliminationSeeds = (
  tournamentId: string,
  teams: TeamSeed[]
): MatchSeed[] => {
  const size = nextPowerOfTwo(teams.length);

  if (size > 8) {
    throw new ApiError(
      400,
      "Basic double elimination currently supports up to 8 approved teams"
    );
  }

  if (size <= 4) {
    return buildFourTeamDoubleElimination(tournamentId, teams);
  }

  return buildEightTeamDoubleElimination(tournamentId, teams);
};

const buildFourTeamDoubleElimination = (
  tournamentId: string,
  teams: TeamSeed[]
): MatchSeed[] => {
  const w1 = createMatch(tournamentId, 1, 1, "WINNERS", "WB Round 1");
  const w2 = createMatch(tournamentId, 1, 2, "WINNERS", "WB Round 1");
  const w3 = createMatch(tournamentId, 2, 1, "WINNERS", "WB Final");
  const l1 = createMatch(tournamentId, 1, 1, "LOSERS", "LB Round 1");
  const l2 = createMatch(tournamentId, 2, 1, "LOSERS", "LB Final");
  const g1 = createMatch(tournamentId, 1, 1, "GRAND_FINAL", "Grand Final");

  w1.nextWinMatchId = w3.id;
  w1.nextWinSlot = 1;
  w1.nextLoseMatchId = l1.id;
  w1.nextLoseSlot = 1;

  w2.nextWinMatchId = w3.id;
  w2.nextWinSlot = 2;
  w2.nextLoseMatchId = l1.id;
  w2.nextLoseSlot = 2;

  l1.nextWinMatchId = l2.id;
  l1.nextWinSlot = 1;

  w3.nextWinMatchId = g1.id;
  w3.nextWinSlot = 1;
  w3.nextLoseMatchId = l2.id;
  w3.nextLoseSlot = 2;

  l2.nextWinMatchId = g1.id;
  l2.nextWinSlot = 2;

  assignTeam(w1, 1, teams[0]?.team.id ?? null);
  assignTeam(w1, 2, teams[1]?.team.id ?? null);
  assignTeam(w2, 1, teams[2]?.team.id ?? null);
  assignTeam(w2, 2, teams[3]?.team.id ?? null);

  const matches = [w1, w2, w3, l1, l2, g1];
  propagateByes(matches);
  return matches;
};

const buildEightTeamDoubleElimination = (
  tournamentId: string,
  teams: TeamSeed[]
): MatchSeed[] => {
  const w1 = createMatch(tournamentId, 1, 1, "WINNERS", "WB Round 1");
  const w2 = createMatch(tournamentId, 1, 2, "WINNERS", "WB Round 1");
  const w3 = createMatch(tournamentId, 1, 3, "WINNERS", "WB Round 1");
  const w4 = createMatch(tournamentId, 1, 4, "WINNERS", "WB Round 1");
  const w5 = createMatch(tournamentId, 2, 1, "WINNERS", "WB Semifinal");
  const w6 = createMatch(tournamentId, 2, 2, "WINNERS", "WB Semifinal");
  const w7 = createMatch(tournamentId, 3, 1, "WINNERS", "WB Final");
  const l1 = createMatch(tournamentId, 1, 1, "LOSERS", "LB Round 1");
  const l2 = createMatch(tournamentId, 1, 2, "LOSERS", "LB Round 1");
  const l3 = createMatch(tournamentId, 2, 1, "LOSERS", "LB Round 2");
  const l4 = createMatch(tournamentId, 2, 2, "LOSERS", "LB Round 2");
  const l5 = createMatch(tournamentId, 3, 1, "LOSERS", "LB Semifinal");
  const l6 = createMatch(tournamentId, 4, 1, "LOSERS", "LB Final");
  const g1 = createMatch(tournamentId, 1, 1, "GRAND_FINAL", "Grand Final");

  w1.nextWinMatchId = w5.id;
  w1.nextWinSlot = 1;
  w1.nextLoseMatchId = l1.id;
  w1.nextLoseSlot = 1;

  w2.nextWinMatchId = w5.id;
  w2.nextWinSlot = 2;
  w2.nextLoseMatchId = l1.id;
  w2.nextLoseSlot = 2;

  w3.nextWinMatchId = w6.id;
  w3.nextWinSlot = 1;
  w3.nextLoseMatchId = l2.id;
  w3.nextLoseSlot = 1;

  w4.nextWinMatchId = w6.id;
  w4.nextWinSlot = 2;
  w4.nextLoseMatchId = l2.id;
  w4.nextLoseSlot = 2;

  l1.nextWinMatchId = l3.id;
  l1.nextWinSlot = 1;
  l2.nextWinMatchId = l4.id;
  l2.nextWinSlot = 1;

  w5.nextWinMatchId = w7.id;
  w5.nextWinSlot = 1;
  w5.nextLoseMatchId = l3.id;
  w5.nextLoseSlot = 2;

  w6.nextWinMatchId = w7.id;
  w6.nextWinSlot = 2;
  w6.nextLoseMatchId = l4.id;
  w6.nextLoseSlot = 2;

  l3.nextWinMatchId = l5.id;
  l3.nextWinSlot = 1;
  l4.nextWinMatchId = l5.id;
  l4.nextWinSlot = 2;

  l5.nextWinMatchId = l6.id;
  l5.nextWinSlot = 1;

  w7.nextWinMatchId = g1.id;
  w7.nextWinSlot = 1;
  w7.nextLoseMatchId = l6.id;
  w7.nextLoseSlot = 2;

  l6.nextWinMatchId = g1.id;
  l6.nextWinSlot = 2;

  [w1, w2, w3, w4].forEach((match, index) => {
    assignTeam(match, 1, teams[index * 2]?.team.id ?? null);
    assignTeam(match, 2, teams[index * 2 + 1]?.team.id ?? null);
  });

  const matches = [w1, w2, w3, w4, w5, w6, w7, l1, l2, l3, l4, l5, l6, g1];
  propagateByes(matches);
  return matches;
};

export const createBracketInDatabase = async (
  prisma: BracketDb,
  tournamentId: string,
  format: TournamentFormat,
  approvedParticipants: TeamSeed[]
) => {
  const seeds = createBracketSeeds(tournamentId, format, approvedParticipants);

  await prisma.match.createMany({
    data: seeds
  });
};

export const advanceMatchTree = async (
  prisma: BracketDb,
  matchId: string,
  winnerId: string,
  loserId: string | null
) => {
  const match = await prisma.match.findUnique({
    where: { id: matchId }
  });

  if (!match) {
    throw new ApiError(404, "Match not found");
  }

  if (match.nextWinMatchId && match.nextWinSlot) {
    await setMatchSlot(prisma, match.nextWinMatchId, match.nextWinSlot, winnerId);
  }

  if (match.nextLoseMatchId && match.nextLoseSlot && loserId) {
    await setMatchSlot(prisma, match.nextLoseMatchId, match.nextLoseSlot, loserId);
  }
};

export const setMatchSlot = async (
  prisma: BracketDb,
  matchId: string,
  slot: number,
  teamId: string
) => {
  const match = await prisma.match.findUnique({
    where: { id: matchId }
  });

  if (!match) {
    throw new ApiError(404, "Progression target match was not found");
  }

  const nextMatch = await prisma.match.update({
    where: { id: matchId },
    data: slot === 1 ? { teamAId: teamId } : { teamBId: teamId }
  });

  if (
    (nextMatch.teamAId && nextMatch.teamBId) ||
    (!nextMatch.teamAId && !nextMatch.teamBId)
  ) {
    await prisma.match.update({
      where: { id: matchId },
      data: {
        status: nextMatch.teamAId && nextMatch.teamBId ? "READY" : "PENDING"
      }
    });
    return;
  }

  const autoWinner = nextMatch.teamAId ?? nextMatch.teamBId;

  if (!autoWinner) {
    return;
  }

  await prisma.match.update({
    where: { id: matchId },
    data: {
      winnerId: autoWinner,
      status: "COMPLETED"
    }
  });

  await advanceMatchTree(prisma, matchId, autoWinner, null);
};
