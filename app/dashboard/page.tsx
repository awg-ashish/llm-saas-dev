// dashboard/page.tsx
// import { redirect } from "next/navigation";
import ClientDashboard from "./ClientDashboard";
import {
  getInitialChatData,
  createFolder,
  createChat,
  moveChat,
  renameFolder,
  deleteFolder,
  renameChat,
  deleteChat,
  getModels, // Import getModels
} from "./actions";
import { createClient } from "@/utils/supabase/server";
import { Suspense } from "react";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user && process.env.NODE_ENV !== "development") {
    // A server component can return plain JSX
    return <p>Please Login</p>;
  }

  const initial = await getInitialChatData();
  if (!initial.ok) {
    return <div className="p-6 text-center text-red-500">{initial.error}</div>;
  }

  // Fetch models
  const modelsData = await getModels();
  if (!modelsData.ok) {
    // Handle error fetching models, maybe show a message or use an empty array
    console.error("Failed to load models:", modelsData.error);
  }

  return (
    <Suspense>
      <ClientDashboard
        userName={user?.email ?? "User"}
        initialFolders={initial.folders}
        initialChats={initial.chats}
        /* server actions */
        createFolder={createFolder}
        createChat={createChat}
        moveChat={moveChat}
        renameFolder={renameFolder}
        deleteFolder={deleteFolder}
        renameChat={renameChat}
        deleteChat={deleteChat}
        // Pass models down
        availableModels={modelsData.ok ? modelsData.models : []}
        // No initialModelId needed for the main dashboard page
      />
    </Suspense>
  );
}
