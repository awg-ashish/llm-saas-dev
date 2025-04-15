"use server";

import { createClient } from "@/utils/supabase/server";
import { Message } from "ai";
import { redirect } from "next/navigation";
import {
  appendChatMessage,
  createFolder as createFolderPersistence,
  deleteChat as deleteChatPersistence,
  deleteFolder as deleteFolderPersistence,
  moveChat as moveChatPersistence,
  renameChat as renameChatPersistence,
  renameFolder as renameFolderPersistence,
} from "@/utils/supabase/chatPersistence";

// Define a type for the sidebar data structure - adjust as needed based on sidebar-chat.tsx
export interface ChatFolder {
  id: number;
  name: string;
  type: string; // Assuming 'chat' or 'folder'
  chats: ChatSummary[];
}

export interface ChatSummary {
  id: number;
  title: string;
  folder_id: number | null;
}

export async function createChat(
  title: string,
  folderId?: number,
  modelId?: number | null // Changed parameter from modelSlug to modelId
): Promise<{ id: number }> {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    console.error("User not authenticated:", userError);
    redirect("/login");
  }

  const { data, error } = await supabase
    .from("chats")
    .insert({
      user_id: user.id,
      title: title || "New Chat", // Default title if none provided
      folder_id: folderId,
      model_id: modelId, // Use the passed modelId here
    })
    .select("id")
    .single();

  if (error) {
    console.error("Error creating chat:", error);
    throw new Error(`Failed to create chat: ${error.message}`);
  }

  if (!data) {
    throw new Error("Failed to create chat: No data returned.");
  }

  console.log(`Chat created with ID: ${data.id}`);
  return { id: data.id };
}

// Placeholder - Implement based on how sidebar-chat.tsx needs the data
export async function loadChatsAndFolders(
  userId: string
): Promise<ChatFolder[]> {
  const supabase = await createClient();

  // Example implementation: Fetch folders and then chats for each folder
  // You'll need to adapt this query based on your exact needs and RLS policies
  const { data: folders, error: foldersError } = await supabase
    .from("chat_folders")
    .select("id, name, type")
    .eq("user_id", userId);

  if (foldersError) {
    console.error("Error loading folders:", foldersError);
    return [];
  }

  const { data: chats, error: chatsError } = await supabase
    .from("chats")
    .select("id, title, folder_id")
    .eq("user_id", userId);

  if (chatsError) {
    console.error("Error loading chats:", chatsError);
    return [];
  }

  // Define types for Supabase results explicitly if needed, or infer if possible
  type DbFolder = { id: number; name: string; type: string };
  type DbChat = { id: number; title: string; folder_id: number | null };

  // Structure the data (this is a basic example, adjust as needed)
  const structuredData: ChatFolder[] = (folders as DbFolder[]).map(
    (folder) => ({
      ...folder,
      chats: (chats as DbChat[]).filter((chat) => chat.folder_id === folder.id),
    })
  );

  // Add chats without a folder
  const chatsWithoutFolder = (chats as DbChat[]).filter(
    (chat) => chat.folder_id === null
  );
  if (chatsWithoutFolder.length > 0) {
    structuredData.push({
      id: 0, // Or some other indicator for 'unfiled'
      name: "Unfiled Chats",
      type: "folder", // Treat as a virtual folder
      chats: chatsWithoutFolder,
    });
  }

  return structuredData;
}

export async function loadChatMessages(chatId: number): Promise<Message[]> {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    console.error("User not authenticated for loading messages:", userError);
    return []; // Or throw error / redirect
  }

  const { data, error } = await supabase
    .from("chat_messages")
    .select("id, role, content, created_at, model_id") // Include model_id if needed later
    .eq("chat_id", chatId)
    .eq("user_id", user.id) // Ensure user owns the messages (RLS should also handle this)
    .order("created_at", { ascending: true });

  if (error) {
    console.error(`Error loading messages for chat ${chatId}:`, error);
    return [];
  }

  // Define type for Supabase message row
  type DbMessage = {
    id: number;
    role: string;
    content: string;
    created_at: string;
    model_id: number | null;
  };

  // Map Supabase rows to Vercel AI SDK Message type, filtering for valid UI roles
  const messages: Message[] = (data as DbMessage[])
    .filter(
      (msg) => msg.role === "user" || msg.role === "assistant"
      // Add || msg.role === 'system' || msg.role === 'data' if needed
    )
    .map((msg) => ({
      id: msg.id.toString(), // Vercel expects string IDs
      role: msg.role as "user" | "assistant", // More specific cast
      content: msg.content,
      createdAt: new Date(msg.created_at),
      // Add other fields if needed, e.g., data: { modelId: msg.model_id }
    }));

  return messages;
}

