// dashboard/ClientDashboard.tsx
"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { ChatInterface } from "@/components/chat-interface";
import { isDevMode, getDevAuthMethod, AUTH_METHOD } from "@/utils/dev-auth";
import { SidebarProvider, useSidebar } from "@/components/ui/sidebar";
import { PanelLeftOpen, PanelLeftClose } from "lucide-react";
import { AppSidebar } from "@/components/app-sidebar";
import { Folder, Chat } from "@/utils/types/chatTypes";
import {
  createFolder,
  createChat,
  moveChat,
  renameFolder,
  deleteFolder,
  renameChat,
  deleteChat,
} from "./actions";

export interface ClientDashboardProps {
  userName: string;
  initialFolders: Folder[];
  initialChats: Chat[];

  createFolder: (name: string) => Promise<Folder | { error: string }>;
  createChat: (
    title: string,
    folderId?: number | null
  ) => Promise<Chat | { error: string }>;

  moveChat: (
    chatId: number,
    folderId: number | null
  ) => Promise<{ success: boolean; error?: string }>;
  renameFolder: (
    folderId: number,
    newName: string
  ) => Promise<{ success: boolean; error?: string }>;
  deleteFolder: (
    folderId: number
  ) => Promise<{ success: boolean; error?: string }>;
  renameChat: (
    chatId: number,
    newName: string
  ) => Promise<{ success: boolean; error?: string }>;
  deleteChat: (chatId: number) => Promise<{ success: boolean; error?: string }>;
}

function DashboardContent({
  userName,
  initialFolders,
  initialChats,
  createFolder,
  createChat,
  moveChat,
  renameFolder,
  deleteFolder,
  renameChat,
  deleteChat,
}: ClientDashboardProps) {
  const router = useRouter();
  const supabase = createClient();

  // Sign-out handler
  const handleSignOut = async () => {
    console.log("[ClientDashboard] SignOut", getDevAuthMethod());
    if (isDevMode()) {
      const authMethod = getDevAuthMethod();
      if (authMethod === AUTH_METHOD.AUTHENTICATED) {
        await supabase.auth.signOut();
      }
      router.push("/login");
      return;
    }
    await supabase.auth.signOut();
    router.push("/login");
  };

  const { state: sidebarState, toggleSidebar } = useSidebar();
  const isSidebarOpen = sidebarState === "expanded";

  return (
    <>
      {/* Sidebar toggle button */}
      <div className="fixed left-0 top-1/2 -translate-y-1/2 z-50">
        <button
          onClick={toggleSidebar}
          className={`flex items-center justify-center h-8 w-8 rounded-r-md bg-card hover:bg-muted transition-all ${
            isSidebarOpen ? "ml-[16rem]" : "ml-0"
          }`}
          aria-label="Toggle sidebar"
        >
          {isSidebarOpen ? (
            <PanelLeftClose className="h-4 w-4" />
          ) : (
            <PanelLeftOpen className="h-4 w-4" />
          )}
        </button>
      </div>
      <div className="flex h-screen w-full">
        <div>
          <AppSidebar
            initialFolders={initialFolders}
            initialChats={initialChats}
            createFolder={createFolder}
            createChat={createChat}
            moveChat={moveChat}
            renameFolder={renameFolder}
            deleteFolder={deleteFolder}
            renameChat={renameChat}
            deleteChat={deleteChat}
          />
        </div>
        <div className="flex-1">
          <ChatInterface userName={userName} onSignOut={handleSignOut} />
        </div>
      </div>
    </>
  );
}

export default function ClientDashboard(props: ClientDashboardProps) {
  return (
    <SidebarProvider>
      <DashboardContent {...props} />
    </SidebarProvider>
  );
}
