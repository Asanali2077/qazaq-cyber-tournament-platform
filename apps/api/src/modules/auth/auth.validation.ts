import { z } from "zod";

export const registerSchema = z.object({
  name: z.string().min(2).max(60),
  email: z.string().email(),
  password: z.string().min(6).max(100),
  role: z.enum(["PLAYER", "ORGANIZER"]).default("PLAYER")
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6)
});
