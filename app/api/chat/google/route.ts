import { streamText, createDataStreamResponse } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import type { CoreMessage } from "ai";

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;
const google = createGoogleGenerativeAI({
  apiKey: process.env.GOOGLE_API_KEY,
});

export async function POST(req: Request) {
  try {
    const {
      messages,
      model: modelSlug,
      modelId, // Extract modelId from the request
      id: chatIdStr,
    }: {
      messages: CoreMessage[];
      model: string;
      modelId?: string | number; // Model ID for persistence
      id?: string; // Chat ID for persistence
    } = await req.json();

    // Extract model name from the ID (remove "google:" prefix)
    const modelName = modelSlug.replace("google:", "");

    // Request Data Logging
    console.log("Google API Request:", {
      messages: messages.length,
      model: modelName,
      chatId: chatIdStr,
      modelId,
    });

    if (!process.env.GOOGLE_API_KEY) {
      throw new Error("Missing GOOGLE_API_KEY environment variable");
    }

    // Use createDataStreamResponse to handle streaming data
    return createDataStreamResponse({
      async execute(dataStream) {
        try {
          // Create a result with the streamText function
          const result = await streamText({
            model: google(modelName),
            messages,
            onError({ error }) {
              console.error("Google Stream error:", error);
              // Optionally write error info to dataStream if needed
            },
            // Remove the onFinish callback - we'll handle persistence on the client
          });

          // Write the model name and ID as message annotations *before* merging
          // Cast to any to avoid TypeScript errors with JSONValue type
          dataStream.writeMessageAnnotation({
            modelName: modelName,
            modelId: modelId, // Include modelId from the parsed request
          } as any);

          console.log(
            "Wrote modelName and modelId annotations to Google data stream:",
            { modelName, modelId }
          );

          console.log("Google stream created, merging into data stream");

          // Merge the text stream into the data stream
          result.mergeIntoDataStream(dataStream);

          // Log final details after stream completion (optional)
        } catch (streamError) {
          console.error("Error during Google stream execution:", streamError);
          // Write an error message using writeData
          dataStream.writeData({
            error:
              streamError instanceof Error
                ? streamError.message
                : "Unknown stream error",
          });
        } finally {
          // No explicit close needed
          console.log("Google execute function finished");
        }
      },
      // Optional: Add top-level onError for createDataStreamResponse itself
      onError(error: unknown): string {
        const message =
          error instanceof Error ? error.message : "Unknown error";
        console.error("createDataStreamResponse error (Google):", message);
        return JSON.stringify({ error: `Stream creation failed: ${message}` });
      },
    });
  } catch (error: unknown) {
    // Handle errors before streaming starts
    const errorMessage =
      error instanceof Error
        ? error.message
        : "An error occurred processing your request.";
    console.error("Error in Google chat route:", { message: errorMessage });

    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
