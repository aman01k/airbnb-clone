import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { env, isProd } from "../env.js";
import { unauthorized } from "../lib/http.js";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      userId?: string;
    }
  }
}

export const AUTH_COOKIE = "nestly_token";
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export function setAuthCookie(res: Response, userId: string) {
  const token = jwt.sign({ sub: userId }, env.JWT_SECRET, { expiresIn: "7d" });
  res.cookie(AUTH_COOKIE, token, {
    httpOnly: true, // not readable from JavaScript, so XSS can't steal it
    sameSite: "lax",
    secure: isProd,
    maxAge: MAX_AGE_MS,
    path: "/",
  });
}

export function clearAuthCookie(res: Response) {
  res.clearCookie(AUTH_COOKIE, { path: "/" });
}

/** Reads the login cookie if present. Never rejects the request. */
export function readAuth(req: Request, _res: Response, next: NextFunction) {
  const token = req.cookies?.[AUTH_COOKIE];
  if (token) {
    try {
      const payload = jwt.verify(token, env.JWT_SECRET);
      if (typeof payload === "object" && typeof payload.sub === "string") req.userId = payload.sub;
    } catch {
      // Expired or tampered token: treat as logged out.
    }
  }
  next();
}

/** Rejects the request with 401 unless a valid login cookie was sent. */
export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  if (!req.userId) return next(unauthorized());
  next();
}

/** For handlers behind requireAuth. */
export function currentUserId(req: Request): string {
  if (!req.userId) throw unauthorized();
  return req.userId;
}
