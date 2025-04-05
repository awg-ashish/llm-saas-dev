// app/api/chat/lmstudio/route.ts
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { streamText } from "ai";
import { NextRequest, NextResponse } from "next/server";

// IMPORTANT: Set the runtime to edge
export const runtime = "edge";

// Create an LM Studio provider instance
// Default URL; consider making this an environment variable (e.g., process.env.LMSTUDIO_BASE_URL)
const lmstudio = createOpenAICompatible({
  name: "lmstudio", // Added name property
  baseURL: process.env.LMSTUDIO_BASE_URL || "http://localhost:1234/v1",
  // No API key needed for LM Studio by default
});

// Define the POST handler
export async function POST(req: NextRequest) {
  // --- Development Environment Check ---
  if (process.env.NODE_ENV !== "development") {
    return new NextResponse(
      JSON.stringify({
        error: "LM Studio provider is only available in development mode.",
      }),
      { status: 403, headers: { "Content-Type": "application/json" } }
    );
  }
  // --- End Development Environment Check ---

  try {
    const { messages } = await req.json();

    // Ask LM Studio for a streaming text completion
    // Using the model identifier provided by the user
    const result = await streamText({
      model: lmstudio("deepseek-coder-v2-lite-instruct"), // Using the specified model ID
      messages,
      // Optional: Add maxRetries if needed
      // maxRetries: 1,
    });

    // Convert the response into a friendly text-stream
    return result.toDataStreamResponse(); // Changed to toDataStreamResponse
  } catch (error: any) {
    console.error("Error in LM Studio route:", error);
    // Consider more specific error handling based on potential LM Studio errors
    return new NextResponse(
      JSON.stringify({
        error: error.message || "An error occurred processing your request.",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
