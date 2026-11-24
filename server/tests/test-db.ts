import "dotenv/config";

/** Tests run against a separate database so they never touch your dev data. */
export function testDatabaseUrl(): string {
  if (process.env.TEST_DATABASE_URL) return process.env.TEST_DATABASE_URL;
  const dev = process.env.DATABASE_URL;
  if (!dev) throw new Error("Set DATABASE_URL or TEST_DATABASE_URL to run tests.");
  const url = new URL(dev);
  url.pathname = url.pathname.replace(/\/?([^/]*)$/, (_m, name) => `/${name.replace(/_dev$/, "")}_test`);
  return url.toString();
}
