-- Migration script to change chats.id and related foreign keys to UUID (Revised 3)

-- Temporarily disable RLS for the tables to allow schema changes
ALTER TABLE public.media_assets DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.chats DISABLE ROW LEVEL SECURITY;

BEGIN; -- Start transaction

-- 1. Drop the foreign key constraint on media_assets referencing chats
--    (Ensure 'media_assets_chat_id_fkey' is your actual constraint name)
ALTER TABLE public.media_assets
DROP CONSTRAINT IF EXISTS media_assets_chat_id_fkey;

-- 2. Drop the foreign key constraint on chat_messages referencing chats
--    (Ensure 'chat_messages_chat_id_fkey' is your actual constraint name)
ALTER TABLE public.chat_messages
DROP CONSTRAINT IF EXISTS chat_messages_chat_id_fkey;

-- 3. Drop the existing primary key constraint on chats
--    (Ensure 'chats_pkey' is your actual constraint name)
ALTER TABLE public.chats
DROP CONSTRAINT IF EXISTS chats_pkey;

-- 4. Drop the IDENTITY property from chats.id
ALTER TABLE public.chats
ALTER COLUMN id DROP IDENTITY IF EXISTS; -- Use IF EXISTS for safety

-- 5. Change the id column type in chats to UUID
--    USING clause assigns random UUIDs to existing rows. Review if this is desired.
ALTER TABLE public.chats
ALTER COLUMN id TYPE UUID USING (gen_random_uuid());

-- 6. Change the chat_id column type in chat_messages to UUID
--    USING clause assigns random UUIDs to existing rows. Review if this is desired.
ALTER TABLE public.chat_messages
ALTER COLUMN chat_id TYPE UUID USING (gen_random_uuid());

-- 7. Change the chat_id column type in media_assets to UUID
--    USING clause assigns random UUIDs to existing rows. Review if this is desired.
--    (Assuming the column name is 'chat_id'. Adjust if different)
ALTER TABLE public.media_assets
ALTER COLUMN chat_id TYPE UUID USING (gen_random_uuid());

-- 8. Re-establish id as the primary key for chats
ALTER TABLE public.chats
ADD CONSTRAINT chats_pkey PRIMARY KEY (id);

-- 9. Re-add the foreign key constraint on chat_messages
ALTER TABLE public.chat_messages
ADD CONSTRAINT chat_messages_chat_id_fkey
FOREIGN KEY (chat_id) REFERENCES public.chats(id) ON DELETE CASCADE; -- Ensure ON DELETE CASCADE is desired

-- 10. Re-add the foreign key constraint on media_assets
--    (Assuming the column name is 'chat_id'. Adjust if different)
ALTER TABLE public.media_assets
ADD CONSTRAINT media_assets_chat_id_fkey
FOREIGN KEY (chat_id) REFERENCES public.chats(id) ON DELETE SET NULL; -- Or ON DELETE CASCADE, depending on desired behavior

COMMIT; -- Commit transaction

-- Re-enable RLS for the tables
ALTER TABLE public.media_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chats ENABLE ROW LEVEL SECURITY;

-- Optional: Force RLS check for existing sessions (might be needed)
-- NOTIFY pgrst, 'reload schema';