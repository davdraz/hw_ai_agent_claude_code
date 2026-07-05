import Anthropic from "@anthropic-ai/sdk";
import { loadConfig } from "./config.js";
import { InteractionLogger } from "./logger.js";
import { buildSystemPrompt } from "./system-prompt.js";
import { runSql, UnsafeSqlError } from "./tools/run-sql.js";
import type { AgentResult, ShowPromptMessage } from "./types.js";

const RUN_SQL_TOOL: Anthropic.Tool = {
  name: "run_sql",
  description:
    "Egyetlen, olvasó (SELECT) SQL lekérdezés lefuttatása a products táblán, és a találatok visszaadása.",
  input_schema: {
    type: "object",
    properties: {
      sql: {
        type: "string",
        description: "Egyetlen SELECT utasítás a products táblán.",
      },
    },
    required: ["sql"],
  },
};

const MAX_STEPS = 6;

export interface AskAgentOptions {
  showPrompt?: boolean;
}

export async function askAgent(
  question: string,
  options: AskAgentOptions = {},
): Promise<AgentResult> {
  const config = loadConfig();
  const client = new Anthropic({ apiKey: config.ANTHROPIC_API_KEY });
  const logger = new InteractionLogger();
  const systemPrompt = buildSystemPrompt();

  logger.log({ type: "system_prompt", systemPrompt });

  const messages: Anthropic.MessageParam[] = [
    { role: "user", content: `<question>${question}</question>` },
  ];
  logger.log({ type: "message", role: "user", content: messages[0]?.content });

  const executedSql: string[] = [];
  let inputTokens = 0;
  let outputTokens = 0;

  for (let step = 0; step < MAX_STEPS; step += 1) {
    const response = await client.messages.create({
      model: config.ANTHROPIC_MODEL,
      max_tokens: 1024,
      system: systemPrompt,
      tools: [RUN_SQL_TOOL],
      messages,
    });

    inputTokens += response.usage.input_tokens;
    outputTokens += response.usage.output_tokens;
    logger.log({ type: "usage", step, usage: response.usage });

    const assistantContent = response.content as unknown as Anthropic.ContentBlockParam[];
    messages.push({ role: "assistant", content: assistantContent });
    logger.log({ type: "message", role: "assistant", content: assistantContent });

    if (response.stop_reason !== "tool_use") {
      const answer = response.content
        .filter((block): block is Anthropic.TextBlock => block.type === "text")
        .map((block) => block.text)
        .join("\n")
        .trim();

      logger.log({ type: "answer", answer });

      return {
        answer,
        sql: executedSql,
        usage: { inputTokens, outputTokens },
        logPath: logger.path,
        messages: options.showPrompt ? buildShowPromptMessages(systemPrompt, messages) : undefined,
      };
    }

    const toolResults: Anthropic.ToolResultBlockParam[] = [];

    for (const block of response.content) {
      if (block.type !== "tool_use" || block.name !== "run_sql") {
        continue;
      }

      const input = block.input as { sql?: string };
      const sql = input.sql ?? "";
      logger.log({ type: "sql", sql });

      try {
        const result = await runSql(sql);
        executedSql.push(sql);
        logger.log({ type: "sql_result", sql, rowCount: result.rowCount });
        toolResults.push({
          type: "tool_result",
          tool_use_id: block.id,
          content: JSON.stringify(result.rows),
        });
      } catch (error: unknown) {
        const message =
          error instanceof UnsafeSqlError ? error.message : "Hiba a lekérdezés futtatásakor.";
        logger.log({ type: "error", sql, message });
        toolResults.push({
          type: "tool_result",
          tool_use_id: block.id,
          content: message,
          is_error: true,
        });
      }
    }

    messages.push({ role: "user", content: toolResults });
    logger.log({ type: "message", role: "user", content: toolResults });
  }

  throw new Error("Az agent nem jutott végleges válaszra a lépéskorláton belül.");
}

function buildShowPromptMessages(
  systemPrompt: string,
  messages: Anthropic.MessageParam[],
): ShowPromptMessage[] {
  return [
    { role: "system", content: systemPrompt },
    ...messages.map((message) => ({
      role: message.role,
      content:
        typeof message.content === "string" ? message.content : JSON.stringify(message.content),
    })),
  ];
}
