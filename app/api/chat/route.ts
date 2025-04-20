import { NextRequest, NextResponse } from "next/server";
import { Message } from "ai";

// Helper function to get the base URL (works in Vercel and locally)
function getBaseUrl() {
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  // Assume localhost for local development
  return "http://localhost:3000";
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    console.log(`[API/chat/route] Incoming request body Data and parts:`, {
      ...body,
    });
    const {
      model,
      messages,
      selectedModel,
      selectedModelId,
    }: {
      model: string;
      messages: Message[];
      selectedModel: string;
      selectedModelId: number | string;
    } = body;
    console.log(
      "[API/chat/route] Incoming body params:",
      model,
      selectedModel,
      selectedModelId
    );
    if (!model || !messages) {
      return NextResponse.json(
        { error: "Missing model or messages in request body" },
        { status: 400 }
      );
    }

    const provider = model.split(":")[0];
    let targetApiUrl: string;
    const baseUrl = getBaseUrl();

    switch (provider) {
      case "openai":
        targetApiUrl = `${baseUrl}/api/chat/openai`;
        break;
      case "google":
        targetApiUrl = `${baseUrl}/api/chat/google`;
        break;
      case "lmstudio":
        // Only allow lmstudio in development
        if (process.env.NODE_ENV === "development") {
          targetApiUrl = `${baseUrl}/api/chat/lmstudio`;
        } else {
          console.warn("LM Studio is only available in development mode.");
          // Fallback or return error? For now, fallback to openai
          targetApiUrl = `${baseUrl}/api/chat/openai`;
          // Or return an error:
          // return NextResponse.json({ error: "LM Studio is only available in development mode." }, { status: 400 });
        }
        break;
      default:
        console.warn(
          `Unknown provider prefix: ${provider}. Defaulting to OpenAI.`
        );
        targetApiUrl = `${baseUrl}/api/chat/openai`;
      // Or return an error:
      // return NextResponse.json({ error: `Unknown model provider: ${provider}` }, { status: 400 });
    }

    console.log(
      `Forwarding chat request for model ${model} to ${targetApiUrl}`
    );

    // Forward the request to the target API endpoint
    const response = await fetch(targetApiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // Forward any other necessary headers from the original request if needed
        // e.g., Authorization: req.headers.get('Authorization') || ''
      },
      body: JSON.stringify({ model, messages }), // Send the original body content
    });

    // Check if the downstream API call was successful
    if (!response.ok) {
      const errorBody = await response.text();
      console.error(
        `Error from downstream API (${targetApiUrl}): ${response.status} ${response.statusText}`,
        errorBody
      );
      return new NextResponse(errorBody, { status: response.status });
    }

    // Stream the response back to the client
    // Ensure the response body is correctly handled as a stream
    if (response.body) {
      // Create a new ReadableStream from the response body
      const stream = new ReadableStream({
        start(controller) {
          const reader = response.body!.getReader();
          function push() {
            reader
              .read()
              .then(({ done, value }) => {
                if (done) {
                  controller.close();
                  return;
                }
                controller.enqueue(value);
                push();
              })
              .catch((err) => {
                console.error("Stream reading error:", err);
                controller.error(err);
              });
          }
          push();
        },
      });

      // Return the stream response
      return new NextResponse(stream, {
        headers: {
          "Content-Type": "text/plain; charset=utf-8", // Adjust content type if needed, Vercel AI SDK expects text/plain
          "Transfer-Encoding": "chunked",
        },
      });
    } else {
      // Handle cases where there is no response body (should not happen for streaming)
      return new NextResponse("No response body from downstream API.", {
        status: 500,
      });
    }
  } catch (error) {
    console.error("Error in main chat API route:", error);
    let errorMessage = "Internal Server Error";
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

// Optional: Add runtime configuration if needed, e.g., for Vercel Edge Functions
// export const runtime = 'edge';