/**
 * Appends a message to a chat.
 *
 * @param chatId - The ID of the chat
 * @param message - The message to append
 * @param modelId - Optional model ID
 */
export async function appendMessage(
  chatId: number,
  message: Message,
  modelId?: number
): Promise<void> {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    console.error("User not authenticated:", userError);
    redirect("/login");
  }

  try {
    await appendChatMessage(
      chatId,
      {
        role: message.role,
        content: message.content,
        createdAt: message.createdAt,
      },
      user.id,
      modelId
    );
    console.log(`Message appended to chat ${chatId}`);
  } catch (error) {
    console.error(`Error appending message to chat ${chatId}:`, error);
    throw new Error(`Failed to append message: ${(error as Error).message}`);
  }
}

/**
 * Saves a new message to the chat.
 *
 * @param chatId - The ID of the chat
 * @param message - The message to save
 * @param modelId - Optional model ID
 */
export async function saveMessage(
  chatId: number,
  message: {
    role: string;
    content: string;
    createdAt?: Date;
  },
  modelId?: number
): Promise<void> {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    console.error("User not authenticated:", userError);
    redirect("/login");
  }

  try {
    const { error } = await supabase.from("chat_messages").insert({
      chat_id: chatId,
      user_id: user.id,
      role: message.role,
      content: message.content,
      created_at: message.createdAt?.toISOString() || new Date().toISOString(),
      model_id: modelId,
    });

    if (error) {
      throw new Error(`Error saving message: ${error.message}`);
    }

    // Update chat's updated_at timestamp
    await supabase
      .from("chats")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", chatId)
      .eq("user_id", user.id);

    console.log(`Message saved to chat ${chatId}`);
  } catch (error) {
    console.error(`Error saving message to chat ${chatId}:`, error);
    throw new Error(`Failed to save message: ${(error as Error).message}`);
  }
}

/**
 * Saves a complete conversation to a chat.
 * This replaces the current implementation that deletes all messages first.
 *
 * @param chatId - The ID of the chat
 * @param messages - The complete conversation
 * @param modelId - Optional model ID
 * @deprecated Use saveMessage instead for a simpler approach
 */
export async function saveConversation(
  chatId: number,
  messages: Message[],
  modelId?: number
): Promise<void> {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    console.error("User not authenticated:", userError);
    redirect("/login");
  }

  // Check if messages array is empty
  if (!messages || messages.length === 0) {
    console.log(`No messages to save for chat ${chatId}.`);
    return;
  }

  try {
    // Delete existing messages
    await supabase
      .from("chat_messages")
      .delete()
      .eq("chat_id", chatId)
      .eq("user_id", user.id);

    // Insert all new messages
    const messagesToInsert = messages.map((msg) => ({
      chat_id: chatId,
      user_id: user.id,
      role: msg.role,
      content: msg.content,
      created_at: msg.createdAt?.toISOString() || new Date().toISOString(),
      model_id: modelId,
    }));

    if (messagesToInsert.length > 0) {
      const { error: insertError } = await supabase
        .from("chat_messages")
        .insert(messagesToInsert);

      if (insertError) {
        throw new Error(insertError.message);
      }
    }

    // Update chat's updated_at timestamp
    await supabase
      .from("chats")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", chatId)
      .eq("user_id", user.id);

    console.log(`Conversation saved for chat ${chatId}`);
  } catch (error) {
    console.error(`Error saving conversation for chat ${chatId}:`, error);
    throw new Error(`Failed to save conversation: ${(error as Error).message}`);
  }
}

/**
 * Legacy function for backward compatibility.
 * @deprecated Use saveConversation instead.
 */
