# Supabase Setup Guide for Pledge

## Step 1: Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign up/login
2. Click "New Project"
3. Fill in:
   - **Name**: pledge (or any name)
   - **Database Password**: Save this somewhere safe!
   - **Region**: Choose closest to your users
4. Click "Create new project" and wait ~2 minutes for setup

## Step 2: Get Your API Keys

1. In your Supabase dashboard, go to **Settings** → **API**
2. Copy:
   - **Project URL** (looks like `https://xxxxx.supabase.co`)
   - **anon/public key** (the longer one starting with `eyJ...`)

## Step 3: Create Environment Variables

Create a file called `.env.local` in your project root:

```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGc...your-anon-key...
```

⚠️ **DO NOT** commit this file to git (it's in `.gitignore`)

## Step 4: Run the Database Schema

1. In Supabase dashboard, go to **SQL Editor**
2. Click "New Query"
3. Copy and paste the entire contents of `supabase/schema.sql`
4. Click "Run" (or press Cmd/Ctrl + Enter)

You should see "Success. No rows returned" - this is correct!

## Step 5: Disable Email Confirmation (Recommended for Development)

1. Go to **Authentication** → **Settings** → **Email Auth**
2. Toggle OFF "Enable email confirmations"
3. Click "Save"

This allows immediate login after signup without email verification.

## Step 6: Verify Setup

1. Start your app: `npm run dev`
2. Sign up with any email (e.g., `test@example.com`) and password (min 6 chars)
3. Create a group
4. You should see the dashboard!

## Troubleshooting

### "Invalid credentials" on login
- Make sure you signed up first
- Password must be at least 6 characters
- Check if email confirmation is disabled

### "Failed to create group"
- Check browser console for errors
- Make sure the schema was run successfully
- Verify your `.env.local` has correct keys

### Data not persisting
- Make sure you're using the correct Supabase project
- Check that RLS policies were created (they're included in schema.sql)

### Migration from Old Schema

If you previously ran an older version of schema.sql, run this in SQL Editor:

```sql
-- Add group_id column to profiles if it doesn't exist
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS group_id uuid;

-- Add foreign key if it doesn't exist  
ALTER TABLE public.profiles 
  DROP CONSTRAINT IF EXISTS profiles_group_id_fkey,
  ADD CONSTRAINT profiles_group_id_fkey 
  FOREIGN KEY (group_id) REFERENCES public.groups(id) ON DELETE SET NULL;

-- Migrate existing group_members data (if any)
UPDATE public.profiles p
SET group_id = gm.group_id
FROM public.group_members gm
WHERE p.id = gm.user_id;
```

## Architecture Notes

The app uses a simplified data model:
- `profiles.group_id` stores which group a user belongs to (one group per user)
- This is simpler and more reliable than a junction table approach
- All group membership queries go through the profiles table directly
