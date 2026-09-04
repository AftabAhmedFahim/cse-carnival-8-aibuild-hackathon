// Tool-calling agent loop using Google GenAI SDK — model call → execute tool → append result → repeat.
// Max 6 iterations. Persists every step to AgentStep for the UI trace.
import { GoogleGenAI } from "@google/genai";
import type { Content, Part } from "@google/genai";
import { prisma } from "@/lib/db";
import { toolDeclarations, executeTool } from "./tools";
import { buildSystemPrompt } from "./prompt";

const MAX_ITERATIONS = 6;
const MODEL = "gemini-3.6-flash";

export interface AgentStepRecord {
  id: string;
  toolName: string;
  input: string;
  output: string;
  durationMs?: number;
  createdAt: Date;
}

export interface AgentResult {
  reply: string;
  steps: AgentStepRecord[];
  runId: string;
}

/** Call generateContent with exponential backoff on transient errors (503 / 429). */
async function generateContentWithRetry(
  ai: GoogleGenAI,
  params: Parameters<typeof ai.models.generateContent>[0],
  maxRetries = 3,
) {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await ai.models.generateContent(params);
    } catch (err: unknown) {
      const status = (err as { status?: number })?.status;
      if ((status === 503 || status === 429) && attempt < maxRetries - 1) {
        const delay = 1500 * (attempt + 1);
        await new Promise((r) => setTimeout(r, delay));
      } else {
        throw err;
      }
    }
  }
  throw new Error("Failed after retries");
}

/** Run the agent loop: takes a conversation history, returns the final reply + tool steps. */
export async function runAgentLoop(
  messages: { role: "user" | "assistant"; content: string }[],
): Promise<AgentResult> {
  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    throw new Error("GOOGLE_API_KEY is not set. Add it to your .env file.");
  }

  const ai = new GoogleGenAI({ apiKey });
  const runId = generateRunId();
  const steps: AgentStepRecord[] = [];

  // Build initial conversation contents for the Gemini API
  const contents: Content[] = [];
  for (const msg of messages) {
    contents.push({
      role: msg.role === "user" ? "user" : "model",
      parts: [{ text: msg.content }],
    });
  }

  for (let iteration = 0; iteration < MAX_ITERATIONS; iteration++) {
    // Call the model with tool declarations and system instruction
    const response = await generateContentWithRetry(ai, {
      model: MODEL,
      contents,
      config: {
        systemInstruction: buildSystemPrompt(),
        tools: [{ functionDeclarations: toolDeclarations }],
      },
    });

    const candidate = response.candidates?.[0];
    const functionCalls = response.functionCalls;
    const responseText = response.text;

    // If no function calls, the model provided its final answer
    if (!functionCalls || functionCalls.length === 0) {
      return {
        reply: responseText || "I apologize, but I wasn't able to generate a response.",
        steps,
        runId,
      };
    }

    // Preserve the exact model content (including thoughtSignature for Gemini 3)
    if (candidate?.content) {
      contents.push(candidate.content);
    }

    // Execute each function call and collect results
    const functionResponseParts: Part[] = [];

    for (const fc of functionCalls) {
      const toolInput = (fc.args || {}) as Record<string, unknown>;
      let toolOutput: unknown;
      let isError = false;

      const startTime = Date.now();
      try {
        toolOutput = await executeTool(fc.name!, toolInput);
      } catch (error) {
        isError = true;
        toolOutput = {
          error: error instanceof Error ? error.message : String(error),
        };
      }
      const durationMs = Date.now() - startTime;

      const outputStr = JSON.stringify(toolOutput, null, 2);
      const truncatedOutput =
        outputStr.length > 10000
          ? outputStr.slice(0, 10000) + "...(truncated)"
          : outputStr;

      // Persist the step to database
      const step = await prisma.agentStep.create({
        data: {
          runId,
          toolName: fc.name!,
          input: JSON.stringify(toolInput),
          output: truncatedOutput,
        },
      });

      steps.push({
        id: step.id,
        toolName: step.toolName,
        input: step.input,
        output: step.output,
        durationMs,
        createdAt: step.createdAt,
      });

      functionResponseParts.push({
        functionResponse: {
          name: fc.name!,
          response: isError ? { error: truncatedOutput } : { result: toolOutput },
          id: fc.id,
        },
      });
    }

    // Send function results back as a user turn
    contents.push({ role: "user", parts: functionResponseParts });
  }

  // If reached max iterations, ask for best answer without further tools
  try {
    contents.push({
      role: "user",
      parts: [
        {
          text: "You have reached the maximum number of tool calls. Please provide your best answer based on the information gathered so far. Do not call any more tools.",
        },
      ],
    });

    const finalResponse = await generateContentWithRetry(ai, {
      model: MODEL,
      contents,
      config: {
        systemInstruction: buildSystemPrompt(),
      },
    });

    return {
      reply:
        finalResponse.text ||
        "I reached the maximum number of steps (6) without completing the request. Please try a more specific question.",
      steps,
      runId,
    };
  } catch {
    return {
      reply:
        "I reached the maximum number of steps (6) without completing the request. Please try a more specific question.",
      steps,
      runId,
    };
  }
}

function generateRunId(): string {
  return `run_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}
