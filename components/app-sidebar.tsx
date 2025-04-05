// components/app-sidebar.tsx
"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Folder, Chat } from "@/utils/types/chatTypes";
import { SIDEBAR_FEATURES } from "./sidebar-features";
import { ChatSidebarContent } from "./sidebar-chat";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarSeparator,
} from "@/components/ui/sidebar";

interface AppSidebarProps {
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

export function AppSidebar({
  initialFolders,
  initialChats,
  createFolder,
  createChat,
  moveChat,
  renameFolder,
  deleteFolder,
  renameChat,
  deleteChat,
}: AppSidebarProps) {
  const [activeFeature, setActiveFeature] = useState("chat");
  const [activeChatId, setActiveChatId] = useState<number | null>(null);

  return (
    <Sidebar>
      <SidebarHeader className="bg-sidebar-header">
        <SidebarMenu>
          <SidebarSeparator />
          {SIDEBAR_FEATURES.map((feature) => (
            <SidebarMenuItem key={feature.id}>
              <SidebarMenuButton
                onClick={() => setActiveFeature(feature.id)}
                isActive={activeFeature === feature.id}
              >
                <feature.icon className="size-4" />
                <span>{feature.name}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        {activeFeature === "chat" && (
          <ChatSidebarContent
            initialFolders={initialFolders}
            initialChats={initialChats}
            activeChatId={activeChatId}
            setActiveChatId={setActiveChatId}
            createFolder={createFolder}
            createChat={createChat}
            moveChat={moveChat}
            renameFolder={renameFolder}
            deleteFolder={deleteFolder}
            renameChat={renameChat}
            deleteChat={deleteChat}
          />
        )}
      </SidebarContent>

      <SidebarFooter>
        <div className="text-sm p-2">
          Credits: 100 remaining
          <button className="ml-2 text-primary hover:underline">
            Buy more
          </button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
