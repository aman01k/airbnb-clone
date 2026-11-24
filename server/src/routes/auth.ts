import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "../db.js";
import { conflict, unauthorized } from "../lib/http.js";
import { clearAuthCookie, setAuthCookie } from "../middleware/auth.js";
import { parse } from "../middleware/error.js";

export const authRouter = Router();

const publicUser = { id: true, name: true, email: true, avatarUrl: true, createdAt: true } as const;

const registerSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(60),
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters").max(100),
});

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
  password: z.string().min(1, "Enter your password"),
});

authRouter.post("/register", async (req, res) => {
  const { name, email, password } = parse(registerSchema, req.body);
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) throw conflict("An account with this email already exists. Try logging in.");

  const user = await prisma.user.create({
    data: { name, email, passwordHash: await bcrypt.hash(password, 10) },
    select: publicUser,
  });
  setAuthCookie(res, user.id);
  res.status(201).json({ user });
});

authRouter.post("/login", async (req, res) => {
  const { email, password } = parse(loginSchema, req.body);
  const user = await prisma.user.findUnique({ where: { email } });
  // Same message for unknown email and wrong password, so emails can't be probed.
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    throw unauthorized("Email or password is incorrect.");
  }
  setAuthCookie(res, user.id);
  res.json({ user: { id: user.id, name: user.name, email: user.email, avatarUrl: user.avatarUrl, createdAt: user.createdAt } });
});

authRouter.post("/logout", (_req, res) => {
  clearAuthCookie(res);
  res.status(204).end();
});

/** The signed-in user, or `{ user: null }` for visitors (not an error). */
authRouter.get("/me", async (req, res) => {
  if (!req.userId) return res.json({ user: null });
  const user = await prisma.user.findUnique({ where: { id: req.userId }, select: publicUser });
  if (!user) clearAuthCookie(res); // account no longer exists
  res.json({ user });
});
