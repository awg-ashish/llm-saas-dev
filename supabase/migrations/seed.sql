-- Seed data for LLM SaaS application
-- Run this after migrations to populate the database with initial data

-- =========================
-- 1. Subscription Plans
-- =========================
INSERT INTO subscription_plans (plan_name, monthly_price, annual_price, description, is_active)
VALUES
  ('Free', 0, 0, 'Free tier with limited access to models and features', true),
  ('Starter', 499, 4999, 'Access to most models and features with reasonable usage limits', true),
  ('Pro', 999, 9999, 'Full access to all models and features with high usage limits', true);

-- =========================
-- 2. Features
-- =========================
INSERT INTO features (name, slug)
VALUES
  ('Chat with LLMs', 'chat-llm'),
  ('Generate Images', 'generate-images'),
  ('Generate Videos', 'generate-videos'),
  ('Generate Voice', 'generate-voice'),
  ('Compare Models', 'compare-models'),
  ('Writer Mode', 'writer-mode'),
  ('File Upload', 'file-upload'),
  ('Web Search', 'web-search');

-- =========================
-- 3. Feature Access
-- =========================
-- Get plan IDs
DO $$
DECLARE
  free_plan_id bigint;
  starter_plan_id bigint;
  pro_plan_id bigint;
BEGIN
  SELECT id INTO free_plan_id FROM subscription_plans WHERE plan_name = 'Free';
  SELECT id INTO starter_plan_id FROM subscription_plans WHERE plan_name = 'Starter';
  SELECT id INTO pro_plan_id FROM subscription_plans WHERE plan_name = 'Pro';

  -- Free plan features
  INSERT INTO feature_access (plan_id, feature_id)
  SELECT free_plan_id, id FROM features WHERE slug IN ('chat-llm');

  -- Starter plan features
  INSERT INTO feature_access (plan_id, feature_id)
  SELECT starter_plan_id, id FROM features WHERE slug IN (
    'chat-llm', 'generate-images', 'generate-voice', 'compare-models'
  );

  -- Pro plan features
  INSERT INTO feature_access (plan_id, feature_id)
  SELECT pro_plan_id, id FROM features;
END $$;

-- =========================
-- 4. Models
-- =========================
-- Get plan IDs
DO $$
DECLARE
  free_plan_id bigint;
  starter_plan_id bigint;
  pro_plan_id bigint;
BEGIN
  SELECT id INTO free_plan_id FROM subscription_plans WHERE plan_name = 'Free';
  SELECT id INTO starter_plan_id FROM subscription_plans WHERE plan_name = 'Starter';
  SELECT id INTO pro_plan_id FROM subscription_plans WHERE plan_name = 'Pro';

  -- LLM Models
  INSERT INTO models (model_name, model_type, slug, description, credits_per_call, plan_lock, is_active)
  VALUES
    ('GPT-3.5 Turbo', 'llm', 'gpt-3.5-turbo', 'Fast and efficient language model for most tasks', 1, free_plan_id, true),
    ('GPT-4o', 'llm', 'gpt-4o', 'Advanced language model with strong reasoning capabilities', 5, starter_plan_id, true),
    ('Claude 3 Opus', 'llm', 'claude-3-opus', 'Anthropic''s most powerful model with exceptional reasoning', 10, pro_plan_id, true),
    ('Gemini Pro', 'llm', 'gemini-pro', 'Google''s advanced language model', 5, starter_plan_id, true),
    ('LM Studio Local', 'llm', 'lmstudio-local', 'Run models locally through LM Studio', 0, free_plan_id, true);

  -- Image Generation Models
  INSERT INTO models (model_name, model_type, slug, description, credits_per_call, plan_lock, is_active)
  VALUES
    ('DALL-E 3', 'image_generation', 'dall-e-3', 'OpenAI''s advanced image generation model', 10, starter_plan_id, true),
    ('Midjourney', 'image_generation', 'midjourney', 'High-quality artistic image generation', 15, starter_plan_id, true),
    ('Stable Diffusion XL', 'image_generation', 'stable-diffusion-xl', 'Open source image generation model', 8, starter_plan_id, true);

  -- Video Generation Models
  INSERT INTO models (model_name, model_type, slug, description, credits_per_call, plan_lock, is_active)
  VALUES
    ('Sora', 'video_generation', 'sora', 'OpenAI''s text-to-video model', 50, pro_plan_id, true),
    ('Runway Gen-2', 'video_generation', 'runway-gen2', 'Advanced video generation and editing', 40, pro_plan_id, true);

  -- Voice Generation Models
  INSERT INTO models (model_name, model_type, slug, description, credits_per_call, plan_lock, is_active)
  VALUES
    ('ElevenLabs', 'voice_generation', 'elevenlabs', 'High-quality voice synthesis', 5, starter_plan_id, true),
    ('OpenAI TTS', 'voice_generation', 'openai-tts', 'OpenAI''s text-to-speech model', 3, starter_plan_id, true);
