// utils/types/chatTypes.ts
// ──────────────────────────────────────────────────────────────────────────────
// All ids come back from Supabase as number (bigint) – keep them as number
// to avoid “string ⇆ number” casts all over the UI.
// ──────────────────────────────────────────────────────────────────────────────
export interface Folder {
  id: number;
  user_id: string | null;
  name: string;
  type: string;
  created_at: string | null;
  // purely‑client‑side convenience flag
  expanded?: boolean;
}

export interface Chat {
  id: string; // Changed to string for UUID
  user_id: string | null;
  folder_id: number | null; // Folder ID remains number
  title: string;
  model_id: number | null;
  is_comparison: boolean | null;
  compare_columns: number | null;
  synced_inputs: boolean | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface ChatMessage {
  id: number; // Message ID can remain number (auto-increment)
  chat_id: string | null; // Changed to string for UUID
  model_id: number | null;
  user_id: string | null;
  role: string;
  content: string;
  media_url: string | null;
  credits_used: number | null;
  created_at: string | null;
  // Optional field to hold the model name, fetched via JOIN or added from stream data
  modelName?: string;
}
