export const ROLES = ["ADMIN", "ORGANIZER", "PLAYER"] as const;
export type Role = (typeof ROLES)[number];

export const TOURNAMENT_FORMATS = [
  "SINGLE_ELIMINATION",
  "DOUBLE_ELIMINATION"
] as const;
export type TournamentFormat = (typeof TOURNAMENT_FORMATS)[number];

export type TournamentStatus = "REGISTRATION" | "READY" | "LIVE" | "FINISHED";
export type ParticipantStatus = "PENDING" | "APPROVED" | "REJECTED";
export type MatchStatus = "PENDING" | "READY" | "LIVE" | "COMPLETED";
export type BracketType = "WINNERS" | "LOSERS" | "GRAND_FINAL";
