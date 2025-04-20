import { streamText, createDataStreamResponse } from "ai";
import { google } from "@ai-sdk/google";
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

    // Extract model name from the ID (remove "google:" prefix)
    const modelName = modelSlug.replace("google:", "");

    // Request Data Logging
    console.log("OpenAI API Request with extended info:", {
      messages: messages.length,
      model: modelName,
      chatId: chatIdStr,
    });

    if (!process.env.GOOGLE_API_KEY) {
      throw new Error("Missing GOOGLE_API_KEY environment variable");
    }

    // Use createDataStreamResponse to handle streaming data
    return createDataStreamResponse({
      execute: (dataStream) => {
        try {
          // Create a result with the streamText function
          const result = streamText({
            model: google(modelName),
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
          // Write an error message using writeData
          dataStream.writeData({
            error:
              streamError instanceof Error
                ? streamError.message
                : "Unknown stream error",
          });
        } finally {
          // No explicit close needed
          console.log("OpenAI execute function finished");
        }
      },
      // Optional: Add top-level onError for createDataStreamResponse itself
      onError(error: unknown): string {
        const message =
          error instanceof Error ? error.message : "Unknown error";
        console.error("createDataStreamResponse error:", message);
        return JSON.stringify({ error: `Stream creation failed: ${message}` });
      },
    });
  } catch (error: unknown) {
    // Handle errors before streaming starts
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
