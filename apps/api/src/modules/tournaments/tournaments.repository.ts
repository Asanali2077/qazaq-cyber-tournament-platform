import { prisma } from "../../lib/prisma";
import type {
  ParticipantStatus,
  Role,
  TournamentStatus
} from "../../types/domain";

export const tournamentsRepository = {
  createTournament(data: {
    name: string;
    game: string;
    format: "SINGLE_ELIMINATION" | "DOUBLE_ELIMINATION";
    startDate: Date;
    registrationClosesAt: Date;
    organizerId: string;
  }) {
    return prisma.tournament.create({
      data,
      include: {
        organizer: true
      }
    });
  },

  listTournaments() {
    return prisma.tournament.findMany({
      orderBy: {
        startDate: "asc"
      },
      include: {
        organizer: true,
        participants: {
          include: {
            team: true
          }
        },
        matches: true
      }
    });
  },

  getTournamentById(id: string) {
    return prisma.tournament.findUnique({
      where: { id },
      include: {
        organizer: true,
        participants: {
          orderBy: [{ status: "asc" }, { seed: "asc" }, { createdAt: "asc" }],
          include: {
            team: {
              include: {
                captain: true,
                members: {
                  include: {
                    user: true
                  }
                }
              }
            }
          }
        },
        matches: {
          orderBy: [{ bracketType: "asc" }, { round: "asc" }, { slot: "asc" }],
          include: {
            teamA: true,
            teamB: true,
            winner: true
          }
        }
      }
    });
  },

  getTeam(teamId: string) {
    return prisma.team.findUnique({
      where: { id: teamId },
      include: {
        members: true
      }
    });
  },

  getParticipantByTournamentAndTeam(tournamentId: string, teamId: string) {
    return prisma.participant.findUnique({
      where: {
        tournamentId_teamId: {
          tournamentId,
          teamId
        }
      }
    });
  },

  createParticipant(data: { tournamentId: string; teamId: string }) {
    return prisma.participant.create({
      data,
      include: {
        team: true
      }
    });
  },

  listCompletedMatches(tournamentId?: string) {
    return prisma.match.findMany({
      where: {
        status: "COMPLETED",
        ...(tournamentId ? { tournamentId } : {})
      },
      orderBy: {
        updatedAt: "asc"
      },
      include: {
        teamA: true,
        teamB: true,
        winner: true,
        tournament: true
      }
    });
  },

  findTeamsByIds(ids: string[]) {
    return prisma.team.findMany({
      where: {
        id: {
          in: ids
        }
      }
    });
  },

  countTournaments() {
    return prisma.tournament.count();
  },

  countRegisteredTeams() {
    return prisma.participant.count();
  },

  countActiveMatches() {
    return prisma.match.count({
      where: {
        status: {
          in: ["READY", "LIVE"]
        }
      }
    });
  },

  countCompletedMatches() {
    return prisma.match.count({
      where: {
        status: "COMPLETED"
      }
    });
  },

  countAllMatches() {
    return prisma.match.count();
  },

  listDashboardMatches(userId: string, role: Role) {
    return prisma.match.findMany({
      where:
        role === "PLAYER"
          ? {
              status: {
                in: ["READY", "LIVE"]
              },
              OR: [
                {
                  teamA: {
                    members: {
                      some: {
                        userId
                      }
                    }
                  }
                },
                {
                  teamB: {
                    members: {
                      some: {
                        userId
                      }
                    }
                  }
                }
              ]
            }
          : {
              status: {
                in: ["READY", "LIVE"]
              }
            },
      include: {
        teamA: true,
        teamB: true,
        tournament: true
      },
      orderBy: [{ tournament: { startDate: "asc" } }, { round: "asc" }, { slot: "asc" }],
      take: 8
    });
  },

  listActiveTournaments() {
    return prisma.tournament.findMany({
      where: {
        status: {
          in: ["REGISTRATION", "READY", "LIVE"]
        }
      },
      include: {
        participants: true,
        matches: {
          where: {
            status: "COMPLETED"
          }
        }
      },
      orderBy: {
        startDate: "asc"
      },
      take: 6
    });
  },

  updateTournamentStatus(id: string, status: TournamentStatus) {
    return prisma.tournament.update({
      where: { id },
      data: { status }
    });
  },

  listManagedTournaments(userId: string, role: Role) {
    return prisma.tournament.findMany({
      where: role === "ADMIN" ? undefined : { organizerId: userId },
      orderBy: {
        createdAt: "desc"
      },
      include: {
        organizer: true,
        participants: {
          include: {
            team: true
          }
        },
        matches: {
          include: {
            teamA: true,
            teamB: true
          },
          orderBy: [{ bracketType: "asc" }, { round: "asc" }, { slot: "asc" }]
        }
      }
    });
  },

  getParticipantById(id: string) {
    return prisma.participant.findUnique({
      where: { id },
      include: {
        tournament: true,
        team: true
      }
    });
  },

  countApprovedParticipants(tournamentId: string) {
    return prisma.participant.count({
      where: {
        tournamentId,
        status: "APPROVED"
      }
    });
  },

  updateParticipantStatus(id: string, status: ParticipantStatus, seed?: number | null) {
    return prisma.participant.update({
      where: { id },
      data: {
        status,
        seed,
        approvedAt: status === "APPROVED" ? new Date() : null
      }
    });
  },

  listApprovedParticipantsForTournament(tournamentId: string) {
    return prisma.participant.findMany({
      where: {
        tournamentId,
        status: "APPROVED"
      },
      orderBy: [{ seed: "asc" }, { createdAt: "asc" }],
      include: {
        team: true
      }
    });
  },

  countMatchesForTournament(tournamentId: string) {
    return prisma.match.count({
      where: { tournamentId }
    });
  },

  listMatchesForTournament(tournamentId: string) {
    return prisma.match.findMany({
      where: { tournamentId },
      orderBy: [{ bracketType: "asc" }, { round: "asc" }, { slot: "asc" }],
      include: {
        teamA: true,
        teamB: true,
        winner: true
      }
    });
  },

  getMatchById(id: string) {
    return prisma.match.findUnique({
      where: { id },
      include: {
        tournament: true,
        teamA: true,
        teamB: true
      }
    });
  },

  deleteMatchesForTournament(tournamentId: string) {
    return prisma.match.deleteMany({
      where: { tournamentId }
    });
  },

  countRemainingMatches(tournamentId: string) {
    return prisma.match.count({
      where: {
        tournamentId,
        status: {
          not: "COMPLETED"
        }
      }
    });
  }
};
