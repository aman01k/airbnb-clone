import type { NextFunction, Request, Response } from "express";
import { Prisma } from "@prisma/client";
import { ZodError, type ZodTypeAny, type z } from "zod";
import { HttpError, badRequest } from "../lib/http.js";

/** Validate input with a zod schema, turning failures into a 400 with field messages. */
export function parse<T extends ZodTypeAny>(schema: T, data: unknown): z.infer<T> {
  const result = schema.safeParse(data);
  if (!result.success) throw badRequest("Please check the highlighted fields.", fieldErrors(result.error));
  return result.data;
}

function fieldErrors(err: ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of err.issues) {
    const key = issue.path.join(".") || "_";
    out[key] ??= issue.message;
  }
  return out;
}

/** True when Postgres rejected a row because of the Booking_no_overlap constraint. */
export function isOverlapViolation(err: unknown): boolean {
  const text = err instanceof Error ? err.message : String(err);
  return text.includes("Booking_no_overlap") || text.includes("23P01");
}

export function notFoundRoute(_req: Request, res: Response) {
  res.status(404).json({ error: "Route not found." });
}

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof HttpError) {
    return res.status(err.status).json({ error: err.message, details: err.details });
  }
  if (isOverlapViolation(err)) {
    return res.status(409).json({ error: "Those dates were just booked by someone else. Please pick other dates." });
  }
  if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2025") {
    return res.status(404).json({ error: "Not found." });
  }
  if (err instanceof SyntaxError && "body" in err) {
    return res.status(400).json({ error: "Request body is not valid JSON." });
  }
  console.error(err);
  res.status(500).json({ error: "Something went wrong on our side. Please try again." });
}
