import { describe, expect, it } from "vitest";
import { buildSystemPrompt } from "../src/system-prompt.js";

describe("buildSystemPrompt", () => {
  it("should contain the required XML-style tags", () => {
    const prompt = buildSystemPrompt();

    expect(prompt).toContain("<role>");
    expect(prompt).toContain("<schema>");
    expect(prompt).toContain("<rules>");
    expect(prompt).toContain("<examples>");
  });

  it("should mention the products table and the SELECT-only rule", () => {
    const prompt = buildSystemPrompt();

    expect(prompt).toContain("products");
    expect(prompt.toUpperCase()).toContain("SELECT");
  });
});
