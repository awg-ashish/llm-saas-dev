"use client";

import { useState, useTransition, useMemo } from "react";
import { toast } from "sonner";
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
  const [chatEditingId, setChatEditingId] = useState<string | null>(null); // Keep as string | null
  const [chatEditName, setChatEditName] = useState("");

  // Get active chat ID from URL params - now it's a string (UUID)
  const activeChatId = useMemo(() => {
    const id = params?.chatId; // Assuming the dynamic route is [chatId]
    return id ? (Array.isArray(id) ? id[0] : id) : null; // Use the string directly
  }, [params]);

  // --- Action Handlers ---

  // Create a new folder
  const handleCreateFolder = () => {
    const folderName = `New Folder`; // Define name outside promise for success message
    const promise = createFolderAction(folderName).then((result) => {
      if (!result.success || typeof result.id !== "number") {
        throw new Error(result.error || "Failed to create folder");
      }
      router.refresh(); // Refresh on success
      setExpandedFolders((prev) => new Set(prev).add(result.id!));
      return result; // Pass result to success handler
    });

    startTransition(() => {
      toast.promise(promise, {
        loading: "Creating folder...",
        success: `Folder "${folderName}" created!`,
        error: (err) => err.message || "Failed to create folder.",
      });
    });
  };

  const handleCreateChat = () => {
    router.push("/dashboard");
  };

  // Move a chat to a different folder
  const handleMoveChat = (chatId: string, folderId: number | null) => {
    // Changed chatId to string
    // moveChatAction returns void on success, throws error on failure
    const promise = moveChatAction(chatId, folderId).then(() => {
      router.refresh();
      // No explicit return needed for success case with toast.promise
    });

    startTransition(() => {
      toast.promise(promise, {
        loading: "Moving chat...",
        success: "Chat moved successfully!",
        error: (err) => err.message || "Failed to move chat.", // Error comes from rejection
      });
    });
  };

  // Rename a folder
  const handleRenameFolder = (id: number, name: string) => {
    // renameFolderAction returns void on success, throws error on failure
    const promise = renameFolderAction(id, name).then(() => {
      router.refresh();
    });

    startTransition(() => {
      toast.promise(promise, {
        loading: "Renaming folder...",
        success: `Folder renamed to "${name}"!`,
        error: (err) => err.message || "Failed to rename folder.",
      });
    });
  };

  // Delete a folder and all its chats
  const handleDeleteFolder = (folderId: number) => {
    const promise = deleteFolderAction(folderId).then((result) => {
      if (!result.success) {
        throw new Error(result.error || "Failed to delete folder");
      }
      // If the active chat was in this folder, navigate away
      // Compare string activeChatId with string chat.id
      const activeChatIsInDeletedFolder = initialChats.find(
        (chat) => chat.id === activeChatId && chat.folder_id === folderId
      );
      if (activeChatIsInDeletedFolder) {
        router.push("/dashboard"); // Or to the first available chat
      }
      router.refresh();
      return result;
    });

    startTransition(() => {
      toast.promise(promise, {
        loading: "Deleting folder...",
        success: "Folder deleted successfully!",
        error: (err) => err.message || "Failed to delete folder.",
      });
    });
  };

  // Rename a chat
  const handleRenameChat = (id: string, name: string) => {
    // Changed id to string
    // renameChatAction returns void on success, throws error on failure
    const promise = renameChatAction(id, name).then(() => {
      router.refresh();
    });

    startTransition(() => {
      toast.promise(promise, {
        loading: "Renaming chat...",
        success: `Chat renamed to "${name}"!`,
        error: (err) => err.message || "Failed to rename chat.",
      });
    });
  };

  // Delete a chat
  const handleDeleteChat = (chatId: string) => {
    // Changed chatId to string
    const promise = deleteChatAction(chatId).then((result) => {
      if (!result.success) {
        throw new Error(result.error || "Failed to delete chat");
      }
      // If deleting the active chat, navigate away
      if (activeChatId === chatId) {
        router.push("/dashboard");
      }
      router.refresh();
      return result;
    });

    startTransition(() => {
      toast.promise(promise, {
        loading: "Deleting chat...",
        success: "Chat deleted successfully!",
        error: (err) => err.message || "Failed to delete chat.",
      });
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

  // id can now be string (for chat) or number (for folder)
  const handleStartEditing = (
    type: "folder" | "chat",
    id: number | string,
    currentName: string
  ) => {
    if (type === "folder" && typeof id === "number") {
      setFolderEditingId(id); // id is number here
      setFolderEditName(currentName);
      setChatEditingId(null);
    } else if (type === "chat" && typeof id === "string") {
      setChatEditingId(id); // id is string here
      setChatEditName(currentName);
      setFolderEditingId(null);
    }
  };

  // Combined save handler
  const handleSaveEdit = (type: "folder" | "chat") => {
    if (type === "folder" && folderEditingId !== null) {
      handleRenameFolder(folderEditingId, folderEditName);
      setFolderEditingId(null);
    } else if (type === "chat" && chatEditingId !== null) {
      handleRenameChat(chatEditingId, chatEditName);
      setChatEditingId(null);
    }
  };

  const handleCancelEdit = (type: "folder" | "chat") => {
    if (type === "folder") {
      setFolderEditingId(null);
      setFolderEditName("");
    } else {
      setChatEditingId(null); // Reset chat editing ID
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
                          // Compare number === number
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
                            key={chat.id} // chat.id is string
                            chat={chat}
                            isActive={activeChatId === chat.id} // Compare string === string
                            // Updated onSelect to navigate
                            onSelect={
                              () => router.push(`/dashboard/chat/${chat.id}`) // chat.id is string
                            }
                            onMoveToFolder={handleMoveChat}
                            folders={initialFolders}
                            editingId={chatEditingId} // Pass string ID
                            editName={chatEditName}
                            // Pass the main handler function directly
                            onStartEdit={handleStartEditing}
                            onSaveEdit={() => handleSaveEdit("chat")}
                            onCancelEdit={() => handleCancelEdit("chat")}
                            onEditNameChange={setChatEditName}
                            onDelete={() => handleDeleteChat(chat.id)}
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
                  key={chat.id} // chat.id is string
                  chat={chat}
                  isActive={activeChatId === chat.id} // Compare string === string
                  // Updated onSelect to navigate
                  onSelect={() => router.push(`/dashboard/chat/${chat.id}`)} // chat.id is string
                  onMoveToFolder={handleMoveChat}
                  folders={initialFolders}
                  editingId={chatEditingId} // Pass string ID
                  editName={chatEditName}
                  // Pass the main handler function directly
                  onStartEdit={handleStartEditing}
                  onSaveEdit={() => handleSaveEdit("chat")}
                  onCancelEdit={() => handleCancelEdit("chat")}
                  onEditNameChange={setChatEditName}
                  onDelete={() => handleDeleteChat(chat.id)}
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
  chat: Chat; // Assuming Chat type has id: string now
  isActive: boolean;
  onSelect: () => void;
  onMoveToFolder: (chatId: string, folderId: number | null) => void;
  folders: Folder[];
  editingId: string | null;
  editName: string;
  // Corrected onStartEdit prop type to match parent handler
  onStartEdit: (
    type: "folder" | "chat",
    id: number | string,
    name: string
  ) => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  onEditNameChange: (name: string) => void;
  onDelete: (chatId: string) => void;
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
        {/* Compare string === string */}
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
              // Compare string === string
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
                // Call the passed handler with specific arguments for this chat item
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
