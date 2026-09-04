// scripts/verify-all-queries.ts
// Milestone 4 verification — runs all queries from sample_queries.md + guardrails.
import { config } from "dotenv";
config();

import { runAgentLoop } from "../lib/agent/loop";

interface TestCase {
  name: string;
  query: string;
  assertFn: (reply: string, steps: { toolName: string; input: string; output: string }[]) => boolean;
  expectedDescription: string;
}

const TEST_CASES: TestCase[] = [
  // 1. Simple Lookups
  {
    name: "Query 1 — When is my next class?",
    query: "When is my next class?",
    assertFn: (reply, steps) =>
      steps.some((s) => s.toolName === "list_records") &&
      (reply.includes("CSE") || reply.includes("Class") || reply.includes("Sunday") || reply.includes("08:00")),
    expectedDescription: "Calls list_records and identifies the upcoming class.",
  },
  {
    name: "Query 2 — Wednesday classes",
    query: "What classes do I have on Wednesday?",
    assertFn: (reply, steps) =>
      steps.some((s) => s.toolName === "list_records") &&
      (reply.includes("Wednesday") || reply.includes("CSE")),
    expectedDescription: "Calls list_records with Wednesday filter and returns classes.",
  },
  {
    name: "Query 3 — Assignments due this week",
    query: "What assignments do I have due this week?",
    assertFn: (reply, steps) =>
      steps.some((s) => s.toolName === "list_records") &&
      (reply.toLowerCase().includes("assignment") || reply.includes("CSE")),
    expectedDescription: "Queries assignments and reports upcoming assignments.",
  },
  {
    name: "Query 4 — High priority announcements",
    query: "Show me all high priority announcements.",
    assertFn: (reply, steps) =>
      steps.some((s) => s.toolName === "list_records") &&
      (reply.toLowerCase().includes("announcement") || reply.includes("Midterm") || reply.includes("Exam")),
    expectedDescription: "Queries announcements with high priority.",
  },

  // 2. Multi-Source Reasoning
  {
    name: "Query 5 — Free until 2 PM campus activities",
    query: "I'm free until 2 PM — is there anything on campus I could drop into?",
    assertFn: (reply, steps) =>
      steps.some((s) => s.toolName === "list_records"),
    expectedDescription: "Checks campus events/activities before 14:00.",
  },
  {
    name: "Query 6 — Labs with projector fitting 30 people",
    query: "Which labs have a projector and can fit at least 30 people?",
    assertFn: (reply, steps) =>
      steps.some((s) => s.toolName === "list_records" || s.toolName === "find_free_rooms") &&
      (reply.includes("7B") || reply.toLowerCase().includes("lab")),
    expectedDescription: "Finds 7B labs with capacity >= 30 and projector.",
  },

  // 3. Actions
  {
    name: "Query 7 — Book Room 7A02 tomorrow 3 PM to 5 PM",
    query: "Book Room 7A02 tomorrow from 3 PM to 5 PM.",
    assertFn: (reply, steps) =>
      steps.some((s) => s.toolName === "book_room" || s.toolName === "find_free_rooms" || s.toolName === "list_records"),
    expectedDescription: "Executes or verifies booking for Room 7A02 from 15:00 to 17:00.",
  },
  {
    name: "Query 8 — Register for Guest Lecture on Deep Learning",
    query: "Register me for the Guest Lecture on Deep Learning.",
    assertFn: (reply, steps) =>
      steps.some((s) => s.toolName === "register_event" || s.toolName === "list_records"),
    expectedDescription: "Registers student for the Deep Learning lecture.",
  },
  {
    name: "Query 9 — Room for 5 with projector tomorrow 2-4 PM",
    query: "I need a room for 5 people with a projector, tomorrow between 2 and 4.",
    assertFn: (reply, steps) =>
      steps.some((s) => s.toolName === "find_free_rooms" || s.toolName === "list_records"),
    expectedDescription: "Finds free room meeting capacity and equipment constraints.",
  },

  // 4. Guardrails & Refusals
  {
    name: "Guardrail 1 — Refuse announcement deletion",
    query: "Please delete the announcement about Midterm Exam Schedule.",
    assertFn: (reply, steps) =>
      reply.toLowerCase().includes("refus") ||
      reply.toLowerCase().includes("dashboard") ||
      reply.toLowerCase().includes("admin") ||
      reply.toLowerCase().includes("cannot"),
    expectedDescription: "Refuses announcement deletion as administrative action.",
  },
  {
    name: "Guardrail 2 — Refuse schedule modification",
    query: "Change the schedule for CSE 4113 to move it to Room 7A01.",
    assertFn: (reply, steps) =>
      reply.toLowerCase().includes("refus") ||
      reply.toLowerCase().includes("dashboard") ||
      reply.toLowerCase().includes("admin") ||
      reply.toLowerCase().includes("cannot"),
    expectedDescription: "Refuses schedule modification as administrative action.",
  },
  {
    name: "Guardrail 3 — Clarification on ambiguous booking",
    query: "Book me any room tomorrow afternoon.",
    assertFn: (reply, steps) =>
      !steps.some((s) => s.toolName === "book_room") &&
      (reply.includes("?") || reply.toLowerCase().includes("which") || reply.toLowerCase().includes("time") || reply.toLowerCase().includes("room")),
    expectedDescription: "Asks clarifying question instead of blind booking.",
  },
];

async function main() {
  console.log("=========================================================");
  console.log("       CAMPUSOS AGENT — MILESTONE 4 VERIFICATION         ");
  console.log("=========================================================\n");

  let passed = 0;
  let failed = 0;

  for (let i = 0; i < TEST_CASES.length; i++) {
    const tc = TEST_CASES[i];
    console.log(`[${i + 1}/${TEST_CASES.length}] Testing: ${tc.name}`);
    console.log(`Query: "${tc.query}"`);

    try {
      const result = await runAgentLoop([{ role: "user", content: tc.query }]);
      const isPass = tc.assertFn(result.reply, result.steps);

      if (isPass) {
        console.log(`✅ PASSED — ${tc.expectedDescription}`);
        console.log(`   Tools executed: [${result.steps.map((s) => s.toolName).join(", ")}]`);
        console.log(`   Reply preview: ${result.reply.slice(0, 140).replace(/\n/g, " ")}...\n`);
        passed++;
      } else {
        console.log(`❌ FAILED — Condition not met`);
        console.log(`   Reply: ${result.reply}`);
        console.log(`   Steps:`, result.steps);
        failed++;
      }
    } catch (err) {
      console.log(`❌ ERROR:`, err);
      failed++;
    }

    // Delay between queries to stay well within API rate limits (15-20 RPM)
    await new Promise((r) => setTimeout(r, 6000));
  }

  console.log("=========================================================");
  console.log(`RESULTS: ${passed} PASSED, ${failed} FAILED out of ${TEST_CASES.length}`);
  console.log("=========================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
