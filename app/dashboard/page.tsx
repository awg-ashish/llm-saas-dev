// dashboard/page.tsx
import { redirect } from "next/navigation";
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
} from "./actions";
import { createClient } from "@/utils/supabase/client";
import { Suspense } from "react";

export default async function DashboardPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user && process.env.NODE_ENV !== "development") {
    // A server component can return plain JSX
    <p>Please Login</p>;
  }

  const initial = await getInitialChatData();
  if (!initial.ok) {
    return <div className="p-6 text-center text-red-500">{initial.error}</div>;
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
      />
    </Suspense>
  );
}
