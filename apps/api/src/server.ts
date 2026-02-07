import { json, urlencoded } from "body-parser";
import express, { type Express } from "express";
import morgan from "morgan";
import cors from "cors";
import eventsRouter from "./routes/events";
import giftsRouter from "./routes/gifts";
import wishlistsRouter from "./routes/wishlists";
import decipherRouter from "./routes/decipher";

export const createServer = (): Express => {
  const app = express();
  app
    .disable("x-powered-by")
    .use(morgan("dev"))
    .use(urlencoded({ extended: true, limit: "50mb" }))
    .use(json({ limit: "50mb" }))
    .use(cors())
    .get("/status", (_, res) => {
      return res.json({ ok: true });
    })
    // API routes
    .use("/api/events", eventsRouter)
    .use("/api/events", giftsRouter)
    .use("/api/events", wishlistsRouter)
    .use("/api/decipher", decipherRouter)
    // Legacy route
    .get("/message/:name", (req, res) => {
      return res.json({ message: `hello ${req.params.name}` });
    });

  return app;
};