export async function saveChatMessages(
  chatId: number,
  userId: string,
  messages: Message[],
  modelId?: number // Optional modelId
): Promise<void> {
  const supabase = await createClient();

  // 1. Delete existing messages for this chat
  const { error: deleteError } = await supabase
    .from("chat_messages")
    .delete()
    .eq("chat_id", chatId)
    .eq("user_id", userId); // Ensure user owns the messages

  if (deleteError) {
    console.error(`Error deleting messages for chat ${chatId}:`, deleteError);
    throw new Error(
      `Failed to delete existing messages: ${deleteError.message}`
    );
  }

  // 2. Insert new messages
  const messagesToInsert = messages.map((msg) => ({
    chat_id: chatId,
    user_id: userId,
    role: msg.role,
    content: msg.content,
    created_at: msg.createdAt?.toISOString() || new Date().toISOString(), // Use provided timestamp or now
    model_id: modelId, // Include modelId if provided
    // Assuming 'id' from Message type doesn't map directly to Supabase 'id' (which is auto-generated)
    // If you need to store the Vercel message ID, add a column like 'vercel_message_id' TEXT
  }));

  if (messagesToInsert.length === 0) {
    console.log(`No messages to save for chat ${chatId}.`);
    return;
  }

  const { error: insertError } = await supabase
    .from("chat_messages")
    .insert(messagesToInsert);

  if (insertError) {
    console.error(`Error inserting messages for chat ${chatId}:`, insertError);
    throw new Error(`Failed to save messages: ${insertError.message}`);
  }

  console.log(
    `Successfully saved ${messagesToInsert.length} messages for chat ${chatId}`
  );

  // 3. Update chat's updated_at timestamp
  const { error: updateChatError } = await supabase
    .from("chats")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", chatId)
    .eq("user_id", userId);

  if (updateChatError) {
    // Log error but don't necessarily throw, saving messages is more critical
    console.warn(
      `Failed to update chat timestamp for chat ${chatId}:`,
      updateChatError.message
    );
  }
}

export async function getModelIdBySlug(
  modelSlug: string
): Promise<number | null> {
  if (!modelSlug) return null;

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("models")
    .select("id")
    .eq("slug", modelSlug)
    .maybeSingle(); // Use maybeSingle() in case the slug doesn't exist

  if (error) {
    console.error(`Error fetching model ID for slug ${modelSlug}:`, error);
    // Decide if you want to throw or just return null
    // throw new Error(`Failed to fetch model ID: ${error.message}`);
    return null;
  }

  return data?.id ?? null;
}

/**
 * Deletes a chat by its ID.
 *
 * @param chatId - The ID of the chat to delete
 * @returns A promise that resolves when the chat is deleted
 */
export async function deleteChat(chatId: number): Promise<void> {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    // {
    //   process.env.NODE_ENV === "development"
    //     ? console.error("User not authenticated:", userError)
    //     : "";
    // }
    redirect("/login");
  }

  try {
    await deleteChatPersistence(chatId);
    // {
    //   process.env.NODE_ENV === "development"
    //     ? console.log(`Chat ${chatId} deleted successfully`)
    //     : "";
    // }
  } catch (error) {
    // {
    //   process.env.NODE_ENV === "development"
    //     ? console.error(`Error deleting chat ${chatId}:`, error)
    //     : "";
    // }
    throw new Error(`Failed to delete chat: ${(error as Error).message}`);
  }
}

/**
 * Moves a chat to a different folder.
 *
 * @param chatId - The ID of the chat to move
 * @param folderId - The ID of the destination folder (or null to remove from folder)
 * @returns A promise that resolves when the chat is moved
 */
export async function moveChat(
  chatId: number,
  folderId: number | null
): Promise<void> {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    console.error("User not authenticated:", userError);
    redirect("/login");
  }

  try {
    if (folderId === null) {
      // If folderId is null, we need to update the chat directly since our persistence
      // function expects a valid folder ID
      const { error } = await supabase
        .from("chats")
        .update({ folder_id: null })
        .eq("id", chatId)
        .eq("user_id", user.id);

      if (error) {
        throw new Error(error.message);
      }
    } else {
      await moveChatPersistence(chatId, folderId);
    }
    console.log(`Chat ${chatId} moved to folder ${folderId}`);
  } catch (error) {
    console.error(`Error moving chat ${chatId} to folder ${folderId}:`, error);
    throw new Error(`Failed to move chat: ${(error as Error).message}`);
  }
}

/**
 * Renames a chat.
 *
 * @param chatId - The ID of the chat to rename
 * @param newTitle - The new title for the chat
 * @returns A promise that resolves when the chat is renamed
 */
export async function renameChat(
  chatId: number,
  newTitle: string
): Promise<void> {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    console.error("User not authenticated:", userError);
    redirect("/login");
  }

  try {
    await renameChatPersistence(chatId, newTitle);
    console.log(`Chat ${chatId} renamed to "${newTitle}"`);
  } catch (error) {
    console.error(`Error renaming chat ${chatId}:`, error);
    throw new Error(`Failed to rename chat: ${(error as Error).message}`);
  }
}

/**
 * Creates a new folder.
 *
 * @param name - The name of the folder
 * @param type - The type of the folder
 * @returns A promise that resolves to the ID of the created folder
 */
