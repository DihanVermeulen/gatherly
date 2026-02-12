import express, { type Express } from "express";
import morgan from "morgan";
import cors from "cors";
import cookieParser from "cookie-parser";
import authRouter from "./routes/auth";
import eventsRouter from "./routes/events";
import giftsRouter from "./routes/gifts";
import wishlistsRouter from "./routes/wishlists";
import decipherRouter from "./routes/decipher";
import invitesRouter from "./routes/invites";

export const createServer = (): Express => {
  const app = express();
  app
    .disable("x-powered-by")
    .use(morgan("dev"))
    .use(express.urlencoded({ extended: true, limit: "50mb" }))
    .use(express.json({ limit: "50mb" }))
    .use(cookieParser())
    .use(
      cors({
        origin: process.env.CORS_ORIGIN || "http://localhost:3000",
        credentials: true,
      }),
    )
    .get("/status", (_, res) => {
      return res.json({ ok: true });
    })
    // API routes
    .use("/api/auth", authRouter)
    .use("/api", invitesRouter)
    .use("/api/events", eventsRouter)
    .use("/api/events", giftsRouter)
    .use("/api/events", wishlistsRouter)
    .use("/api/decipher", decipherRouter)
    // Legacy route
    .get("/message/:name", (req, res) => {
      return res.json({ message: `hello ${req.params.name}` });
    })
    // 404 handler
    .use((req, res) => {
      res.status(404).json({ error: "Not Found" });
    })
    // Global error handler
    .use(
      (
        err: any,
        req: express.Request,
        res: express.Response,
        next: express.NextFunction,
      ) => {
        console.error("API Error:", err);
        const status = err.status || err.statusCode || 500;
        res.status(status).json({
          error: err.message || "Internal Server Error",
          ...(process.env.NODE_ENV !== "production" && { stack: err.stack }),
        });
      },
    );

  return app;
};
