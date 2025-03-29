import { streamText } from 'ai';
import { openai } from '@ai-sdk/openai';
import { google } from '@ai-sdk/google';
import type { CoreMessage } from 'ai';

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

export async function POST(req: Request) {
  try {
    const { messages, model: modelId }: { messages: CoreMessage[]; model: string } = await req.json();

    let provider;
    let modelName: string;

    // Select provider and model based on the ID from the frontend
    if (modelId.startsWith('openai:')) {
      provider = openai;
      modelName = modelId.replace('openai:', ''); // e.g., 'gpt-4o'
      if (!process.env.OPENAI_API_KEY) {
        throw new Error('Missing OPENAI_API_KEY environment variable');
      }
    } else if (modelId.startsWith('google:')) {
      provider = google;
      modelName = modelId.replace('google:', ''); // e.g., 'gemini-pro'
      if (!process.env.GOOGLE_API_KEY) {
        throw new Error('Missing GOOGLE_API_KEY environment variable');
      }
      // Note: The Google provider might require specific model names like 'gemini-1.5-pro-latest'
      // Adjust modelName mapping if needed based on @ai-sdk/google documentation.
      // For now, assuming 'gemini-pro' works directly.
    } else {
      throw new Error(`Unsupported model provider for ID: ${modelId}`);
    }

    const result = await streamText({
      // @ts-ignore TODO: Fix type incompatibility if necessary
      model: provider(modelName),
      messages,
      // Optional: Add system prompt, temperature, etc.
      // system: 'You are a helpful assistant.',
    });

    // Respond with the stream
    return result.toDataStreamResponse(); // Corrected method name

  } catch (error: any) {
    console.error("Error in chat API route:", error);
    return new Response(
      JSON.stringify({ error: error.message || 'An error occurred processing your request.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
