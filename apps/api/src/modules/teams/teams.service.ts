import { ApiError } from "../../utils/api-error";
import { teamsRepository } from "./teams.repository";

const mapTeam = (
  team: Awaited<ReturnType<typeof teamsRepository.createTeam>> | (Awaited<ReturnType<typeof teamsRepository.findMembershipsByUser>>)[number]["team"]
) => ({
  id: team.id,
  name: team.name,
  logoUrl: team.logoUrl,
  inviteCode: team.inviteCode,
  captainId: team.captainId,
  captainName: team.captain.name,
  members: team.members.map((member) => ({
    id: member.user.id,
    name: member.user.name,
    email: member.user.email,
    isCaptain: member.user.id === team.captainId
  })),
  participants: "participants" in team
    ? team.participants.map((participant) => ({
        id: participant.id,
        tournamentId: participant.tournamentId,
        tournamentName: participant.tournament.name,
        status: participant.status
      }))
    : []
});

const generateInviteCode = async () => {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const inviteCode = Math.random().toString(36).slice(2, 8).toUpperCase();
    const existing = await teamsRepository.inviteCodeExists(inviteCode);

    if (!existing) {
      return inviteCode;
    }
  }

  throw new ApiError(500, "Failed to generate a unique invite code");
};

export const teamsService = {
  async getMyTeams(userId: string) {
    const memberships = await teamsRepository.findMembershipsByUser(userId);
    return memberships.map((membership) => mapTeam(membership.team));
  },

  async createTeam(userId: string, input: { name: string; logoUrl?: string }) {
    const memberships = await teamsRepository.findMembershipsByUser(userId);

    if (memberships.length > 0) {
      throw new ApiError(400, "Leave your current team before creating a new one");
    }

    const existingTeam = await teamsRepository.findTeamByName(input.name);

    if (existingTeam) {
      throw new ApiError(409, "Team name is already taken");
    }

    const inviteCode = await generateInviteCode();
    const team = await teamsRepository.createTeam({
      name: input.name,
      logoUrl: input.logoUrl,
      captainId: userId,
      inviteCode
    });

    return mapTeam(team);
  },

  async joinTeam(userId: string, inviteCode: string) {
    const memberships = await teamsRepository.findMembershipsByUser(userId);

    if (memberships.length > 0) {
      throw new ApiError(400, "You are already a member of a team");
    }

    const team = await teamsRepository.findTeamByInviteCode(inviteCode);

    if (!team) {
      throw new ApiError(404, "Team not found for that invite code");
    }

    const existingMembership = await teamsRepository.findMembership(team.id, userId);

    if (existingMembership) {
      throw new ApiError(409, "You are already in this team");
    }

    await teamsRepository.addMember(team.id, userId);
    const updatedMemberships = await teamsRepository.findMembershipsByUser(userId);
    return mapTeam(updatedMemberships[0].team);
  }
};
