import { Suspense } from "react";
import { notFound } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { getInitialChatData, getModels } from "@/app/dashboard/actions"; // Import getModels
import { loadChatMessages } from "@/app/dashboard/chatActions"; // For specific chat messages
import ClientDashboard from "@/app/dashboard/ClientDashboard"; // The main client wrapper
import { Message } from "ai"; // Import Message type

interface ChatPageProps {
  params: Promise<{ chatId: string }>;
}

export default async function ChatPage({ params }: ChatPageProps) {
  // Await the params object before destructuring
  const resolvedParams = await Promise.resolve(params);
  const chatId = resolvedParams.chatId; // chatId is now a string (UUID)

  // Validate if chatId looks like a UUID (basic check) - optional but recommended
  // A more robust check could use a regex or a library
  if (typeof chatId !== "string" || chatId.length < 32) {
    console.error(`Invalid chatId format: ${chatId}`);
    notFound();
  }
  // Removed the parseInt and isNaN check

  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    // Handle case where user is not logged in, maybe redirect to login
    console.error("User not authenticated for chat page:", userError);
    // For now, return an error message or redirect
    return (
      <div className="p-6 text-center text-red-500">
        User not authenticated. Please log in.
      </div>
    );
    // redirect('/login'); // Alternative
  }

  // Fetch sidebar data (folders and all chats)
  // This might be slightly inefficient if the user navigates between chats quickly,
  // consider caching or alternative state management if needed later.
  const initialSidebarData = await getInitialChatData();
  if (!initialSidebarData.ok) {
    console.error("Failed to load sidebar data:", initialSidebarData.error);
    // Render error or fallback UI
    return (
      <div className="p-6 text-center text-red-500">
        {initialSidebarData.error}
      </div>
    );
  }

  // Fetch messages for the current chat
  let initialMessages: Message[] = [];
  try {
    initialMessages = await loadChatMessages(chatId); // Use string chatId
  } catch (error) {
    console.error(`Failed to load messages for chat ${chatId}:`, error);
    // Decide how to handle: show error in chat? Allow chat to start empty?
    // For now, we'll let it proceed with empty messages.
  }

  // Fetch models
  const modelsData = await getModels();
  if (!modelsData.ok) {
    console.error("Failed to load models:", modelsData.error);
    // Handle error, maybe return an error page or use empty array
  }

  // Fetch the initial model ID for this specific chat
  let initialModelId = null;
  try {
    const { data: chatData, error: chatError } = await supabase
      .from("chats")
      .select("model_id")
      .eq("id", chatId) // Use string chatId
      .eq("user_id", user.id) // Ensure user owns the chat
      .single();

    if (chatError) {
      console.error(`Failed to fetch chat data for ${chatId}:`, chatError);
    } else {
      initialModelId = chatData?.model_id;
    }
  } catch (error) {
    console.error(`Error fetching model for chat ${chatId}:`, error);
  }

  // We need to pass chatId, initialMessages, availableModels, and initialModelId to ChatInterface,
  // which is rendered inside ClientDashboard.
  // We will modify ClientDashboard next to accept these props.

  return (
    // Using Suspense might be less critical here as data is fetched server-side,
    // but keep it if ClientDashboard or children use useSuspense
    <Suspense
      fallback={
        <div className="flex h-screen w-full items-center justify-center">
          Loading chat...
        </div>
      }
    >
      <ClientDashboard
        userName={user.email ?? "User"}
        initialFolders={initialSidebarData.folders}
        initialChats={initialSidebarData.chats}
        // Pass down chat-specific props and models
        currentChatId={chatId} // Pass string chatId
        initialMessages={initialMessages}
        availableModels={modelsData.ok ? modelsData.models : []}
        initialModelId={initialModelId}
        // Server actions are passed from the parent page component if needed,
        // but ClientDashboard doesn't seem to require them directly anymore.
      />
    </Suspense>
  );
}
