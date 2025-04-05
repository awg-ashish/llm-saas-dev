// dashboard/actions.ts
"use server";

import { createClient } from "@/utils/supabase/client";
import { Chat, ChatMessage, Folder } from "@/utils/types/chatTypes";

// ──────────────────────────────────────────────────────────────────────────────
// Return‑type helpers
// ──────────────────────────────────────────────────────────────────────────────
type Ok<T> = T;
type Fail = { error: string };
type BoolResult = { success: boolean; error?: string };

// ──────────────────────────────────────────────────────────────────────────────
// FOLDERS
// ──────────────────────────────────────────────────────────────────────────────
export async function createFolder(
  name: string
): Promise<Folder | { error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "User not authenticated" };

  const { data, error } = await supabase
    .from("chat_folders")
    .insert({ name, user_id: user.id, type: "user_created" })
    .select()
    .single();

  return error ? { error: error.message } : (data as Folder);
}

export async function renameFolder(
  folderId: number,
  newName: string
): Promise<BoolResult> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("chat_folders")
    .update({ name: newName })
    .eq("id", folderId);
  return error ? { success: false, error: error.message } : { success: true };
}

export async function deleteFolder(folderId: number): Promise<BoolResult> {
  const supabase = createClient();

  // grab chats in that folder
  const { data: chats, error: chatsErr } = await supabase
    .from("chats")
    .select("id")
    .eq("folder_id", folderId);

  if (chatsErr) return { success: false, error: chatsErr.message };

  if (chats.length) {
    const chatIds = chats.map((c) => c.id);

    // delete messages for those chats
    const { error: msgErr } = await supabase
      .from("chat_messages")
      .delete()
      .in("chat_id", chatIds);
    if (msgErr) return { success: false, error: msgErr.message };

    // delete chats
    const { error: delChatsErr } = await supabase
      .from("chats")
      .delete()
      .in("id", chatIds);
    if (delChatsErr) return { success: false, error: delChatsErr.message };
  }

  // finally delete folder
  const { error } = await supabase
    .from("chat_folders")
    .delete()
    .eq("id", folderId);

  return error ? { success: false, error: error.message } : { success: true };
}

// ──────────────────────────────────────────────────────────────────────────────
// CHATS
// ──────────────────────────────────────────────────────────────────────────────
export async function createChat(
  title: string,
  folderId?: number | null
): Promise<Ok<Chat> | Fail> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "User not authenticated" };

  const { data, error } = await supabase
    .from("chats")
    .insert({ title, user_id: user.id, folder_id: folderId ?? null })
    .select()
    .single();

  return error ? { error: error.message } : (data as Chat);
}

export async function renameChat(
  chatId: number,
  newTitle: string
): Promise<BoolResult> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("chats")
    .update({ title: newTitle })
    .eq("id", chatId);

  return error ? { success: false, error: error.message } : { success: true };
}

export async function moveChat(
  chatId: number,
  folderId: number | null
): Promise<BoolResult> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("chats")
    .update({ folder_id: folderId })
    .eq("id", chatId);

  return error ? { success: false, error: error.message } : { success: true };
}

export async function deleteChat(chatId: number): Promise<BoolResult> {
  const supabase = await createClient();

  const { error: msgErr } = await supabase
    .from("chat_messages")
    .delete()
    .eq("chat_id", chatId);
  if (msgErr) return { success: false, error: msgErr.message };

  const { error } = await supabase.from("chats").delete().eq("id", chatId);

  return error ? { success: false, error: error.message } : { success: true };
}

// ──────────────────────────────────────────────────────────────────────────────
// MESSAGES
// ──────────────────────────────────────────────────────────────────────────────
export async function createChatMessage(
  chatId: number,
  role: string,
  content: string,
  modelId?: number,
  mediaUrl?: string,
  creditsUsed: number = 0
): Promise<Ok<ChatMessage> | Fail> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "User not authenticated" };

  const { data, error } = await supabase
    .from("chat_messages")
    .insert({
      chat_id: chatId,
      user_id: user.id,
      role,
      content,
      model_id: modelId ?? null,
      media_url: mediaUrl ?? null,
      credits_used: creditsUsed,
    })
    .select()
    .single();

  return error ? { error: error.message } : (data as ChatMessage);
}

export async function getChatMessages(
  chatId: number
): Promise<Ok<ChatMessage[]> | Fail> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("chat_messages")
    .select("*")
    .eq("chat_id", chatId)
    .order("created_at", { ascending: true });

  return error ? { error: error.message } : (data as ChatMessage[]);
}

// ──────────────────────────────────────────────────────────────────────────────
// INITIAL LOAD
// ──────────────────────────────────────────────────────────────────────────────
export type InitialData =
  | { ok: true; folders: Folder[]; chats: Chat[] }
  | { ok: false; error: string };

export async function getInitialChatData(): Promise<InitialData> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  console.log(user);
  if (!user && process.env.NODE_ENV !== "development")
    return { ok: false, error: "User not authenticated" };

  const { data: folders, error: foldersErr } = await supabase
    .from("chat_folders")
    .select("*")
    .eq("user_id", user?.id)
    .order("created_at", { ascending: true });

  if (foldersErr) return { ok: false, error: foldersErr.message };

  const { data: chats, error: chatsErr } = await supabase
    .from("chats")
    .select("*")
    .eq("user_id", user?.id)
    .order("updated_at", { ascending: false });

  if (chatsErr) return { ok: false, error: chatsErr.message };

  return { ok: true, folders: folders as Folder[], chats: chats as Chat[] };
}
