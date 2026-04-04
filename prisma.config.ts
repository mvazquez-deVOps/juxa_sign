import path from "node:path";
import { config as loadDotenv } from "dotenv";
import { defineConfig } from "prisma/config";

// Prisma 6 con `prisma.config.ts` no carga `.env` solo: sin esto, `prisma generate/migrate` fallan con P1012.
const root = process.cwd();
loadDotenv({ path: path.join(root, ".env") });
loadDotenv({ path: path.join(root, ".env.local"), override: true });

export default defineConfig({
  schema: path.join("prisma", "schema.prisma"),
  migrations: {
    seed: "node prisma/seed.mjs",
  },
});
