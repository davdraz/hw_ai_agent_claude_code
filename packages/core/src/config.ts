import path from "node:path";
import { fileURLToPath } from "node:url";
import { config as loadEnv } from "dotenv";
import { z } from "zod";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.join(__dirname, "..", "..", "..");

loadEnv({ path: path.join(projectRoot, ".env"), quiet: true });

const EnvSchema = z.object({
  DATABASE_URL_READONLY: z
    .string()
    .min(1, "DATABASE_URL_READONLY hiányzik a .env-ből.")
    .refine(
      (value) => value.startsWith("postgresql://") || value.startsWith("postgres://"),
      "DATABASE_URL_READONLY egy postgresql:// kapcsolati string legyen.",
    ),
  ANTHROPIC_API_KEY: z.string().min(1, "ANTHROPIC_API_KEY hiányzik a .env-ből."),
  ANTHROPIC_MODEL: z.string().min(1).default("claude-sonnet-5"),
});

export type Config = z.infer<typeof EnvSchema>;

let cached: Config | undefined;

export function loadConfig(): Config {
  if (cached) {
    return cached;
  }

  const parsed = EnvSchema.safeParse(process.env);
  if (!parsed.success) {
    const details = parsed.error.issues
      .map((issue) => `- ${issue.path.join(".")}: ${issue.message}`)
      .join("\n");
    throw new Error(`Hiányzó vagy hibás környezeti változó(k):\n${details}`);
  }

  cached = parsed.data;
  return cached;
}
