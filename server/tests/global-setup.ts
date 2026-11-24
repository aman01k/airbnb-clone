import { execSync } from "node:child_process";
import { testDatabaseUrl } from "./test-db.js";

export default function setup() {
  execSync("npx prisma migrate deploy", {
    stdio: "ignore",
    env: { ...process.env, DATABASE_URL: testDatabaseUrl() },
  });
}
