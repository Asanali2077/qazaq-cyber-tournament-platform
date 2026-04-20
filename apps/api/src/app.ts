import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import { env } from "./config/env";
import { errorHandler } from "./middlewares/error-handler";
import { apiRoutes } from "./routes";

export const createApp = () => {
  const app = express();

  app.use(
    cors({
      origin: `http://localhost:${env.WEB_PORT}`,
      credentials: true
    })
  );
  app.use(helmet());
  app.use(morgan("dev"));
  app.use(express.json());
  app.use(cookieParser());

  app.use("/api", apiRoutes);
  app.use(errorHandler);

  return app;
};
