import jwt from "jsonwebtoken";
import { env } from "../config/env";

type JwtPayload = {
  id: string;
  email: string;
  role: string;
  name: string;
};

export const signToken = (payload: JwtPayload) =>
  jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: "7d"
  });

export const verifyToken = (token: string) =>
  jwt.verify(token, env.JWT_SECRET) as JwtPayload;
