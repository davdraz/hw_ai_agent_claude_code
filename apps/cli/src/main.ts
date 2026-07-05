#!/usr/bin/env node
import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { Command } from "commander";
import { askAgent } from "@plantbase/core";

const program = new Command();

program
  .name("plantbase")
  .description("Plantbase - CLI AI agent a növény-katalógus felett")
  .version("0.1.0");

program
  .command("ask <question>")
  .description("Egyszeri természetes nyelvű kérdés a növény-katalógusról")
  .option("--show-prompt", "a teljes üzenet-tömb kiírása")
  .action(async (question: string, options: { showPrompt?: boolean }) => {
    await handleQuestion(question, Boolean(options.showPrompt));
  });

program.action(async () => {
  await runInteractive();
});

async function handleQuestion(question: string, showPrompt: boolean): Promise<void> {
  try {
    const result = await askAgent(question, { showPrompt });

    if (showPrompt && result.messages) {
      console.log("--- prompt ---");
      for (const message of result.messages) {
        console.log(`[${message.role}] ${message.content}`);
      }
      console.log("--------------");
    }

    console.log(result.answer);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Ismeretlen hiba történt.";
    console.error(`Hiba: ${message}`);
    process.exitCode = 1;
  }
}

async function runInteractive(): Promise<void> {
  const rl = readline.createInterface({ input, output });
  console.log('Plantbase interaktív mód. Írd be, hogy "exit", a kilépéshez.');

  try {
    for (;;) {
      const question = (await rl.question("> ")).trim();

      if (question.toLowerCase() === "exit") {
        break;
      }
      if (question.length === 0) {
        continue;
      }

      await handleQuestion(question, false);
    }
  } finally {
    rl.close();
  }
}

await program.parseAsync(process.argv);
