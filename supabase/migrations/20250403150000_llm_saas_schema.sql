-- Migration for LLM SaaS Schema v1
-- Preserves existing 'name' column and syncs timestamps
-- =========================
-- 1. Update Profiles Table
-- =========================
ALTER TABLE profiles
ADD COLUMN avatar_url text,
ADD COLUMN credits_balance numeric DEFAULT 0,
ADD COLUMN current_plan_id bigint,
ADD COLUMN updated_at timestamptz DEFAULT now ();

-- Add foreign key constraint after subscription_plans table is created
-- (Will be added later in this migration)
-- =========================
-- 2. Subscription Tables
-- =========================
CREATE TABLE
  subscription_plans (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    plan_name text UNIQUE NOT NULL,
    monthly_price numeric(12, 2),
    annual_price numeric(12, 2),
    description text,
    is_active boolean DEFAULT true,
    created_at timestamptz DEFAULT now (),
    updated_at timestamptz DEFAULT now ()
  );

CREATE TABLE
  user_subscriptions (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id uuid REFERENCES auth.users (id),
    plan_id bigint REFERENCES subscription_plans (id),
    start_date timestamptz DEFAULT now (),
    end_date timestamptz,
    is_active boolean DEFAULT true,
    created_at timestamptz DEFAULT now ()
  );

-- =========================
-- 3. Payments (with improvements)
-- =========================
CREATE TABLE
  payments (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id uuid REFERENCES auth.users (id),
    amount numeric(12, 2) NOT NULL,
    currency text DEFAULT 'INR',
    payment_provider text NOT NULL,
    payment_status text NOT NULL,
    payment_id text UNIQUE,
    plan_id bigint REFERENCES subscription_plans (id),
    credits_purchased numeric(12, 2),
    provider_event_id text,
    receipt_url text,
    created_at timestamptz DEFAULT now ()
  );

-- =========================
-- 4. Feature & Model Access
-- =========================
CREATE TABLE
  features (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name text NOT NULL,
    slug text UNIQUE NOT NULL,
    created_at timestamptz DEFAULT now ()
  );

CREATE TABLE
  feature_access (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    plan_id bigint REFERENCES subscription_plans (id),
    feature_id bigint REFERENCES features (id),
    created_at timestamptz DEFAULT now ()
  );

CREATE TABLE
  models (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    model_name text NOT NULL,
    model_type text NOT NULL,
    slug text UNIQUE NOT NULL,
    description text,
    credits_per_call numeric(12, 2) DEFAULT 0,
    plan_lock bigint REFERENCES subscription_plans (id),
    is_active boolean DEFAULT true,
    created_at timestamptz DEFAULT now ()
  );

-- =========================
-- 5. Content Management
-- =========================
CREATE TABLE
  blog_posts (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    author_id uuid REFERENCES auth.users (id),
    title text NOT NULL,
    slug text UNIQUE NOT NULL,
    content text NOT NULL,
    is_published boolean DEFAULT false,
    published_at timestamptz,
    created_at timestamptz DEFAULT now (),
    updated_at timestamptz DEFAULT now ()
  );

CREATE TABLE
  announcements (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    title text NOT NULL,
    content text NOT NULL,
    active_from timestamptz DEFAULT now (),
    active_until timestamptz,
    is_active boolean DEFAULT true,
    created_at timestamptz DEFAULT now ()
  );

-- =========================
-- 6. Chat System
-- =========================
CREATE TABLE
  chat_folders (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id uuid REFERENCES auth.users (id),
    name text NOT NULL,
    type text NOT NULL,
    created_at timestamptz DEFAULT now ()
  );

CREATE TABLE
  chats (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id uuid REFERENCES auth.users (id),
    folder_id bigint REFERENCES chat_folders (id),
    title text NOT NULL,
    model_id bigint REFERENCES models (id),
    is_comparison boolean DEFAULT false,
    compare_columns smallint DEFAULT 2,
    synced_inputs boolean DEFAULT false,
    created_at timestamptz DEFAULT now (),
    updated_at timestamptz DEFAULT now ()
  );

CREATE TABLE
  chat_messages (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    chat_id bigint REFERENCES chats (id),
    model_id bigint REFERENCES models (id),
    user_id uuid REFERENCES auth.users (id),
    role text NOT NULL,
    content text NOT NULL,
    media_url text,
    credits_used numeric(12, 2) DEFAULT 0,
    created_at timestamptz DEFAULT now ()
  );

-- =========================
-- 7. Comparison System
-- =========================
CREATE TABLE
  comparison_responses (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    message_id bigint NOT NULL REFERENCES chat_messages (id),
    model_id bigint NOT NULL REFERENCES models (id),
    content text NOT NULL,
    created_at timestamptz DEFAULT now ()
  );

-- =========================
-- 8. User Preferences
-- =========================
CREATE TABLE
  user_settings (
    user_id uuid PRIMARY KEY REFERENCES auth.users (id),
    language text DEFAULT 'en',
    theme text DEFAULT 'light',
    notifications boolean DEFAULT true,
    tutorial_completed boolean DEFAULT false,
    created_at timestamptz DEFAULT now (),
    updated_at timestamptz DEFAULT now ()
  );

-- =========================
-- 9. Media System
-- =========================
CREATE TABLE
  media_assets (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id uuid REFERENCES auth.users (id),
    file_name text NOT NULL,
    file_url text NOT NULL,
    asset_type text NOT NULL,
    model_id bigint REFERENCES models (id),
    chat_id bigint REFERENCES chats (id),
    is_user_uploaded boolean DEFAULT false,
    credits_used numeric(12, 2) DEFAULT 0,
    created_at timestamptz DEFAULT now ()
  );

-- =========================
-- 10. Indexes and Constraints
-- =========================
-- Add foreign key constraint for profiles.current_plan_id
ALTER TABLE profiles ADD CONSTRAINT fk_current_plan FOREIGN KEY (current_plan_id) REFERENCES subscription_plans (id);

-- Add check constraints for data validation
ALTER TABLE chats ADD CONSTRAINT valid_compare_columns CHECK (compare_columns BETWEEN 2 AND 4);

ALTER TABLE media_assets ADD CONSTRAINT valid_asset_type CHECK (asset_type IN ('image', 'video', 'audio'));

-- Add cascade deletion for related records
ALTER TABLE comparison_responses
DROP CONSTRAINT comparison_responses_message_id_fkey,
ADD CONSTRAINT fk_message_id FOREIGN KEY (message_id) REFERENCES chat_messages (id) ON DELETE CASCADE;

-- Add additional useful indexes
CREATE INDEX idx_chat_messages_credits ON chat_messages (user_id, created_at);

CREATE INDEX idx_voice_generations_user ON media_assets (user_id);

CREATE INDEX idx_user_subs_active ON user_subscriptions (user_id, is_active);

CREATE INDEX idx_chats_user_id ON chats (user_id);

CREATE INDEX idx_chat_folders_user_id ON chat_folders (user_id);