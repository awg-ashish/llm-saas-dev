import { streamText } from "ai";
import { openai } from "@ai-sdk/openai";
import type { CoreMessage } from "ai";

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

export async function POST(req: Request) {
  try {
    const {
      messages,
      model: modelId,
    }: { messages: CoreMessage[]; model: string } = await req.json();

    // Extract model name from the ID (remove "openai:" prefix)
    const modelName = modelId.replace("openai:", "");

    // Request Data Logging
    console.log("OpenAI API Request:", {
      messages: messages.length,
      model: modelName,
    });

    if (!process.env.OPENAI_API_KEY) {
      throw new Error("Missing OPENAI_API_KEY environment variable");
    }

    // Create a result with the streamText function
    const result = await streamText({
      model: openai(modelName),
      messages,
      onError({ error }) {
        console.error("OpenAI Stream error:", error);
      },
    });

    console.log("OpenAI stream created, beginning response generation");

    // Log the complete response
    (async () => {
      try {
        let fullResponse = "";
        for await (const textPart of result.textStream) {
          fullResponse += textPart;
          console.log("OpenAI chunk:", textPart);
        }

        console.log("OpenAI complete response:", fullResponse);

        const text = await result.text;
        const finishReason = await result.finishReason;
        const usage = await result.usage;

        console.log("OpenAI response details:", {
          finishReason,
          usage,
          textLength: text.length,
        });
      } catch (error) {
        console.error("Error processing OpenAI response:", error);
      }
    })();

    console.log("Sending OpenAI stream response to client");
    return result.toDataStreamResponse();
  } catch (error: unknown) {
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