export async function createFolder(
  name: string,
  type: string = "folder"
): Promise<{ id: number }> {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    console.error("User not authenticated:", userError);
    redirect("/login");
  }

  try {
    const result = await createFolderPersistence({
      userId: user.id,
      name,
      type,
    });
    console.log("Folder created:", result);
    // The createFolderPersistence function returns the data from Supabase,
    // but we need to extract the ID for consistency with createChat
    let folderId: number | null = null;

    if (result && typeof result === "object" && "id" in result) {
      folderId = result.id;
    }

    if (!folderId) {
      throw new Error("Failed to create folder: No ID returned");
    }

    console.log(`Folder created with ID: ${folderId}`);
    return { id: folderId };
  } catch (error) {
    console.error(`Error creating folder:`, error);
    throw new Error(`Failed to create folder: ${(error as Error).message}`);
  }
}

/**
 * Deletes a folder and all chats within it.
 *
 * @param folderId - The ID of the folder to delete
 * @returns A promise that resolves when the folder is deleted
 */
export async function deleteFolder(folderId: number): Promise<void> {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    console.error("User not authenticated:", userError);
    redirect("/login");
  }

  try {
    await deleteFolderPersistence(folderId);
    console.log(`Folder ${folderId} and all its chats deleted successfully`);
  } catch (error) {
    console.error(`Error deleting folder ${folderId}:`, error);
    throw new Error(`Failed to delete folder: ${(error as Error).message}`);
  }
}

/**
 * Renames a folder.
 *
 * @param folderId - The ID of the folder to rename
 * @param newName - The new name for the folder
 * @returns A promise that resolves when the folder is renamed
 */
export async function renameFolder(
  folderId: number,
  newName: string
): Promise<void> {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    console.error("User not authenticated:", userError);
    redirect("/login");
  }

  try {
    await renameFolderPersistence(folderId, newName);
    console.log(`Folder ${folderId} renamed to "${newName}"`);
  } catch (error) {
    console.error(`Error renaming folder ${folderId}:`, error);
    throw new Error(`Failed to rename folder: ${(error as Error).message}`);
  }
}

/**
 * Generates a title for a chat based on the first user message using OpenAI.
 * This runs asynchronously and updates the title in the background.
 *
 * @param chatId - The ID of the chat to update
 * @param userMessage - The first message sent by the user
 * @returns A promise that resolves when the operation is complete or fails
 */
export async function generateChatTitle(
  chatId: number,
  userMessage: string
): Promise<void> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      console.error("User not authenticated for title generation:", userError);
      // Don't throw, just return as this is a background task
      return;
    }

    // Ensure OPENAI_API_KEY is available
    if (!process.env.OPENAI_API_KEY) {
      console.error("OPENAI_API_KEY environment variable is not set.");
      return;
    }

    // Call OpenAI API with a specific prompt for title generation
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini", // Use the specified model
        messages: [
          {
            role: "system",
            content:
              "Generate a short, catchy title (max 40 characters) for a chat based on the user's first message. Return only the title text without quotes or additional formatting.",
          },
          {
            role: "user",
            content: userMessage,
          },
        ],
        max_tokens: 30, // Limit response length
        temperature: 0.7, // Adjust creativity
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("OpenAI API error:", response.status, errorData);
      throw new Error(`OpenAI API request failed: ${response.statusText}`);
    }

    const data = await response.json();

    // Check if choices exist and have content
    if (
      !data.choices ||
      data.choices.length === 0 ||
      !data.choices[0].message ||
      !data.choices[0].message.content
    ) {
      console.error("Invalid response structure from OpenAI:", data);
      throw new Error("Failed to parse title from OpenAI response.");
    }

    const generatedTitle = data.choices[0].message.content.trim();

    // Update the chat title in the database
    const { error: updateError } = await supabase
      .from("chats")
      .update({ title: generatedTitle })
      .eq("id", chatId)
      .eq("user_id", user.id); // Ensure user owns the chat

    if (updateError) {
      console.error("Error updating chat title in database:", updateError);
      // Don't throw, just log the error
    } else {
      console.log(`Chat ${chatId} title updated to: "${generatedTitle}"`);
      // Optionally: Trigger a revalidation or notification if needed for real-time sidebar update
      // revalidatePath('/dashboard'); // Example if using Next.js App Router cache invalidation
    }
  } catch (error) {
    console.error("Failed to generate or update chat title:", error);
    // Log the error but don't let it crash the main chat flow
  }
}
