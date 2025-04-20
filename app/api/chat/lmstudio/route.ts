// app/api/chat/lmstudio/route.ts
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { streamText, createDataStreamResponse, type CoreMessage } from "ai";
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
    // Extract model and messages from the request body
    const {
      messages,
      model: modelSlug, // e.g., "lmstudio:qwen2.5-coder-7b-instruct"
      modelId, // Extract modelId from the request
      id: chatIdStr,
    }: {
      messages: CoreMessage[];
      model: string;
      modelId?: string | number; // Model ID for persistence
      id?: string; // Chat ID for persistence
    } = await req.json();

    // Extract the actual model name to pass to the provider
    const modelName = modelSlug.replace("lmstudio:", "");

    // Request Data Logging
    console.log("LM Studio API Request:", {
      model: modelName, // Log the extracted model name
      messages: messages.length,
      chatId: chatIdStr,
    });

    // Ask LM Studio for a streaming text completion
    // Use the dynamically extracted model name
    const result = await streamText({
      model: lmstudio(modelName), // Use the extracted model name
      messages,
      onError({ error }) {
        console.error("LM Studio Stream error:", error);
      },
      // Remove the onFinish callback - we'll handle persistence on the client
    });

    // Use createDataStreamResponse to handle streaming data
    return createDataStreamResponse({
      async execute(dataStream) {
        try {
          // Write the model name and ID as message annotations *before* merging
          // Cast to any to avoid TypeScript errors with JSONValue type
          dataStream.writeMessageAnnotation({
            modelName: modelName,
            modelId: modelId, // Include modelId from the parsed request
          } as any);
          console.log(
            "Wrote modelName and modelId annotations to LM Studio data stream:",
            { modelName, modelId }
          );

          console.log("LM Studio stream created, merging into data stream");

          // Merge the text stream into the data stream
          await result.mergeIntoDataStream(dataStream);

          // Log final details after stream completion (optional)
          const finalResult = await result;
          console.log("LM Studio response details:", {
            finishReason: finalResult.finishReason,
            usage: finalResult.usage,
          });
        } catch (streamError) {
          console.error(
            "Error during LM Studio stream execution:",
            streamError
          );
          // Write an error message using writeData
          dataStream.writeData({
            error:
              streamError instanceof Error
                ? streamError.message
                : "Unknown stream error",
          });
        } finally {
          // No explicit close needed
          console.log("LM Studio execute function finished");
        }
      },
      // Optional: Add top-level onError for createDataStreamResponse itself
      onError(error: unknown): string {
        const message =
          error instanceof Error ? error.message : "Unknown error";
        console.error("createDataStreamResponse error (LM Studio):", message);
        return JSON.stringify({ error: `Stream creation failed: ${message}` });
      },
    });
  } catch (error: string | unknown) {
    // Handle errors before streaming starts
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
