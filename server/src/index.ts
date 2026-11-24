import { createApp } from "./app.js";
import { prisma } from "./db.js";
import { env } from "./env.js";

const server = createApp().listen(env.PORT, () => {
  console.log(`Nestly API listening on http://localhost:${env.PORT}`);
});

async function shutdown() {
  server.close();
  await prisma.$disconnect();
  process.exit(0);
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
