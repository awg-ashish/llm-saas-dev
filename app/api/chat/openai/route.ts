import { streamText, createDataStreamResponse } from "ai";
import { openai } from "@ai-sdk/openai";
import type { CoreMessage } from "ai";

// Allow streaming responses up to 300 seconds
export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const {
      messages,
      model: modelSlug,
      modelId: modelId,
      id: chatIdStr,
    }: {
      messages: CoreMessage[];
      model: string;
      modelId: string; // Model ID for persistence
      id?: string; // Chat ID for persistence
    } = await req.json();

    // Extract model name from the ID (remove "openai:" prefix)
    const modelName = modelSlug.replace("openai:", "");

    // Request Data Logging
    console.log("OpenAI API Request with extended info:", {
      messages: messages.length,
      model: modelName,
      chatId: chatIdStr,
    });

    if (!process.env.OPENAI_API_KEY) {
      throw new Error("Missing OPENAI_API_KEY environment variable");
    }

    // Use createDataStreamResponse to handle streaming data
    return createDataStreamResponse({
      execute: (dataStream) => {
        try {
          // Create a result with the streamText function
          const result = streamText({
            model: openai(modelName),
            messages,
            onError({ error }) {
              console.error("OpenAI Stream error:", error);
              // Optionally write error info to dataStream if needed
            },
            onFinish() {
              // message annotation:
              dataStream.writeMessageAnnotation({
                // Write the model name and ID as message annotations
                modelName: modelName,
                modelId: modelId,
              });

              // call annotation:
              dataStream.writeData("call completed");
            },
          });

          console.log("OpenAI stream created, merging into data stream");

          // Merge the text stream into the data stream
          result.mergeIntoDataStream(dataStream);
        } catch (streamError) {
          console.error("Error during OpenAI stream execution:", streamError);
          // Write an error message using writeData (or writeMessageAnnotation if preferred)
          dataStream.writeData({
            // Using writeData for general errors
            error:
              streamError instanceof Error
                ? streamError.message
                : "Unknown stream error",
          });
        } finally {
          // No explicit close needed, mergeIntoDataStream handles it
          console.log("OpenAI execute function finished");
        }
      },
      // Optional: Add top-level onError for createDataStreamResponse itself
      onError(error: unknown): string {
        const message =
          error instanceof Error ? error.message : "Unknown error";
        console.error("createDataStreamResponse error:", message);
        // Return an error message string
        return JSON.stringify({ error: `Stream creation failed: ${message}` });
      }, // Removed extra comma causing syntax error
    });
  } catch (error: unknown) {
    // Handle errors before streaming starts (e.g., JSON parsing, env var check)
    const errorMessage =
      error instanceof Error
        ? error.message
        : "An error occurred processing your request.";
    console.error("Error in OpenAI chat route:", { message: errorMessage });

    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
