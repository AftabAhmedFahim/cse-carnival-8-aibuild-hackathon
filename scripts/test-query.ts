// scripts/test-query.ts
import { config } from "dotenv";
config();
import { runAgentLoop } from "../lib/agent/loop";

async function main() {
  const query = process.argv[2] || "Which labs have a projector and can fit at least 30 people?";
  console.log(`Testing query: "${query}"`);
  const result = await runAgentLoop([{ role: "user", content: query }]);
  console.log("\n--- Reply ---");
  console.log(result.reply);
  console.log("\n--- Tools called ---");
  for (const step of result.steps) {
    console.log(`[${step.toolName}] in ${step.durationMs}ms`);
    console.log(`  Input: ${step.input}`);
    console.log(`  Output: ${step.output.slice(0, 150)}...`);
  }
}
main().catch(console.error);
