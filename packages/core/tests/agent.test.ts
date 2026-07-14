import { beforeEach, describe, expect, it, vi } from "vitest";
import { askAgent } from "../src/agent.js";
import { UnsafeSqlError } from "../src/tools/run-sql.js";

const { createMock, runSqlMock, listCategoriesMock, loggerLogMock } = vi.hoisted(() => ({
  createMock: vi.fn(),
  runSqlMock: vi.fn(),
  listCategoriesMock: vi.fn(),
  loggerLogMock: vi.fn(),
}));

vi.mock("@anthropic-ai/sdk", () => {
  class MockAnthropic {
    messages = { create: createMock };
  }
  return { default: MockAnthropic };
});

vi.mock("../src/config.js", () => ({
  loadConfig: () => ({
    ANTHROPIC_API_KEY: "test-key",
    ANTHROPIC_MODEL: "claude-test-model",
    DATABASE_URL_READONLY: "postgresql://test/test",
  }),
}));

vi.mock("../src/tools/run-sql.js", async () => {
  const actual =
    await vi.importActual<typeof import("../src/tools/run-sql.js")>("../src/tools/run-sql.js");
  return { ...actual, runSql: runSqlMock };
});

vi.mock("../src/tools/list-categories.js", () => ({
  listCategories: listCategoriesMock,
}));

vi.mock("../src/logger.js", () => {
  class MockInteractionLogger {
    log = loggerLogMock;
    path = "test-log-path.jsonl";
  }
  return { InteractionLogger: MockInteractionLogger };
});

const USAGE = { input_tokens: 10, output_tokens: 5 };

function textResponse(text: string) {
  return { stop_reason: "end_turn", content: [{ type: "text", text }], usage: USAGE };
}

function toolUseResponse(id: string, name: string, input: unknown) {
  return {
    stop_reason: "tool_use",
    content: [{ type: "tool_use", id, name, input }],
    usage: USAGE,
  };
}

beforeEach(() => {
  createMock.mockReset();
  runSqlMock.mockReset();
  listCategoriesMock.mockReset();
  loggerLogMock.mockReset();
});

describe("askAgent", () => {
  it("returns the answer directly when the model does not use a tool", async () => {
    createMock.mockResolvedValueOnce(textResponse("Kész válasz."));

    const result = await askAgent("Kérdés?");

    expect(result.answer).toBe("Kész válasz.");
    expect(result.sql).toEqual([]);
    expect(result.usage).toEqual({ inputTokens: 10, outputTokens: 5 });
    expect(createMock).toHaveBeenCalledTimes(1);
    expect(loggerLogMock).toHaveBeenCalledWith(expect.objectContaining({ type: "system_prompt" }));
    expect(loggerLogMock).toHaveBeenCalledWith(
      expect.objectContaining({ type: "answer", answer: "Kész válasz." }),
    );
  });

  it("runs run_sql, feeds the result back, and returns the final answer", async () => {
    createMock
      .mockResolvedValueOnce(toolUseResponse("t1", "run_sql", { sql: "SELECT 1" }))
      .mockResolvedValueOnce(textResponse("Itt az eredmény."));
    runSqlMock.mockResolvedValueOnce({ rows: [{ a: 1 }], rowCount: 1 });

    const result = await askAgent("Kérdés?");

    expect(runSqlMock).toHaveBeenCalledWith("SELECT 1");
    expect(listCategoriesMock).not.toHaveBeenCalled();
    expect(result.sql).toEqual(["SELECT 1"]);
    expect(result.answer).toBe("Itt az eredmény.");
    expect(createMock).toHaveBeenCalledTimes(2);
  });

  it("uses list_categories when the model calls that tool", async () => {
    createMock
      .mockResolvedValueOnce(toolUseResponse("t1", "list_categories", {}))
      .mockResolvedValueOnce(textResponse("Kategóriák felsorolva."));
    listCategoriesMock.mockResolvedValueOnce([{ category: "kaktusz", count: 3 }]);

    const result = await askAgent("Milyen kategóriák vannak?");

    expect(listCategoriesMock).toHaveBeenCalledTimes(1);
    expect(runSqlMock).not.toHaveBeenCalled();
    expect(result.answer).toBe("Kategóriák felsorolva.");
  });

  it("reports the UnsafeSqlError message back to the model as a tool error, not a generic one", async () => {
    createMock
      .mockResolvedValueOnce(toolUseResponse("t1", "run_sql", { sql: "DROP TABLE products" }))
      .mockResolvedValueOnce(textResponse("Nem tudom végrehajtani."));
    runSqlMock.mockRejectedValueOnce(new UnsafeSqlError("Tiltott kulcsszó a lekérdezésben: drop"));

    await askAgent("Kérdés?");

    expect(loggerLogMock).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "error",
        message: "Tiltott kulcsszó a lekérdezésben: drop",
      }),
    );
  });

  it("hides unexpected run_sql errors behind a generic message", async () => {
    createMock
      .mockResolvedValueOnce(toolUseResponse("t1", "run_sql", { sql: "SELECT 1" }))
      .mockResolvedValueOnce(textResponse("..."));
    runSqlMock.mockRejectedValueOnce(new Error("connection refused"));

    await askAgent("Kérdés?");

    expect(loggerLogMock).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "error",
        message: "Hiba a lekérdezés futtatásakor.",
      }),
    );
  });

  it("reports a generic error when list_categories fails", async () => {
    createMock
      .mockResolvedValueOnce(toolUseResponse("t1", "list_categories", {}))
      .mockResolvedValueOnce(textResponse("..."));
    listCategoriesMock.mockRejectedValueOnce(new Error("connection refused"));

    await askAgent("Milyen kategóriák vannak?");

    expect(loggerLogMock).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "error",
        message: "Hiba a kategóriák lekérdezésekor.",
      }),
    );
  });

  it("throws once the step limit is exhausted without a final answer", async () => {
    createMock.mockResolvedValue(toolUseResponse("t1", "run_sql", { sql: "SELECT 1" }));
    runSqlMock.mockResolvedValue({ rows: [], rowCount: 0 });

    await expect(askAgent("Kérdés?")).rejects.toThrow(
      "Az agent nem jutott végleges válaszra a lépéskorláton belül.",
    );
    expect(createMock).toHaveBeenCalledTimes(6);
  });

  it("includes the full message transcript when showPrompt is requested", async () => {
    createMock.mockResolvedValueOnce(textResponse("Válasz."));

    const result = await askAgent("Kérdés?", { showPrompt: true });

    expect(result.messages?.[0]).toMatchObject({ role: "system" });
    expect(result.messages?.some((message) => message.role === "user")).toBe(true);
  });

  it("omits the message transcript when showPrompt is not requested", async () => {
    createMock.mockResolvedValueOnce(textResponse("Válasz."));

    const result = await askAgent("Kérdés?");

    expect(result.messages).toBeUndefined();
  });
});
