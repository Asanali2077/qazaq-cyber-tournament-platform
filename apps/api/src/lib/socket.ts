import type { Server as HttpServer } from "http";
import { Server } from "socket.io";
import { env } from "../config/env";

let io: Server | null = null;

type TournamentUpdateType =
  | "tournament_updated"
  | "match_result_updated"
  | "bracket_generated"
  | "participant_updated"
  | "tournament_reset";

export const initSocket = (server: HttpServer) => {
  io = new Server(server, {
    cors: {
      origin: `http://localhost:${env.WEB_PORT}`,
      credentials: true
    }
  });

  io.on("connection", (socket) => {
    socket.on("tournament:join", (tournamentId: string) => {
      socket.join(`tournament:${tournamentId}`);
    });

    socket.on("tournament:leave", (tournamentId: string) => {
      socket.leave(`tournament:${tournamentId}`);
    });
  });

  return io;
};

export const emitTournamentUpdate = (
  tournamentId: string,
  type: TournamentUpdateType = "tournament_updated"
) => {
  io?.to(`tournament:${tournamentId}`).emit("tournament:updated", {
    tournamentId,
    type
  });
};
