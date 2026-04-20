import { prisma } from "../../lib/prisma";
import type { Role } from "../../types/domain";

export const authRepository = {
  findByEmail(email: string) {
    return prisma.user.findUnique({
      where: { email }
    });
  },

  findById(id: string) {
    return prisma.user.findUnique({
      where: { id }
    });
  },

  createUser(data: {
    name: string;
    email: string;
    passwordHash: string;
    role: Role;
  }) {
    return prisma.user.create({
      data
    });
  }
};
