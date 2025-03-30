export const maxDuration = 30;

export async function POST(req: Request) {
  try {
    // Clone the request to read its body
    const clonedReq = req.clone();
    const { model: modelId }: { model: string } = await clonedReq.json();

    console.log("Router received request for model:", modelId);

    // Determine which provider to route to
    let routePath: string;

    if (modelId.startsWith("openai:")) {
      routePath = "/api/chat/openai";
    } else if (modelId.startsWith("google:")) {
      routePath = "/api/chat/google";
    } else {
      throw new Error(`Unsupported model provider for ID: ${modelId}`);
    }

    console.log(`Routing request to: ${routePath}`);

    // Create a new request to the appropriate route
    const url = new URL(routePath, req.url);
    const routeReq = new Request(url.toString(), {
      method: req.method,
      headers: req.headers,
      body: req.body,
    });

    // Forward the request to the appropriate route
    return fetch(routeReq);
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
