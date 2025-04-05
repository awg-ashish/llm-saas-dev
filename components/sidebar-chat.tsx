// components/sidebar-chat.tsx
"use client";

import { useState, useTransition } from "react";
import {
  Plus,
  Folder as FolderIcon,
  MessageSquare,
  ChevronDown,
  ChevronRight,
  MoreVertical,
  Share2,
  Trash2,
  Pencil,
} from "lucide-react";
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarGroupAction,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from "@/components/ui/dropdown-menu";
import { Chat, Folder } from "@/utils/types/chatTypes";

interface ChatSidebarContentProps {
  initialFolders: Folder[];
  initialChats: Chat[];
  activeChatId: number | null;
  setActiveChatId: (chatId: number | null) => void;

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

export function ChatSidebarContent({
  initialFolders,
  initialChats,
  activeChatId,
  setActiveChatId,
  createFolder: createFolderAction,
  createChat: createChatAction,
  moveChat: moveChatAction,
  renameFolder: renameFolderAction,
  deleteFolder: deleteFolderAction,
  renameChat: renameChatAction,
  deleteChat: deleteChatAction,
}: ChatSidebarContentProps) {
  const [isPending, startTransition] = useTransition();
  const [expandedFolders, setExpandedFolders] = useState<Set<number>>(
    new Set()
  );
  const [folderEditingId, setFolderEditingId] = useState<number | null>(null);
  const [folderEditName, setFolderEditName] = useState("");
  const [chatEditingId, setChatEditingId] = useState<number | null>(null);
  const [chatEditName, setChatEditName] = useState("");

  const handleCreateFolder = () => {
    startTransition(async () => {
      const folderName = `New Folder ${initialFolders.length + 1}`;
      const result = await createFolderAction(folderName);
      if ("error" in result) {
        console.error("Failed to create folder:", result.error);
      } else {
        setExpandedFolders((prev) => new Set(prev).add(result.id));
      }
    });
  };

  const handleCreateChat = (folderId?: number | null) => {
    startTransition(async () => {
      const chatName = `New Chat ${initialChats.length + 1}`;
      const result = await createChatAction(chatName, folderId);
      if ("error" in result) {
        console.error("Failed to create chat:", result.error);
      } else {
        setActiveChatId(result.id);
      }
    });
  };

  const handleMoveChat = (chatId: number, folderId: number | null) => {
    startTransition(async () => {
      const result = await moveChatAction(chatId, folderId);
      if (result.error) {
        console.error("Failed to move chat:", result.error);
      }
    });
  };

  const handleToggleFolder = (folderId: number) => {
    setExpandedFolders((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(folderId)) {
        newSet.delete(folderId);
      } else {
        newSet.add(folderId);
      }
      return newSet;
    });
  };

  const handleStartEditing = (
    type: "folder" | "chat",
    id: number,
    currentName: string
  ) => {
    if (type === "folder") {
      setFolderEditingId(id);
      setFolderEditName(currentName);
    } else {
      setChatEditingId(id);
      setChatEditName(currentName);
    }
  };

  const handleSaveEdit = (type: "folder" | "chat") => {
    if (type === "folder" && folderEditingId) {
      const id = folderEditingId;
      const name = folderEditName;
      setFolderEditingId(null);
      startTransition(async () => {
        const result = await renameFolderAction(id, name);
        if (result.error) {
          console.error("Failed to rename folder:", result.error);
        }
      });
    } else if (type === "chat" && chatEditingId) {
      const id = chatEditingId;
      const name = chatEditName;
      setChatEditingId(null);
      startTransition(async () => {
        const result = await renameChatAction(id, name);
        if (result.error) {
          console.error("Failed to rename chat:", result.error);
        }
      });
    }
  };

  const handleCancelEdit = (type: "folder" | "chat") => {
    if (type === "folder") {
      setFolderEditingId(null);
      setFolderEditName("");
    } else {
      setChatEditingId(null);
      setChatEditName("");
    }
  };

  const handleDeleteFolder = (folderId: number) => {
    startTransition(async () => {
      const result = await deleteFolderAction(folderId);
      if (result.error) {
        console.error("Failed to delete folder:", result.error);
      } else {
        const activeChat = initialChats.find(
          (chat) => chat.folder_id === folderId
        );
        if (activeChat && activeChat.id === activeChatId) {
          setActiveChatId(null);
        }
      }
    });
  };

