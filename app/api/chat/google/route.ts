import { streamText } from "ai";
import { google } from "@ai-sdk/google";
import type { CoreMessage } from "ai";

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

export async function POST(req: Request) {
  try {
    const {
      messages,
      model: modelSlug,
      id: chatIdStr,
    }: {
      messages: CoreMessage[];
      model: string;
      id?: string; // Chat ID for persistence
    } = await req.json();

    // Extract model name from the ID (remove "google:" prefix)
    const modelName = modelSlug.replace("google:", "");

    // Request Data Logging
    console.log("Google API Request:", {
      messages: messages.length,
      model: modelName,
      chatId: chatIdStr,
    });

    if (!process.env.GOOGLE_API_KEY) {
      throw new Error("Missing GOOGLE_API_KEY environment variable");
    }

    // Create a result with the streamText function
    const result = await streamText({
      model: google(modelName),
      messages,
      onError({ error }) {
        console.error("Google Stream error:", error);
      },
      // Remove the onFinish callback - we'll handle persistence on the client
    });

    // Consume the stream to ensure it runs to completion even if client disconnects
    result.consumeStream();

    console.log("Google stream created, beginning response generation");

    // Log the complete response
    (async () => {
      try {
        let fullResponse = "";
        for await (const textPart of result.textStream) {
          fullResponse += textPart;
        }

        console.log("Google complete response length:", fullResponse.length);

        const text = await result.text;
        const finishReason = await result.finishReason;
        const usage = await result.usage;

        console.log("Google response details:", {
          finishReason,
          usage,
          textLength: text.length,
        });
      } catch (error) {
        console.error("Error processing Google response:", error);
      }
    })();

    console.log("Sending Google stream response to client");
    return result.toDataStreamResponse();
  } catch (error: unknown) {
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
