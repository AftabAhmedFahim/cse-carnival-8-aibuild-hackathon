// Milestone 2 verification — test the full agent loop from the terminal.
import { config } from "dotenv";
config(); // Load .env before anything else

import { runAgentLoop } from "../lib/agent/loop";

async function main() {
  console.log("=== MILESTONE 2 — Agent Loop Verification ===\n");
  console.log('Question: "When is my next class?"\n');

  const result = await runAgentLoop([
    { role: "user", content: "When is my next class?" },
  ]);

  console.log("--- Reply ---");
  console.log(result.reply);

  console.log("\n--- Step Trace ---");
  for (const step of result.steps) {
    console.log(`\n[${step.toolName}]`);
    console.log(`  Input:  ${step.input}`);
    const outputPreview =
      step.output.length > 300
        ? step.output.slice(0, 300) + "...(truncated)"
        : step.output;
    console.log(`  Output: ${outputPreview}`);
    console.log(`  Time:   ${step.createdAt}`);
  }

  console.log(`\nRun ID: ${result.runId}`);
  console.log(`Total steps: ${result.steps.length}`);
  console.log("\n=== Done ===");
}

main()
  .catch(console.error)
  .finally(() => process.exit(0));