END $$;

-- =========================
-- 5. Writer Templates
-- =========================
INSERT INTO writer_templates (template_title, prompt_text, description)
VALUES
  ('Diwali Greeting', 'Write a warm and festive Diwali greeting message...', 'Create personalized Diwali greetings'),
  ('Birthday Message', 'Write a heartfelt birthday message...', 'Create personalized birthday messages'),
  ('Facebook Ad', 'Create a compelling Facebook ad...', 'Generate effective Facebook ad copy'),
  ('Tweet Thread', 'Create a Twitter/X thread about...', 'Generate engaging tweet threads'),
  ('LinkedIn Post', 'Write a professional LinkedIn post...', 'Create professional LinkedIn content'),
  ('Product Description', 'Write a detailed product description...', 'Generate compelling product descriptions'),
  ('Email Newsletter', 'Create an email newsletter...', 'Create engaging email newsletters'),
  ('Blog Introduction', 'Write an engaging introduction...', 'Generate captivating blog introductions');

-- =========================
-- 6. Auth Users
-- =========================
INSERT INTO "auth"."users" (
  "id", "aud", "role", "email",
  "encrypted_password", "raw_app_meta_data", "raw_user_meta_data"
) VALUES 
  ('0a94751f-7de6-4116-8f50-22ccae591608', 'authenticated', 'authenticated', 'ashish.blackhawk@gmail.com', null,
   '{"provider":"google","providers":["google"]}',
   '{"name":"Ashish Anand","avatar_url":"https://lh3.googleusercontent.com/..."}'),
  
  ('0f42871a-1212-4761-b858-fcd53277ad98', 'authenticated', 'authenticated', 'admin@theultimatedevacademy.com', null,
   '{"provider":"google","providers":["google"]}',
   '{"name":"The Ultimate Dev Academy"}'),
  
  ('1211a9aa-30f6-4e68-a1f7-a499ef0d8213', 'authenticated', 'authenticated', 'eswar.creator96@gmail.com', null,
   '{"provider":"google","providers":["google"]}',
   '{"name":"Creative Mode"}'),
  
  ('c139555f-e76e-4ffe-a9eb-6ced80807bad', 'authenticated', 'authenticated', 'vapefif988@amgens.com',
   '$2a$10$nfXCgROCWwTSSdIY.w2IQ.Eacco/ZEC5.coc32b7O3qbl2jxQNBda',
   '{"provider":"email","providers":["email"]}',
   '{"name":"Test User"}'),
  
  ('ff33900b-0d4d-429c-ace6-17801a1553d0', 'authenticated', 'authenticated', 'anotherwebguyofficial@gmail.com', null,
   '{"provider":"google","providers":["google"]}',
   '{"name":"Ashish Anand"}');

-- =========================
-- 7. User Profiles
-- =========================

