// POST /api/chat — runs the agent tool-calling loop and returns the reply + steps.
import { NextRequest, NextResponse } from "next/server";
import { runAgentLoop } from "@/lib/agent/loop";

interface ChatRequestBody {
  messages: { role: "user" | "assistant"; content: string }[];
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as ChatRequestBody;

    if (!body.messages || !Array.isArray(body.messages) || body.messages.length === 0) {
      return NextResponse.json(
        { error: "Request must include a non-empty 'messages' array." },
        { status: 400 },
      );
    }

    const result = await runAgentLoop(body.messages);

    return NextResponse.json({
      reply: result.reply,
      steps: result.steps,
      runId: result.runId,
    });
  } catch (error) {
    console.error("Agent error:", error);
    const message =
      error instanceof Error ? error.message : "An unexpected error occurred.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
