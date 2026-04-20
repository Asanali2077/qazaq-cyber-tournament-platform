import type { TournamentDetails, TournamentMatch } from "@/lib/types";

type TeamRef = NonNullable<TournamentMatch["teamA"]>;

const cloneTournament = (tournament: TournamentDetails) =>
  JSON.parse(JSON.stringify(tournament)) as TournamentDetails;

const buildLeaderboard = (matches: TournamentMatch[]) => {
  const leaderboard = new Map<
    string,
    { teamId: string; teamName: string; wins: number; matchesPlayed: number }
  >();

  const ensureTeam = (team: TeamRef | null | undefined) => {
    if (!team) {
      return;
    }

    if (!leaderboard.has(team.id)) {
      leaderboard.set(team.id, {
        teamId: team.id,
        teamName: team.name,
        wins: 0,
        matchesPlayed: 0
      });
    }
  };

  matches
    .filter((match) => match.status === "COMPLETED")
    .forEach((match) => {
      ensureTeam(match.teamA);
      ensureTeam(match.teamB);

      if (match.teamA) {
        leaderboard.get(match.teamA.id)!.matchesPlayed += 1;
      }

      if (match.teamB) {
        leaderboard.get(match.teamB.id)!.matchesPlayed += 1;
      }

      const winner = [match.teamA, match.teamB].find((team) => team?.id === match.winnerId);

      if (winner) {
        ensureTeam(winner);
        leaderboard.get(winner.id)!.wins += 1;
      }
    });

  return [...leaderboard.values()].sort((left, right) => {
    if (right.wins !== left.wins) {
      return right.wins - left.wins;
    }

    if (left.matchesPlayed !== right.matchesPlayed) {
      return left.matchesPlayed - right.matchesPlayed;
    }

    return left.teamName.localeCompare(right.teamName);
  });
};

const refreshDerivedState = (tournament: TournamentDetails) => {
  const leaderboard = buildLeaderboard(tournament.matches);
  const completedMatches = tournament.matches.filter((match) => match.status === "COMPLETED")
    .length;
  const readyMatches = tournament.matches.filter((match) => match.status === "READY").length;
  const activeMatches = tournament.matches.filter((match) => match.status === "LIVE").length;

  tournament.leaderboard = leaderboard;
  tournament.mvp = leaderboard[0] ?? null;
  tournament.stats = {
    totalMatches: tournament.matches.length,
    completedMatches,
    readyMatches,
    activeMatches,
    completionRate: tournament.matches.length
      ? Math.round((completedMatches / tournament.matches.length) * 100)
      : 0
  };

  if (completedMatches === tournament.matches.length && tournament.matches.length > 0) {
    tournament.status = "FINISHED";
  } else if (completedMatches > 0 || activeMatches > 0) {
    tournament.status = "LIVE";
  }
};

const syncMatchStatus = (match: TournamentMatch) => {
  if (match.winnerId) {
    match.status = "COMPLETED";
    return;
  }

  if (match.teamA && match.teamB) {
    match.status = "READY";
    return;
  }

  match.status = "PENDING";
};

const assignTeamToSlot = (
  matchesById: Map<string, TournamentMatch>,
  targetMatchId: string | null | undefined,
  slot: number | null | undefined,
  team: TeamRef | null,
  changedMatchIds: Set<string>
) => {
  if (!targetMatchId || !slot) {
    return;
  }

  const targetMatch = matchesById.get(targetMatchId);

  if (!targetMatch) {
    return;
  }

  if (slot === 1) {
    targetMatch.teamA = team;
  } else {
    targetMatch.teamB = team;
  }

  targetMatch.updatedAt = new Date().toISOString();
  targetMatch.winnerId = null;
  targetMatch.scoreA = 0;
  targetMatch.scoreB = 0;
  targetMatch.isAutoAdvanced = false;
  syncMatchStatus(targetMatch);
  changedMatchIds.add(targetMatch.id);
};

