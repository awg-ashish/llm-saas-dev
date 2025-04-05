-- Migration for database triggers
-- These triggers automate business logic in the database

-- =========================
-- 1. Update credits when payment is made
-- =========================
CREATE OR REPLACE FUNCTION update_credits_on_payment()
RETURNS TRIGGER AS $$
BEGIN
  -- Only update credits for successful payments
  IF NEW.payment_status = 'succeeded' AND NEW.credits_purchased > 0 THEN
    UPDATE profiles
    SET credits_balance = credits_balance + NEW.credits_purchased
    WHERE id = NEW.user_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_credits_on_payment
AFTER INSERT ON payments
FOR EACH ROW
EXECUTE FUNCTION update_credits_on_payment();

-- =========================
-- 2. Update current plan when subscription changes
-- =========================
CREATE OR REPLACE FUNCTION update_current_plan()
RETURNS TRIGGER AS $$
BEGIN
  -- If a new subscription is created or an existing one is updated to active
  IF NEW.is_active = true THEN
    -- Deactivate any other active subscriptions for this user
    UPDATE user_subscriptions
    SET is_active = false
    WHERE user_id = NEW.user_id 
      AND id != NEW.id 
      AND is_active = true;
    
    -- Update the user's current plan
    UPDATE profiles
    SET current_plan_id = NEW.plan_id
    WHERE id = NEW.user_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_current_plan
AFTER INSERT OR UPDATE OF is_active ON user_subscriptions
FOR EACH ROW
EXECUTE FUNCTION update_current_plan();

-- =========================
-- 3. Create default folders for new users
-- =========================
CREATE OR REPLACE FUNCTION create_default_folders()
RETURNS TRIGGER AS $$
BEGIN
  -- Create default folders for the new user
  INSERT INTO chat_folders (user_id, name, type)
  VALUES 
    (NEW.id, 'General', 'chat'),
    (NEW.id, 'Images', 'images'),
    (NEW.id, 'Videos', 'videos');
  
  -- Create default user settings
  INSERT INTO user_settings (user_id)
  VALUES (NEW.id);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_create_default_folders
AFTER INSERT ON profiles
FOR EACH ROW
EXECUTE FUNCTION create_default_folders();

-- =========================
-- 4. Auto-update timestamps
-- =========================
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply the timestamp trigger to all tables with updated_at
CREATE TRIGGER trigger_update_profiles_timestamp
BEFORE UPDATE ON profiles
FOR EACH ROW
EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER trigger_update_subscription_plans_timestamp
BEFORE UPDATE ON subscription_plans
FOR EACH ROW
EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER trigger_update_chats_timestamp
BEFORE UPDATE ON chats
FOR EACH ROW
EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER trigger_update_blog_posts_timestamp
BEFORE UPDATE ON blog_posts
FOR EACH ROW
EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER trigger_update_user_settings_timestamp
BEFORE UPDATE ON user_settings
FOR EACH ROW
EXECUTE FUNCTION update_timestamp();

-- =========================
-- 5. Deduct credits when using models
-- =========================
CREATE OR REPLACE FUNCTION deduct_credits_on_message()
RETURNS TRIGGER AS $$
DECLARE
  credit_cost numeric;
BEGIN
  -- Only deduct credits for assistant messages
  IF NEW.role = 'assistant' THEN
    -- Get the credit cost for this model
    SELECT credits_per_call INTO credit_cost
    FROM models
    WHERE id = NEW.model_id;
    
    -- Update the message with the credits used
    NEW.credits_used = credit_cost;
    
    -- Deduct credits from the user's balance
    UPDATE profiles
    SET credits_balance = GREATEST(0, credits_balance - credit_cost)
    WHERE id = NEW.user_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_deduct_credits_on_message
BEFORE INSERT ON chat_messages
FOR EACH ROW
EXECUTE FUNCTION deduct_credits_on_message();

-- Similar trigger for media assets
CREATE OR REPLACE FUNCTION deduct_credits_on_media()
RETURNS TRIGGER AS $$
DECLARE
  credit_cost numeric;
BEGIN
  -- Only deduct credits for AI-generated media (not user uploads)
  IF NEW.is_user_uploaded = false AND NEW.model_id IS NOT NULL THEN
    -- Get the credit cost for this model
    SELECT credits_per_call INTO credit_cost
    FROM models
    WHERE id = NEW.model_id;
    
    -- Update the media asset with the credits used
    NEW.credits_used = credit_cost;
    
    -- Deduct credits from the user's balance
    UPDATE profiles
    SET credits_balance = GREATEST(0, credits_balance - credit_cost)
    WHERE id = NEW.user_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_deduct_credits_on_media
BEFORE INSERT ON media_assets
FOR EACH ROW
EXECUTE FUNCTION deduct_credits_on_media();
