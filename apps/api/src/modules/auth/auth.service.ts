import bcrypt from "bcryptjs";
import type { Role } from "../../types/domain";
import { ApiError } from "../../utils/api-error";
import { signToken } from "../../utils/jwt";
import { authRepository } from "./auth.repository";

const sanitizeUser = (user: {
  id: string;
  name: string;
  email: string;
  role: Role;
}) => ({
  id: user.id,
  name: user.name,
  email: user.email,
  role: user.role
});

export const authService = {
  async register(input: {
    name: string;
    email: string;
    password: string;
    role: Role;
  }) {
    const existing = await authRepository.findByEmail(input.email);

    if (existing) {
      throw new ApiError(409, "An account with this email already exists");
    }

    const passwordHash = await bcrypt.hash(input.password, 10);
    const user = await authRepository.createUser({
      name: input.name,
      email: input.email,
      passwordHash,
      role: input.role
    });

    const token = signToken(sanitizeUser(user));
    return { user: sanitizeUser(user), token };
  },

  async login(input: { email: string; password: string }) {
    const user = await authRepository.findByEmail(input.email);

    if (!user) {
      throw new ApiError(401, "Invalid email or password");
    }

    const isPasswordValid = await bcrypt.compare(input.password, user.passwordHash);

    if (!isPasswordValid) {
      throw new ApiError(401, "Invalid email or password");
    }

    const token = signToken(sanitizeUser(user));
    return { user: sanitizeUser(user), token };
  },

  async me(userId: string) {
    const user = await authRepository.findById(userId);

    if (!user) {
      throw new ApiError(404, "User not found");
    }

    return sanitizeUser(user);
  }
};
