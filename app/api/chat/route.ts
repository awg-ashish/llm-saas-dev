export const maxDuration = 30;

// Import the POST handlers from provider routes
import { POST as openaiPOST } from "./openai/route";
import { POST as googlePOST } from "./google/route";

export async function POST(req: Request) {
  try {
    // Clone the request to read its body
    const clonedReq = req.clone();
    const { model: modelId }: { model: string } = await clonedReq.json();

    console.log("Router received request for model:", modelId);

    // Determine which provider to route to and call the appropriate handler
    if (modelId.startsWith("openai:")) {
      console.log("Routing to OpenAI handler");
      return openaiPOST(req);
    } else if (modelId.startsWith("google:")) {
      console.log("Routing to Google handler");
      return googlePOST(req);
    } else {
      throw new Error(`Unsupported model provider for ID: ${modelId}`);
    }
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error
        ? error.message
        : "An error occurred processing your request.";
    console.error("Error in chat router:", { message: errorMessage });

    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
