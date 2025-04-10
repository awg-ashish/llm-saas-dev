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
    const { messages, id: chatIdStr } = await req.json();

    // Request Data Logging
    console.log("LM Studio API Request:", {
      messages: messages.length,
      chatId: chatIdStr,
    });

    // Ask LM Studio for a streaming text completion
    // Using the model identifier provided by the user
    const result = streamText({
      model: lmstudio("qwen2.5-coder-7b-instruct"), // Using the specified model ID
      messages,
      onError({ error }) {
        console.error("LM Studio Stream error:", error);
      },
      // Remove the onFinish callback - we'll handle persistence on the client
    });

    // Consume the stream to ensure it runs to completion even if client disconnects
    result.consumeStream();

    console.log("LM Studio stream created, beginning response generation");

    // Log the complete response
    (async () => {
      try {
        let fullResponse = "";
        for await (const textPart of result.textStream) {
          fullResponse += textPart;
        }

        console.log("LM Studio complete response length:", fullResponse.length);

        const text = await result.text;
        const finishReason = await result.finishReason;
        const usage = await result.usage;

        console.log("LM Studio response details:", {
          finishReason,
          usage,
          textLength: text.length,
        });
      } catch (error) {
        console.error("Error processing LM Studio response:", error);
      }
    })();

    // Convert the response into a friendly text-stream
    return result.toDataStreamResponse();
  } catch (error: string | unknown) {
    const message =
      error instanceof Error // true for real Error objects
        ? error.message
        : "An unknown error occurred processing your request.";

    console.error("Error in LM Studio route:", error);
    // Consider more specific error handling based on potential LM Studio errors
    return new NextResponse(
      JSON.stringify({
        error: message || "An error occurred processing your request.",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
