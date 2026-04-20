export type Role = "ADMIN" | "ORGANIZER" | "PLAYER";
export type TournamentFormat = "SINGLE_ELIMINATION" | "DOUBLE_ELIMINATION";
export type TournamentStatus = "REGISTRATION" | "READY" | "LIVE" | "FINISHED";
export type ParticipantStatus = "PENDING" | "APPROVED" | "REJECTED";
export type MatchStatus = "PENDING" | "READY" | "LIVE" | "COMPLETED";
export type BracketType = "WINNERS" | "LOSERS" | "GRAND_FINAL";

export type User = {
  id: string;
  name: string;
  email: string;
  role: Role;
};

export type Team = {
  id: string;
  name: string;
  logoUrl?: string | null;
  inviteCode: string;
  captainId: string;
  captainName?: string;
  members: Array<{
    id: string;
    name: string;
    email?: string;
    isCaptain?: boolean;
  }>;
  participants?: Array<{
    id: string;
    tournamentId: string;
    tournamentName: string;
    status: ParticipantStatus;
  }>;
};

export type TournamentCard = {
  id: string;
  name: string;
  game: string;
  format: TournamentFormat;
  status: TournamentStatus;
  startDate: string;
  registrationClosesAt: string;
  organizer: {
    id: string;
    name: string;
  };
  participantCount: number;
  approvedTeams: number;
  completedMatches: number;
};

export type TournamentMatch = {
  id: string;
  round: number;
  slot: number;
  label?: string | null;
  bracketType: BracketType;
  status: MatchStatus;
  scoreA: number;
  scoreB: number;
  winnerId?: string | null;
  nextWinMatchId?: string | null;
  nextWinSlot?: number | null;
  nextLoseMatchId?: string | null;
  nextLoseSlot?: number | null;
  updatedAt: string;
  isAutoAdvanced?: boolean;
  teamA?: {
    id: string;
    name: string;
    logoUrl?: string | null;
  } | null;
  teamB?: {
    id: string;
    name: string;
    logoUrl?: string | null;
  } | null;
};

export type TournamentDetails = {
  id: string;
  name: string;
  game: string;
  format: TournamentFormat;
  status: TournamentStatus;
  startDate: string;
  registrationClosesAt: string;
  organizer: {
    id: string;
    name: string;
    email: string;
  };
  stats: {
    totalMatches: number;
    completedMatches: number;
    readyMatches: number;
    activeMatches: number;
    completionRate: number;
  };
  participants: Array<{
    id: string;
    status: ParticipantStatus;
    seed?: number | null;
    team: {
      id: string;
      name: string;
      logoUrl?: string | null;
      captainId: string;
      captainName: string;
      members: Array<{
        id: string;
        name: string;
      }>;
    };
  }>;
  leaderboard: Array<{
    teamId: string;
    teamName: string;
    wins: number;
    matchesPlayed: number;
  }>;
  mvp?: {
    teamId: string;
    teamName: string;
    wins: number;
    matchesPlayed: number;
  } | null;
  matches: TournamentMatch[];
};

export type DashboardData = {
  analytics: {
    totalTournaments: number;
    activeMatches: number;
    registeredTeams: number;
    completionRate: number;
  };
  activeTournaments: Array<{
    id: string;
    name: string;
    game: string;
    format: TournamentFormat;
    startDate: string;
    status: TournamentStatus;
    participantCount: number;
    completedMatches: number;
  }>;
  upcomingMatches: Array<{
    id: string;
    round: number;
    slot: number;
    tournamentName: string;
    teamA?: {
      id: string;
      name: string;
    } | null;
    teamB?: {
      id: string;
      name: string;
    } | null;
    status: MatchStatus;
  }>;
  leaderboard: Array<{
    teamId: string;
    teamName: string;
    wins: number;
    matchesPlayed: number;
  }>;
  mvp?: {
    teamId: string;
    teamName: string;
    wins: number;
    matchesPlayed: number;
  } | null;
};

export type AdminTournament = {
  id: string;
  name: string;
  game: string;
  format: TournamentFormat;
  status: TournamentStatus;
  startDate: string;
  registrationClosesAt: string;
  pendingParticipants: number;
  approvedParticipants: number;
  participants: Array<{
    id: string;
    status: ParticipantStatus;
    seed?: number | null;
    team: {
      id: string;
      name: string;
      logoUrl?: string | null;
    };
  }>;
  matches: Array<{
    id: string;
    round: number;
    slot: number;
    bracketType: BracketType;
    label?: string | null;
    status: MatchStatus;
    scoreA: number;
    scoreB: number;
    updatedAt: string;
    teamA?: {
      id: string;
      name: string;
    } | null;
    teamB?: {
      id: string;
      name: string;
    } | null;
  }>;
};
