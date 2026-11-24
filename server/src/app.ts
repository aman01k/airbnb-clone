import express from "express";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { env } from "./env.js";
import { readAuth } from "./middleware/auth.js";
import { errorHandler, notFoundRoute } from "./middleware/error.js";
import { authRouter } from "./routes/auth.js";
import { bookingsRouter } from "./routes/bookings.js";
import { hostRouter } from "./routes/host.js";
import { listingsRouter } from "./routes/listings.js";

export function createApp() {
  const app = express();
  app.disable("x-powered-by");
  app.set("trust proxy", 1);

  app.use(
    helmet({
      // Listing photos are loaded from external image hosts.
      contentSecurityPolicy: {
        directives: { "img-src": ["'self'", "https:", "data:"] },
      },
    }),
  );

  // Only needed when the frontend is hosted on a different domain from the API.
  const origins = env.CORS_ORIGINS?.split(",").map((s) => s.trim()).filter(Boolean) ?? [];
  if (origins.length) {
    app.use((req, res, next) => {
      const origin = req.headers.origin;
      if (origin && origins.includes(origin)) {
        res.setHeader("Access-Control-Allow-Origin", origin);
        res.setHeader("Access-Control-Allow-Credentials", "true");
        res.setHeader("Access-Control-Allow-Headers", "Content-Type");
        res.setHeader("Access-Control-Allow-Methods", "GET,POST,PATCH,DELETE,OPTIONS");
        res.setHeader("Vary", "Origin");
      }
      if (req.method === "OPTIONS") return res.status(204).end();
      next();
    });
  }

  app.use(express.json({ limit: "100kb" }));
  app.use(cookieParser());
  app.use(readAuth);

  app.get("/api/health", (_req, res) => res.json({ ok: true }));
  app.use("/api/auth", authRouter);
  app.use("/api/listings", listingsRouter);
  app.use("/api/bookings", bookingsRouter);
  app.use("/api/host", hostRouter);
  app.use("/api", notFoundRoute);

  // In production the API also serves the built React app, so the whole
  // project deploys as one service on one domain.
  const clientDist = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../client/dist");
  if (fs.existsSync(clientDist)) {
    app.use(express.static(clientDist, { maxAge: "1h", index: false }));
    app.get(/^(?!\/api\/).*/, (_req, res) => res.sendFile(path.join(clientDist, "index.html")));
  }

  app.use(errorHandler);
  return app;
}