  const handleDeleteChat = (chatId: number) => {
    startTransition(async () => {
      const result = await deleteChatAction(chatId);
      if (result.error) {
        console.error("Failed to delete chat:", result.error);
      } else {
        if (activeChatId === chatId) {
          setActiveChatId(null);
        }
      }
    });
  };

  return (
    <>
      <SidebarGroup>
        <SidebarGroupLabel>Folders</SidebarGroupLabel>
        <SidebarGroupAction onClick={handleCreateFolder} disabled={isPending}>
          <Plus className="size-4" />
        </SidebarGroupAction>
        <SidebarGroupContent>
          <SidebarMenu>
            {initialFolders.map((folder) => {
              const isExpanded = expandedFolders.has(folder.id);
              return (
                <div key={folder.id} className="group/folder">
                  <SidebarMenuItem className="flex items-center">
                    {folderEditingId === folder.id ? (
                      <div className="flex-1 flex items-center gap-2">
                        <input
                          type="text"
                          value={folderEditName}
                          onChange={(e) => setFolderEditName(e.target.value)}
                          onBlur={() => handleSaveEdit("folder")}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleSaveEdit("folder");
                            if (e.key === "Escape") handleCancelEdit("folder");
                          }}
                          autoFocus
                          className="flex-1 bg-transparent border-b outline-none px-2 py-1 text-sm"
                          disabled={isPending}
                        />
                      </div>
                    ) : (
                      <SidebarMenuButton
                        className="flex-1"
                        onClick={() => handleToggleFolder(folder.id)}
                        disabled={isPending}
                      >
                        {isExpanded ? (
                          <ChevronDown className="size-4" />
                        ) : (
                          <ChevronRight className="size-4" />
                        )}
                        <FolderIcon className="size-4" />
                        <span className="flex-1 truncate">{folder.name}</span>
                      </SidebarMenuButton>
                    )}

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          className="opacity-0 group-hover/folder:opacity-100 p-1 disabled:opacity-50"
                          disabled={isPending || folderEditingId === folder.id}
                        >
                          <MoreVertical className="size-4" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem disabled>
                          <Share2 className="mr-2 size-4" />
                          Share
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onSelect={(e) => {
                            e.preventDefault();
                            handleStartEditing(
                              "folder",
                              folder.id,
                              folder.name
                            );
                          }}
                          disabled={isPending}
                        >
                          <Pencil className="mr-2 size-4" />
                          Rename
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive"
                          onSelect={() => handleDeleteFolder(folder.id)}
                          disabled={isPending}
                        >
                          <Trash2 className="mr-2 size-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </SidebarMenuItem>

                  {isExpanded && (
                    <div className="ml-4 pl-2 border-l border-border/50">
                      {initialChats
                        .filter((chat) => chat.folder_id === folder.id)
                        .map((chat) => (
                          <ChatItem
                            key={chat.id}
                            chat={chat}
                            isActive={activeChatId === chat.id}
                            onSelect={() => setActiveChatId(chat.id)}
                            onMoveToFolder={handleMoveChat}
                            folders={initialFolders}
                            editingId={chatEditingId}
                            editName={chatEditName}
                            onStartEdit={(type, id, name) =>
                              handleStartEditing(type, id, name)
                            }
                            onSaveEdit={() => handleSaveEdit("chat")}
                            onCancelEdit={() => handleCancelEdit("chat")}
                            onEditNameChange={setChatEditName}
                            onDelete={handleDeleteChat}
                            isPending={isPending}
                          />
                        ))}
                      <SidebarMenuItem className="opacity-50 hover:opacity-100">
                        <SidebarMenuButton
                          onClick={() => handleCreateChat(folder.id)}
                          disabled={isPending}
                        >
                          <Plus className="mr-2 size-3" />
                          <span className="text-xs">New Chat</span>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    </div>
                  )}
                </div>
              );
            })}
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>

      <SidebarGroup>
        <SidebarGroupLabel>Chats</SidebarGroupLabel>
        <SidebarGroupAction
          onClick={() => handleCreateChat()}
          disabled={isPending}
        >
          <Plus className="size-4" />
        </SidebarGroupAction>
        <SidebarGroupContent>
          <SidebarMenu>
            {initialChats
              .filter((chat) => !chat.folder_id)
              .map((chat) => (
                <ChatItem
                  key={chat.id}
                  chat={chat}
                  isActive={activeChatId === chat.id}
                  onSelect={() => setActiveChatId(chat.id)}
                  onMoveToFolder={handleMoveChat}
                  folders={initialFolders}
                  editingId={chatEditingId}
                  editName={chatEditName}
                  onStartEdit={(type, id, name) =>
                    handleStartEditing(type, id, name)
                  }
                  onSaveEdit={() => handleSaveEdit("chat")}
                  onCancelEdit={() => handleCancelEdit("chat")}
                  onEditNameChange={setChatEditName}
                  onDelete={handleDeleteChat}
                  isPending={isPending}
                />
              ))}
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
    </>
  );
}