const propagateAutoAdvances = (
  matchesById: Map<string, TournamentMatch>,
  seedMatchIds: string[],
  changedMatchIds: Set<string>
) => {
  const queue = [...seedMatchIds];

  while (queue.length > 0) {
    const matchId = queue.shift()!;
    const match = matchesById.get(matchId);

    if (!match || match.winnerId) {
      continue;
    }

    const winner = match.teamA ?? match.teamB;

    if (!winner || (match.teamA && match.teamB)) {
      syncMatchStatus(match);
      continue;
    }

    match.winnerId = winner.id;
    match.status = "COMPLETED";
    match.isAutoAdvanced = true;
    match.updatedAt = new Date().toISOString();
    changedMatchIds.add(match.id);

    const loser =
      winner.id === match.teamA?.id ? match.teamB ?? null : match.teamA ?? null;

    assignTeamToSlot(
      matchesById,
      match.nextWinMatchId,
      match.nextWinSlot,
      winner,
      changedMatchIds
    );
    assignTeamToSlot(
      matchesById,
      match.nextLoseMatchId,
      match.nextLoseSlot,
      loser,
      changedMatchIds
    );

    if (match.nextWinMatchId) {
      queue.push(match.nextWinMatchId);
    }

    if (match.nextLoseMatchId) {
      queue.push(match.nextLoseMatchId);
    }
  }
};

export const applyDemoResult = (
  tournament: TournamentDetails,
  matchId: string,
  scoreA: number,
  scoreB: number
) => {
  const nextTournament = cloneTournament(tournament);
  const changedMatchIds = new Set<string>();
  const matchesById = new Map(nextTournament.matches.map((match) => [match.id, match]));
  const match = matchesById.get(matchId);

  if (!match || !match.teamA || !match.teamB || scoreA === scoreB) {
    return {
      tournament,
      changedMatchIds: []
    };
  }

  const winner = scoreA > scoreB ? match.teamA : match.teamB;
  const loser = scoreA > scoreB ? match.teamB : match.teamA;

  match.scoreA = scoreA;
  match.scoreB = scoreB;
  match.winnerId = winner.id;
  match.status = "COMPLETED";
  match.isAutoAdvanced = false;
  match.updatedAt = new Date().toISOString();
  changedMatchIds.add(match.id);

  assignTeamToSlot(matchesById, match.nextWinMatchId, match.nextWinSlot, winner, changedMatchIds);
  assignTeamToSlot(matchesById, match.nextLoseMatchId, match.nextLoseSlot, loser, changedMatchIds);
  propagateAutoAdvances(
    matchesById,
    [match.nextWinMatchId, match.nextLoseMatchId].filter(Boolean) as string[],
    changedMatchIds
  );
  refreshDerivedState(nextTournament);

  return {
    tournament: nextTournament,
    changedMatchIds: [...changedMatchIds]
  };
};

export const simulateTournamentTick = (tournament: TournamentDetails) => {
  const liveMatch = tournament.matches.find(
    (match) => match.status === "LIVE" && match.teamA && match.teamB
  );

  if (liveMatch) {
    const scoreA = liveMatch.scoreA;
    const scoreB = liveMatch.scoreB;
    const nextScoreA = Math.random() > 0.5 ? scoreA + 1 : scoreA;
    const nextScoreB = nextScoreA === scoreA ? scoreB + 1 : scoreB;
    const maxScore = Math.max(nextScoreA, nextScoreB);

    if (maxScore >= 2 && nextScoreA !== nextScoreB) {
      return {
        ...applyDemoResult(tournament, liveMatch.id, nextScoreA, nextScoreB),
        event: "match_result_updated" as const
      };
    }

    const nextTournament = cloneTournament(tournament);
    const target = nextTournament.matches.find((match) => match.id === liveMatch.id)!;
    target.scoreA = nextScoreA;
    target.scoreB = nextScoreB;
    target.updatedAt = new Date().toISOString();
    refreshDerivedState(nextTournament);

    return {
      tournament: nextTournament,
      changedMatchIds: [target.id],
      event: "score_tick" as const
    };
  }

  const readyMatch = tournament.matches.find(
    (match) => match.status === "READY" && match.teamA && match.teamB
  );

  if (!readyMatch) {
    return {
      tournament,
      changedMatchIds: [],
      event: null
    };
  }

  const nextTournament = cloneTournament(tournament);
  const target = nextTournament.matches.find((match) => match.id === readyMatch.id)!;
  target.status = "LIVE";
  target.updatedAt = new Date().toISOString();
  refreshDerivedState(nextTournament);

  return {
    tournament: nextTournament,
    changedMatchIds: [target.id],
    event: "match_live" as const
  };
};
