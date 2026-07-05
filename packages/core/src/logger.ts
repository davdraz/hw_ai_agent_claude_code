import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.join(__dirname, "..", "..", "..");
const logsDir = path.join(projectRoot, "logs");

export interface LogEntry {
  type: "system_prompt" | "message" | "sql" | "sql_result" | "answer" | "usage" | "error";
  [key: string]: unknown;
}

export class InteractionLogger {
  private readonly filePath: string;

  constructor(startedAt: Date = new Date()) {
    fs.mkdirSync(logsDir, { recursive: true });
    const stamp = startedAt.toISOString().replace(/[:.]/g, "-");
    this.filePath = path.join(logsDir, `${stamp}.jsonl`);
  }

  log(entry: LogEntry): void {
    const line = JSON.stringify({ loggedAt: new Date().toISOString(), ...entry });
    fs.appendFileSync(this.filePath, `${line}\n`, "utf-8");
  }

  get path(): string {
    return this.filePath;
  }
}
