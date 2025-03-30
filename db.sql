-- =========================
-- 1. Profiles
-- =========================
CREATE TABLE profiles (
  id             uuid PRIMARY KEY REFERENCES auth.users(id),
  full_name      text,
  avatar_url     text,
  credits_balance numeric DEFAULT 0,
  current_plan_id bigint REFERENCES subscription_plans(id),
  created_at     timestamptz DEFAULT now(),
  updated_at     timestamptz DEFAULT now()
);

-- =========================
-- 2. Subscriptions
-- =========================
CREATE TABLE subscription_plans (
  id            bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  plan_name     text UNIQUE,
  monthly_price numeric,
  annual_price  numeric,
  description   text,
  is_active     boolean DEFAULT true,
  created_at    timestamptz DEFAULT now(),
  updated_at    timestamptz DEFAULT now()
);

CREATE TABLE user_subscriptions (
  id         bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id    uuid REFERENCES auth.users(id),
  plan_id    bigint REFERENCES subscription_plans(id),
  start_date date,
  end_date   date,
  is_active  boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE payments (
  id                bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id           uuid REFERENCES auth.users(id),
  amount            numeric,
  currency          text,
  payment_provider  text,  -- e.g. 'stripe', 'razorpay'
  payment_status    text,  -- e.g. 'succeeded', 'failed'
  payment_id        text,  -- external reference
  plan_id           bigint REFERENCES subscription_plans(id),
  credits_purchased numeric,
  created_at        timestamptz DEFAULT now()
);

-- =========================
-- 3. Feature & Model Access
-- =========================
CREATE TABLE features (
  id         bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name       text,
  slug       text UNIQUE,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE feature_access (
  id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  plan_id     bigint REFERENCES subscription_plans(id),
  feature_id  bigint REFERENCES features(id),
  created_at  timestamptz DEFAULT now()
);

CREATE TABLE models (
  id               bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  model_name       text,
  model_type       text,  -- 'llm', 'image_generation', 'video_generation', 'voice_generation', ...
  slug             text UNIQUE,
  description      text,
  credits_per_call numeric DEFAULT 0,
  plan_lock        bigint REFERENCES subscription_plans(id),
  is_active        boolean DEFAULT true,
  created_at       timestamptz DEFAULT now()
);

-- =========================
-- 4. Blogs/Announcements
-- =========================
CREATE TABLE blog_posts (
  id            bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  author_id     uuid REFERENCES auth.users(id),
  title         text,
  slug          text UNIQUE,
  content       text,
  is_published  boolean DEFAULT false,
  published_at  timestamptz,
  created_at    timestamptz DEFAULT now(),
  updated_at    timestamptz DEFAULT now()
);

CREATE TABLE announcements (
  id           bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  title        text,
  content      text,
  active_from  timestamptz,
  active_until timestamptz,
  is_active    boolean DEFAULT true,
  created_at   timestamptz DEFAULT now()
);

-- =========================
-- 5. Chat Folders & Chats
-- =========================
CREATE TABLE chat_folders (
  id         bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id    uuid REFERENCES auth.users(id),
  name       text,
  type       text, -- e.g. 'chat', 'images', 'videos'
  created_at timestamptz DEFAULT now()
);

CREATE TABLE chats (
  id             bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id        uuid REFERENCES auth.users(id),
  folder_id      bigint REFERENCES chat_folders(id),
  title          text,
  model_id       bigint REFERENCES models(id),
  is_comparison  boolean DEFAULT false,
  compare_columns smallint DEFAULT 2,
  synced_inputs  boolean DEFAULT false,
  created_at     timestamptz DEFAULT now(),
  updated_at     timestamptz DEFAULT now()
);

CREATE TABLE chat_messages (
  id           bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  chat_id      bigint REFERENCES chats(id),
  model_id     bigint REFERENCES models(id),
  user_id      uuid REFERENCES auth.users(id),
  role         text, -- e.g. 'user', 'assistant'
  content      text,
  media_url    text,
  credits_used numeric DEFAULT 0,
  created_at   timestamptz DEFAULT now()
);

-- =========================
-- 6. Writer Mode Templates
-- =========================
CREATE TABLE writer_templates (
  id              bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  template_title  text,
  prompt_text     text,
  description     text,
  created_at      timestamptz DEFAULT now()
);

-- =========================
-- 7. Voice Generations
-- =========================
CREATE TABLE voice_generations (
  id            bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id       uuid REFERENCES auth.users(id),
  model_id      bigint REFERENCES models(id),
  text_input    text,
  audio_url     text,
  credits_used  numeric DEFAULT 0,
  created_at    timestamptz DEFAULT now()
);

-- =========================
-- 8. (Optional) Media Assets
-- =========================
CREATE TABLE media_assets (
  id           bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id      uuid REFERENCES auth.users(id),
  file_name    text,
  file_url     text,
  asset_type   text,  -- 'image', 'video'
  model_id     bigint REFERENCES models(id),
  credits_used numeric DEFAULT 0,
  created_at   timestamptz DEFAULT now()
);
