"use client";

import { useState, useTransition, useMemo } from "react";
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
import { Chat, Folder } from "@/utils/types/chatTypes"; // Assuming these types are still valid
import { useRouter, useParams } from "next/navigation";
import {
  createFolder as createFolderAction,
  moveChat as moveChatAction,
  renameChat as renameChatAction,
  deleteChat as deleteChatAction,
  renameFolder as renameFolderAction,
  deleteFolder as deleteFolderAction,
} from "@/app/dashboard/chatActions";

interface ChatSidebarContentProps {
  // Assuming initial data is fetched by a parent Server Component
  initialFolders: Folder[];
  initialChats: Chat[];
  // userId might be needed if actions don't get it from session implicitly
  // userId: string;
}

export function ChatSidebarContent({
  initialFolders,
  initialChats,
}: // userId
ChatSidebarContentProps) {
  const router = useRouter();
  const params = useParams();
  const [isPending, startTransition] = useTransition();
  const [expandedFolders, setExpandedFolders] = useState<Set<number>>(
    new Set()
  );
  const [folderEditingId, setFolderEditingId] = useState<number | null>(null);
  const [folderEditName, setFolderEditName] = useState("");
  const [chatEditingId, setChatEditingId] = useState<number | null>(null);
  const [chatEditName, setChatEditName] = useState("");

  // Get active chat ID from URL params
  const activeChatId = useMemo(() => {
    const id = params?.chatId; // Assuming the dynamic route is [chatId]
    return id ? parseInt(Array.isArray(id) ? id[0] : id, 10) : null;
  }, [params]);

  // --- Action Handlers ---

  // Create a new folder
  const handleCreateFolder = () => {
    startTransition(async () => {
      const folderName = `New Folder`;
      try {
        const result = await createFolderAction(folderName);
        router.refresh(); // Refresh to get new data
        setExpandedFolders((prev) => new Set(prev).add(result.id));
      } catch (error) {
        console.error("Failed to create folder:", error);
      }
    });
  };

  const handleCreateChat = () => {
    router.push("/dashboard");
  };

  // Move a chat to a different folder
  const handleMoveChat = (chatId: number, folderId: number | null) => {
    startTransition(async () => {
      try {
        await moveChatAction(chatId, folderId);
        router.refresh();
      } catch (error) {
        console.error("Failed to move chat:", error);
      }
    });
  };

  // Rename a folder
  const handleRenameFolder = (id: number, name: string) => {
    startTransition(async () => {
      try {
        await renameFolderAction(id, name);
        router.refresh();
      } catch (error) {
        console.error("Failed to rename folder:", error);
      }
    });
  };

  // Delete a folder and all its chats
  const handleDeleteFolder = (folderId: number) => {
    startTransition(async () => {
      try {
        await deleteFolderAction(folderId);

        // If the active chat was in this folder, navigate away
        const activeChatIsInDeletedFolder = initialChats.find(
          (chat) => chat.id === activeChatId && chat.folder_id === folderId
        );
        if (activeChatIsInDeletedFolder) {
          router.push("/dashboard"); // Or to the first available chat
        }

        router.refresh();
      } catch (error) {
        console.error("Failed to delete folder:", error);
      }
    });
  };

  // Rename a chat
  const handleRenameChat = (id: number, name: string) => {
    startTransition(async () => {
      try {
        await renameChatAction(id, name);
        router.refresh();
      } catch (error) {
        console.error("Failed to rename chat:", error);
      }
    });
  };

  // Delete a chat
  const handleDeleteChat = (chatId: number) => {
    startTransition(async () => {
      try {
        await deleteChatAction(chatId);

        // If deleting the active chat, navigate away
        if (activeChatId === chatId) {
          router.push("/dashboard");
        }

        router.refresh();
      } catch (error) {
        console.error("Failed to delete chat:", error);
      }
    });
  };

  // --- End Action Handlers ---

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

  // Combined save handler using placeholder actions
  const handleSaveEdit = (type: "folder" | "chat") => {
    if (type === "folder" && folderEditingId) {
      handleRenameFolder(folderEditingId, folderEditName); // Use placeholder
      setFolderEditingId(null);
    } else if (type === "chat" && chatEditingId) {
      handleRenameChat(chatEditingId, chatEditName); // Use placeholder
      setChatEditingId(null);
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

  // Note: handleDeleteFolder and handleDeleteChat are now implemented above using placeholders

  return (
    <div className="z-50">
      <SidebarGroup>
        <SidebarGroupLabel>Folders</SidebarGroupLabel>
        <SidebarGroupAction
          onClick={handleCreateFolder}
          disabled={isPending}
          className="hover:opacity-100 w-5 h-5 hover:cursor-pointer"
        >
          <Plus className="size-4" />
        </SidebarGroupAction>
        <SidebarGroupContent>
          <SidebarMenu>
            {initialFolders.map((folder) => {
              const isExpanded = expandedFolders.has(folder.id);
              return (
                <div
                  key={folder.id}
                  className="hover:cursor-pointer hover:opacity-100"
                >
                  {/* Folder Header */}
                  <SidebarMenuItem className="group/folder flex items-center relative z-10 hover:cursor-pointer hover:opacity-100">
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
                        className="flex-1 hover:cursor-pointer hover:opacity-100"
                        onClick={() => handleToggleFolder(folder.id)}
                        disabled={isPending}
                      >
                        {isExpanded ? (
                          <ChevronDown className="size-4" />
                        ) : (
                          <ChevronRight className="size-4" />
                        )}
                        <FolderIcon
                          className="size-5 text-yellow-500"
                          fill="#fecf06"
                        />
                        <span className="flex-1 truncate">{folder.name}</span>
                      </SidebarMenuButton>
                    )}

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          className="opacity-25 group-hover/folder:opacity-100 p-1 disabled:opacity-0 w-5 h-5 hover:cursor-pointer"
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

                  {/* Expanded Chats */}
                  {isExpanded && (
                    <div className="ml-4 pl-2 border-l border-border/50 hover:cursor-pointer">
                      {initialChats
                        .filter((chat) => chat.folder_id === folder.id)
                        .map((chat) => (
                          <ChatItem
                            key={chat.id}
                            chat={chat}
                            isActive={activeChatId === chat.id}
                            // Updated onSelect to navigate
                            onSelect={() =>
                              router.push(`/dashboard/chat/${chat.id}`)
                            }
                            onMoveToFolder={handleMoveChat} // Uses placeholder
                            folders={initialFolders}
                            editingId={chatEditingId}
                            editName={chatEditName}
                            onStartEdit={(type, id, name) =>
                              handleStartEditing(type, id, name)
                            }
                            onSaveEdit={() => handleSaveEdit("chat")}
                            onCancelEdit={() => handleCancelEdit("chat")}
                            onEditNameChange={setChatEditName}
                            onDelete={handleDeleteChat} // Uses placeholder
                            isPending={isPending}
                          />
                        ))}
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
          <Plus className="size-4 hover:cursor-pointer" />
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
                  // Updated onSelect to navigate
                  onSelect={() => router.push(`/dashboard/chat/${chat.id}`)}
                  onMoveToFolder={handleMoveChat} // Uses placeholder
                  folders={initialFolders}
                  editingId={chatEditingId}
                  editName={chatEditName}
                  onStartEdit={(type, id, name) =>
                    handleStartEditing(type, id, name)
                  }
                  onSaveEdit={() => handleSaveEdit("chat")}
                  onCancelEdit={() => handleCancelEdit("chat")}
                  onEditNameChange={setChatEditName}
                  onDelete={handleDeleteChat} // Uses placeholder
                  isPending={isPending}
                />
              ))}
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
    </div>
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
  className?: string;
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
      <SidebarMenuItem className="flex items-center relative z-10">
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
            className="flex-1 hover:cursor-pointer hover:opacity-100"
            onClick={onSelect}
            isActive={isActive}
            disabled={isPending}
          >
            <MessageSquare className="size-3 text-[#9eb1f6]" fill="#9eb1f6" />
            <span className="flex-1 truncate text-xs">{chat.title}</span>
          </SidebarMenuButton>
        )}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="opacity-25 group-hover/chat:opacity-100 p-1 disabled:opacity-50 group-hover/chat:cursor-pointer"
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
                <FolderIcon
                  className="mr-2 size-5 text-yellow-500 "
                  fill="#fecf06"
                />
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
