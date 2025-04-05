-- Migration for Row-Level Security (RLS) policies
-- This ensures users can only access their own data
-- =========================
-- Enable RLS on all tables
-- =========================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;

ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

ALTER TABLE chat_folders ENABLE ROW LEVEL SECURITY;

ALTER TABLE chats ENABLE ROW LEVEL SECURITY;

ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

ALTER TABLE comparison_responses ENABLE ROW LEVEL SECURITY;

ALTER TABLE media_assets ENABLE ROW LEVEL SECURITY;

-- Public tables (no RLS needed)
-- subscription_plans, features, feature_access, models, writer_templates
-- Blog posts and announcements (admin access only)
ALTER TABLE blog_posts ENABLE ROW LEVEL SECURITY;

ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;

-- =========================
-- Create policies
-- =========================
-- Profiles: Users can only read/update their own profile
CREATE POLICY "Users can view own profile" ON profiles FOR
SELECT
    USING (auth.uid () = id);

CREATE POLICY "Users can update own profile" ON profiles FOR
UPDATE USING (auth.uid () = id);

-- User Settings: Users can only read/update their own settings
CREATE POLICY "Users can view own settings" ON user_settings FOR
SELECT
    USING (auth.uid () = user_id);

CREATE POLICY "Users can update own settings" ON user_settings FOR
UPDATE USING (auth.uid () = user_id);

CREATE POLICY "Users can insert own settings" ON user_settings FOR INSERT
WITH
    CHECK (auth.uid () = user_id);

-- User Subscriptions: Users can only view their own subscriptions
CREATE POLICY "Users can view own subscriptions" ON user_subscriptions FOR
SELECT
    USING (auth.uid () = user_id);

-- Payments: Users can only view their own payments
CREATE POLICY "Users can view own payments" ON payments FOR
SELECT
    USING (auth.uid () = user_id);

-- Chat Folders: Users can only access their own folders
CREATE POLICY "Users can view own chat folders" ON chat_folders FOR
SELECT
    USING (auth.uid () = user_id);

CREATE POLICY "Users can insert own chat folders" ON chat_folders FOR INSERT
WITH
    CHECK (auth.uid () = user_id);

CREATE POLICY "Users can update own chat folders" ON chat_folders FOR
UPDATE USING (auth.uid () = user_id);

CREATE POLICY "Users can delete own chat folders" ON chat_folders FOR DELETE USING (auth.uid () = user_id);

-- Chats: Users can only access their own chats
CREATE POLICY "Users can view own chats" ON chats FOR
SELECT
    USING (auth.uid () = user_id);

CREATE POLICY "Users can insert own chats" ON chats FOR INSERT
WITH
    CHECK (auth.uid () = user_id);

CREATE POLICY "Users can update own chats" ON chats FOR
UPDATE USING (auth.uid () = user_id);

CREATE POLICY "Users can delete own chats" ON chats FOR DELETE USING (auth.uid () = user_id);

-- Chat Messages: Users can only access messages from their own chats
CREATE POLICY "Users can view own chat messages" ON chat_messages FOR
SELECT
    USING (auth.uid () = user_id);

CREATE POLICY "Users can insert own chat messages" ON chat_messages FOR INSERT
WITH
    CHECK (auth.uid () = user_id);

-- Comparison Responses: Users can view responses linked to their messages
CREATE POLICY "Users can view own comparison responses" ON comparison_responses FOR
SELECT
    USING (
        EXISTS (
            SELECT
                1
            FROM
                chat_messages
            WHERE
                chat_messages.id = comparison_responses.message_id
                AND chat_messages.user_id = auth.uid ()
        )
    );

-- Media Assets: Users can only access their own media
CREATE POLICY "Users can view own media assets" ON media_assets FOR
SELECT
    USING (auth.uid () = user_id);

CREATE POLICY "Users can insert own media assets" ON media_assets FOR INSERT
WITH
    CHECK (auth.uid () = user_id);

-- Blog Posts: Only authenticated users can view published posts
CREATE POLICY "Anyone can view published blog posts" ON blog_posts FOR
SELECT
    USING (is_published = true);

-- Announcements: Anyone can view active announcements
CREATE POLICY "Anyone can view active announcements" ON announcements FOR
SELECT
    USING (
        is_active = true
        AND active_from <= now ()
        AND (
            active_until IS NULL
            OR active_until >= now ()
        )
    );

-- =========================
-- Create admin role for content management
-- =========================
-- Create admin role
CREATE ROLE admin;

-- Grant admin access to blog posts and announcements
CREATE POLICY "Admins can manage blog posts" ON blog_posts USING ((auth.jwt () ->> 'role') = 'admin');

CREATE POLICY "Admins can manage announcements" ON announcements USING ((auth.jwt () ->> 'role') = 'admin');