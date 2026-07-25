/**
 * Assembles the Express app: global middleware, routes, and error handling.
 * Deliberately does NOT call app.listen() - that lives in server.ts. Keeping
 * them separate lets Supertest import `app` directly in tests without
 * opening a real network port.
 */
import cors from "cors";
import express, { Request, Response } from "express";
import helmet from "helmet";
import morgan from "morgan";
import { env } from "./config/env";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler";
import { apiLimiter } from "./middleware/rateLimiter";
import authRoutes from "./routes/auth.routes";
import leadRoutes from "./routes/lead.routes";
import noteRoutes from "./routes/note.routes";
import userRoutes from "./routes/user.routes";

export const app = express();

// Behind a reverse proxy (Render, Nginx) the client IP is in X-Forwarded-For;
// this lets express-rate-limit key on the real IP instead of the proxy's.
app.set("trust proxy", 1);

app.use(helmet());
app.use(cors({ origin: env.CLIENT_ORIGIN, credentials: true }));
// Cap request body size - a blunt guard against oversized-payload abuse.
app.use(express.json({ limit: "100kb" }));
app.use(morgan(env.NODE_ENV === "development" ? "dev" : "combined"));

// Broad ceiling on all API traffic (per-endpoint tighter limits are applied
// on the auth/public routes themselves).
app.use("/api/v1", apiLimiter);

app.get("/api/v1/health", (_req: Request, res: Response) => {
  res.json({ success: true, data: { status: "ok" } });
});

app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/leads", leadRoutes);
app.use("/api/v1/notes", noteRoutes);
app.use("/api/v1/users", userRoutes);

app.use(notFoundHandler);
app.use(errorHandler);
