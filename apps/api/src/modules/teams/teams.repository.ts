import { prisma } from "../../lib/prisma";

export const teamsRepository = {
  findTeamByName(name: string) {
    return prisma.team.findUnique({
      where: { name }
    });
  },

  findTeamByInviteCode(inviteCode: string) {
    return prisma.team.findUnique({
      where: { inviteCode },
      include: {
        captain: true,
        members: {
          include: {
            user: true
          }
        }
      }
    });
  },

  findMembershipsByUser(userId: string) {
    return prisma.teamMember.findMany({
      where: { userId },
      include: {
        team: {
          include: {
            captain: true,
            members: {
              include: {
                user: true
              }
            },
            participants: {
              include: {
                tournament: true
              }
            }
          }
        }
      }
    });
  },

  findMembership(teamId: string, userId: string) {
    return prisma.teamMember.findUnique({
      where: {
        teamId_userId: {
          teamId,
          userId
        }
      }
    });
  },

  async createTeam(data: {
    name: string;
    logoUrl?: string;
    captainId: string;
    inviteCode: string;
  }) {
    return prisma.team.create({
      data: {
        ...data,
        members: {
          create: {
            userId: data.captainId
          }
        }
      },
      include: {
        captain: true,
        members: {
          include: {
            user: true
          }
        }
      }
    });
  },

  addMember(teamId: string, userId: string) {
    return prisma.teamMember.create({
      data: {
        teamId,
        userId
      }
    });
  },

  inviteCodeExists(inviteCode: string) {
    return prisma.team.findUnique({
      where: { inviteCode },
      select: { id: true }
    });
  }
};