interface ChatItemProps {
  chat: Chat;
  isActive: boolean;
  onSelect: () => void;
  onMoveToFolder: (chatId: number, folderId: number | null) => void;
  folders: Folder[];
  editingId: number | null;
  editName: string;
  onStartEdit: (type: "chat", id: number, name: string) => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  onEditNameChange: (name: string) => void;
  onDelete: (chatId: number) => void;
  isPending: boolean;
}

function ChatItem({
  chat,
  isActive,
  onSelect,
  onMoveToFolder,
  folders,
  editingId,
  editName,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  onEditNameChange,
  onDelete,
  isPending,
}: ChatItemProps) {
  return (
    <div className="group/chat">
      <SidebarMenuItem className="flex items-center">
        {editingId === chat.id ? (
          <div className="flex-1 flex items-center gap-2">
            <input
              type="text"
              value={editName}
              onChange={(e) => onEditNameChange(e.target.value)}
              onBlur={onSaveEdit}
              onKeyDown={(e) => {
                if (e.key === "Enter") onSaveEdit();
                if (e.key === "Escape") onCancelEdit();
              }}
              autoFocus
              className="flex-1 bg-transparent border-b outline-none px-2 py-1 text-sm"
              disabled={isPending}
            />
          </div>
        ) : (
          <SidebarMenuButton
            className="flex-1"
            onClick={onSelect}
            isActive={isActive}
            disabled={isPending}
          >
            <MessageSquare className="size-4" />
            <span className="flex-1 truncate">{chat.title}</span>
          </SidebarMenuButton>
        )}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="opacity-0 group-hover/chat:opacity-100 p-1 disabled:opacity-50"
              disabled={isPending || editingId === chat.id}
            >
              <MoreVertical className="size-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem disabled>
              <Share2 className="mr-2 size-4" />
              Share
            </DropdownMenuItem>
            <DropdownMenuSub>
              <DropdownMenuSubTrigger disabled={isPending}>
                <FolderIcon className="mr-2 size-4" />
                Move to Folder
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                {chat.folder_id && (
                  <DropdownMenuItem
                    onSelect={() => onMoveToFolder(chat.id, null)}
                    disabled={isPending}
                  >
                    (Remove from folder)
                  </DropdownMenuItem>
                )}
                {folders
                  .filter((folder) => folder.id !== chat.folder_id)
                  .map((folder) => (
                    <DropdownMenuItem
                      key={folder.id}
                      onSelect={() => onMoveToFolder(chat.id, folder.id)}
                      disabled={isPending}
                    >
                      {folder.name}
                    </DropdownMenuItem>
                  ))}
                {folders.filter((folder) => folder.id !== chat.folder_id)
                  .length === 0 &&
                  !chat.folder_id && (
                    <DropdownMenuItem disabled>
                      No other folders
                    </DropdownMenuItem>
                  )}
              </DropdownMenuSubContent>
            </DropdownMenuSub>
            <DropdownMenuItem
              onSelect={(e) => {
                e.preventDefault();
                onStartEdit("chat", chat.id, chat.title);
              }}
              disabled={isPending}
            >
              <Pencil className="mr-2 size-4" />
              Rename
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-destructive"
              onSelect={() => onDelete(chat.id)}
              disabled={isPending}
            >
              <Trash2 className="mr-2 size-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </div>
  );
}
