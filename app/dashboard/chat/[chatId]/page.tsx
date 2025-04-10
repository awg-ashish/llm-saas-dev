import { Suspense } from "react";
import { notFound } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { getInitialChatData } from "@/app/dashboard/actions"; // For sidebar data
import { loadChatMessages } from "@/app/dashboard/chatActions"; // For specific chat messages
import ClientDashboard from "@/app/dashboard/ClientDashboard"; // The main client wrapper
import { Message } from "ai"; // Import Message type

interface ChatPageProps {
  params: Promise<{ chatId: string }>;
}

export default async function ChatPage({ params }: ChatPageProps) {
  // Await the params object before destructuring to fix the "params should be awaited" error
  const resolvedParams = await Promise.resolve(params);
  const chatId = resolvedParams.chatId;
  const chatIdNum = parseInt(chatId, 10);

  if (isNaN(chatIdNum)) {
    console.error(`Invalid chatId param: ${chatId}`);
    notFound(); // Or redirect to dashboard
  }

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
    initialMessages = await loadChatMessages(chatIdNum);
  } catch (error) {
    console.error(`Failed to load messages for chat ${chatIdNum}:`, error);
    // Decide how to handle: show error in chat? Allow chat to start empty?
    // For now, we'll let it proceed with empty messages.
  }

  // We need to pass chatId and initialMessages to ChatInterface,
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
        // Pass down chatId and initialMessages for ChatInterface
        currentChatId={chatIdNum}
        initialMessages={initialMessages}
        // No longer passing server functions to avoid the "Functions cannot be passed directly" error
      />
    </Suspense>
  );
}
