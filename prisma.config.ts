import path from "node:path";
import { config as loadEnv } from "dotenv";
import { defineConfig } from "prisma/config";

loadEnv({ quiet: true });

export default defineConfig({
  schema: path.join("packages", "db", "prisma", "schema.prisma"),
  migrations: {
    seed: "tsx packages/db/prisma/seed.ts",
  },
});
