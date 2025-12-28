# Supabase Setup Guide

Get your app working with a real database in 5 minutes.

## Step 1: Create Supabase Project (2 min)

1. Go to [supabase.com](https://supabase.com) and sign up (free)
2. Click **New Project**
3. Choose a name (e.g., "pledge")
4. Set a database password (save this somewhere)
5. Select a region close to you
6. Click **Create new project**

Wait ~2 minutes for the project to be ready.

## Step 2: Run the Schema (1 min)

1. In your Supabase dashboard, click **SQL Editor** (left sidebar)
2. Click **New query**
3. Copy the entire contents of `supabase/schema.sql` from your project
4. Paste it into the SQL editor
5. Click **Run** (or Ctrl+Enter)

You should see "Success. No rows returned" - this means all tables were created.

## Step 3: Get Your API Keys (1 min)

1. Click **Settings** (gear icon) → **API**
2. Copy these two values:
   - **Project URL** (e.g., `https://xxxx.supabase.co`)
   - **anon public** key (under "Project API keys")

## Step 4: Add Keys to Your App (1 min)

### For Local Development

Create a file `.env.local` in your project root:

```
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

### For Vercel Deployment

1. Go to your Vercel project → **Settings** → **Environment Variables**
2. Add:
   - `VITE_SUPABASE_URL` = your project URL
   - `VITE_SUPABASE_ANON_KEY` = your anon key
3. **Redeploy** your app (Deployments → Redeploy)

## Step 5: Test It

1. Start your app locally:
   ```
   npm run dev
   ```
2. Sign up with a new account
3. Create a group
4. Share the invite link with someone (or open on your phone)
5. They should be able to join your group!

---

## Troubleshooting

### "Failed to fetch" or connection errors
- Double-check your `VITE_SUPABASE_URL` is correct
- Make sure you restarted `npm run dev` after adding env vars

### "Email already exists" when signing up
- Email confirmation is enabled by default
- To disable: Dashboard → Authentication → Providers → Email → Turn off "Confirm email"

### "Row Level Security" errors
- Make sure you ran the entire `schema.sql` file
- The RLS policies are at the bottom of that file

### Can't see data in dashboard
- Click **Table Editor** in the sidebar
- You should see: profiles, groups, group_members, resolutions, etc.

---

## That's It!

Your app now has a real database that:
- ✅ Syncs across all devices
- ✅ Works with your Vercel deployment
- ✅ Has built-in authentication
- ✅ Free tier is very generous (500MB database, 50,000 monthly users)
