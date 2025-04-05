# Supabase Database Setup

This directory contains the database schema and seed data for the LLM SaaS application.

## Structure

- `migrations/` - Contains SQL migration files that define the database schema
- `seed.sql` - Contains seed data to populate the database with initial values
- `config.toml` - Supabase configuration file

## Setup Instructions

### 1. Run Migrations

To apply the database schema:

```bash
npx supabase db push
```

This will apply all migrations in the `migrations/` directory to your Supabase project.

### 2. Seed the Database

After running migrations, seed the database with initial data:

```bash
npx supabase db execute --file supabase/seed.sql
```

## Database Schema Overview

The database schema includes the following main components:

1. **User Management**

   - `profiles` - User profiles with credits balance and subscription info
   - `user_settings` - User preferences and settings

2. **Subscription System**

   - `subscription_plans` - Available subscription plans (Free, Starter, Pro)
   - `user_subscriptions` - User subscription records
   - `payments` - Payment history

3. **Feature & Model Access**

   - `features` - Available features in the application
   - `feature_access` - Which features are available to which plans
   - `models` - Available AI models (LLMs, image generation, etc.)

4. **Chat System**

   - `chat_folders` - Folders to organize chats
   - `chats` - Individual chat sessions
   - `chat_messages` - Messages within chats
   - `comparison_responses` - For comparison mode with multiple models

5. **Content Management**

   - `blog_posts` - Blog content for the Explore section
   - `announcements` - Announcements for the secondary top bar

6. **Media & Templates**
   - `media_assets` - Generated or uploaded media files
   - `writer_templates` - Templates for Writer mode

## Row-Level Security (RLS)

The database uses Supabase's Row-Level Security to ensure users can only access their own data. RLS policies are defined in the `20250403160000_row_level_security.sql` migration file.

Key policies include:

- Users can only access their own profiles, chats, messages, and media
- Anyone can view published blog posts and active announcements
- Admin role has special access to manage content

**Important:** Before running migrations, check the `IMPORTANT_FIXES.md` file for required manual fixes to the RLS policies.

## Database Triggers

The database includes several triggers (defined in `20250403170000_triggers.sql`) that automate business logic:

1. **Credit Management**

   - Automatically updates user credit balance when payments are made
   - Deducts credits when messages are sent or media is generated
   - Tracks credit usage per operation

2. **Subscription Handling**

   - Updates user's current plan when subscriptions change
   - Ensures only one subscription is active at a time

3. **User Onboarding**

   - Creates default chat folders for new users
   - Sets up initial user settings

4. **Timestamp Management**
   - Automatically updates `updated_at` timestamps on record changes

## Credits System

The application uses a credit-based system where:

1. Each user has a `credits_balance` in their profile
2. Each model has a `credits_per_call` cost
3. Each message/generation tracks `credits_used`
4. Credits are automatically deducted via database triggers

## Extending the Schema

When adding new features:

1. Create a new migration file with a timestamp: `YYYYMMDDHHMMSS_feature_name.sql`
2. Apply the migration with `npx supabase db push`
3. Update seed data if necessary
4. Consider adding appropriate RLS policies and triggers
