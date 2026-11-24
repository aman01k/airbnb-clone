import "dotenv/config";
import { z } from "zod";

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  JWT_SECRET: z.string().min(1, "JWT_SECRET is required"),
  PORT: z.coerce.number().int().positive().default(4000),
  // Comma-separated list of origins allowed to call the API from another domain.
  CORS_ORIGINS: z.string().optional(),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  console.error("Invalid environment variables:", parsed.error.flatten().fieldErrors);
  process.exit(1);
}

if (parsed.data.NODE_ENV === "production" && parsed.data.JWT_SECRET.length < 32) {
  console.error("JWT_SECRET must be at least 32 characters in production.");
  process.exit(1);
}

export const env = parsed.data;
export const isProd = env.NODE_ENV === "production";
