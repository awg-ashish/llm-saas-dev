-- Migration to modify foreign key constraints in chat_messages table

BEGIN;

-- Drop existing foreign key constraints
ALTER TABLE public.chat_messages
    DROP CONSTRAINT chat_messages_chat_id_fkey,
    DROP CONSTRAINT chat_messages_user_id_fkey;

-- Add foreign key constraints with ON DELETE CASCADE
ALTER TABLE public.chat_messages
    ADD CONSTRAINT chat_messages_chat_id_fkey
    FOREIGN KEY (chat_id) REFERENCES chats (id) ON DELETE CASCADE,
    ADD CONSTRAINT chat_messages_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES auth.users (id) ON DELETE CASCADE;

COMMIT;