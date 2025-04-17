// Import the server client instead of the browser client
import { createClient } from "./server";

/**
 * Inserts a new chat into the "chats" table.
 *
 * @param params - Object containing chat properties.
 * @returns The created chat record.
 * @throws Error if the insertion fails.
 */
export async function createChat({
  userId,
  folderId,
  title,
  modelId,
  isComparison,
  compareColumns,
  syncedInputs,
}: {
  userId: string;
  folderId?: number;
  title: string;
  modelId?: number;
  isComparison?: boolean;
  compareColumns?: number;
  syncedInputs?: boolean;
}) {
  const supabase = await createClient();

  const { data, error } = await supabase.from("chats").insert([
    {
      user_id: userId,
      folder_id: folderId,
      title,
      model_id: modelId,
      is_comparison: isComparison,
      compare_columns: compareColumns,
      synced_inputs: syncedInputs,
    },
  ]);

  if (error) {
    throw new Error(`createChat error: ${error.message}`);
  }
  return data;
}

/**
 * Deletes a chat by its id.
 *
 * @param chatId - The id of the chat to delete.
 * @returns The deleted chat record.
 * @throws Error if the deletion fails.
 */
export async function deleteChat(chatId: string) {
  // Changed to string
  const supabase = await createClient();

  // Then, delete the chat itself
  const { data, error } = await supabase
    .from("chats")
    .delete()
    .eq("id", chatId);

  if (error) {
    throw new Error(`deleteChat error: ${error.message}`);
  }

  return data;
}

/**
 * Moves a chat to a different folder by updating its folder_id.
 *
 * @param chatId - The id of the chat.
 * @param folderId - The new folder id to move the chat to.
 * @returns The updated chat record.
 * @throws Error if the update fails.
 */
export async function moveChat(chatId: string, folderId: number) {
  // Changed to string
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("chats")
    .update({ folder_id: folderId })
    .eq("id", chatId);

  if (error) {
    throw new Error(`moveChat error: ${error.message}`);
  }
  return data;
}

/**
 * Renames a chat by updating its title.
 *
 * @param chatId - The id of the chat.
 * @param newTitle - The new title for the chat.
 * @returns The updated chat record.
 * @throws Error if the update fails.
 */
export async function renameChat(chatId: string, newTitle: string) {
  // Changed to string
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("chats")
    .update({ title: newTitle })
    .eq("id", chatId);

  if (error) {
    throw new Error(`renameChat error: ${error.message}`);
  }
  return data;
}

/**
 * Inserts a new folder into the "chat_folders" table.
 *
 * @param params - Object containing folder properties.
 * @returns The created folder record.
 * @throws Error if the insertion fails.
 */
export async function createFolder({
  userId,
  name,
  type,
}: {
  userId: string;
  name: string;
  type: string;
}) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("chat_folders")
    .insert([{ user_id: userId, name, type }])
    .select()
    .single();
  console.log("[supabase/chatPersistence]: ", data);

  if (error) {
    throw new Error(`createFolder error: ${error.message}`);
  }
  return data;
}

/**
 * Deletes a folder and all associated chats.
 *
 * @param folderId - The id of the folder to delete.
 * @returns An object containing the deleted chats and folder data.
 * @throws Error if deletion of chats or folder fails.
 */
export async function deleteFolder(folderId: number) {
  const supabase = await createClient();

  // Delete all chats under the folder
  const { data: chatsData, error: chatsError } = await supabase
    .from("chats")
    .delete()
    .eq("folder_id", folderId);

  if (chatsError) {
    throw new Error(`deleteFolder (chats) error: ${chatsError.message}`);
  }

  // Delete the folder itself
  const { data: folderData, error: folderError } = await supabase
    .from("chat_folders")
    .delete()
    .eq("id", folderId);

  if (folderError) {
    throw new Error(`deleteFolder (folder) error: ${folderError.message}`);
  }

  return { chatsData, folderData };
}

/**
 * Renames a folder by updating its name.
 *
 * @param folderId - The id of the folder.
 * @param newName - The new name for the folder.
 * @returns The updated folder record.
 * @throws Error if the update fails.
 */
export async function renameFolder(folderId: number, newName: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("chat_folders")
    .update({ name: newName })
    .eq("id", folderId);

  if (error) {
    throw new Error(`renameFolder error: ${error.message}`);
  }
  return data;
}

/**
 * Appends a new message to a chat.
 *
 * @param chatId - The ID of the chat
 * @param message - The message to append
 * @param userId - The user ID
 * @param modelId - Optional model ID
 * @returns The created message record
 */
export async function appendChatMessage(
  chatId: string, // Changed to string
  message: {
    role: string;
    content: string;
    createdAt?: Date;
  },
  userId: string,
  modelId?: number
) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("chat_messages")
    .insert({
      chat_id: chatId,
      user_id: userId,
      role: message.role,
      content: message.content,
      created_at: message.createdAt?.toISOString() || new Date().toISOString(),
      model_id: modelId,
    })
    .select();

  if (error) {
    throw new Error(`appendChatMessage error: ${error.message}`);
  }

  // Update chat's updated_at timestamp
  await supabase
    .from("chats")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", chatId)
    .eq("user_id", userId);

  return data;
}
