import { createServer } from "http";
import { env } from "./config/env";
import { createApp } from "./app";
import { prisma } from "./lib/prisma";
import { initSocket } from "./lib/socket";

const bootstrap = async () => {
  await prisma.$connect();

  const app = createApp();
  const server = createServer(app);
  initSocket(server);

  server.listen(env.API_PORT, () => {
    console.log(`API listening on http://localhost:${env.API_PORT}`);
  });
};

bootstrap().catch((error) => {
  console.error("Failed to start API", error);
  process.exit(1);
});
