# Supabase Setup Guide for NyayBot

## Step 1 — Create a Supabase project

1. Go to https://supabase.com → New project
2. Give it a name (e.g. "nyaybot"), set a strong database password, choose closest region (ap-south-1 for India)
3. Wait ~2 minutes for project to spin up

---

## Step 2 — Run the database schema

1. In your Supabase dashboard → SQL Editor → New Query
2. Paste the contents of `supabase_schema.sql` and click Run
3. You should see "Success" — this creates the `cases` table with RLS policies

---

## Step 3 — Enable Google OAuth

1. Go to Authentication → Providers → Google → Enable
2. You need a Google OAuth client ID and secret:
   a. Go to https://console.cloud.google.com
   b. New project → APIs & Services → Credentials → Create Credentials → OAuth 2.0 Client ID
   c. Application type: Web application
   d. Authorised redirect URIs: add `https://your-project.supabase.co/auth/v1/callback`
   e. Copy the Client ID and Client Secret
3. Paste them into Supabase → Authentication → Providers → Google
4. Save

---

## Step 4 — Get your API keys

In Supabase dashboard → Settings → API:

- **Project URL** → goes into `VITE_SUPABASE_URL` (frontend) and `SUPABASE_URL` (backend)
- **anon / public key** → goes into `VITE_SUPABASE_ANON_KEY` (frontend only)
- **service_role key** → goes into `SUPABASE_SERVICE_ROLE_KEY` (backend only — NEVER expose this in frontend)

---

## Step 5 — Add redirect URLs

In Supabase → Authentication → URL Configuration:

- **Site URL**: `https://your-app.vercel.app`
- **Redirect URLs**: add both `https://your-app.vercel.app` and `http://localhost:5173` (for local dev)

---

## Step 6 — Add to your .env files

### frontend/.env
```
VITE_API_URL=https://your-backend.railway.app
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=eyJh...your-anon-key
```

### backend/.env
```
ANTHROPIC_API_KEY=sk-ant-...
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJh...your-service-role-key
PORT=3001
FRONTEND_URL=https://your-app.vercel.app
```

---

## Step 7 — Update frontend package.json

Add the Supabase client:
```bash
cd frontend && npm install @supabase/supabase-js
```

---

## Step 8 — Import auth.css in main.jsx

Add this line to `frontend/src/main.jsx`:
```javascript
import './auth.css';
```

---

## Step 9 — Deploy

Same as before:
- Frontend → Vercel (add the new VITE_SUPABASE_* env vars)
- Backend → Railway (add the new SUPABASE_* env vars)

---

## Testing locally

1. `cd backend && npm install && npm run dev`
2. `cd frontend && npm install && npm run dev`
3. Open http://localhost:5173
4. Click "Sign in" → Google OAuth flow → redirected back
5. Have a conversation → click "Save case"
6. Refresh the page → sign in again → Case History shows your saved case

---

## Troubleshooting

**"Invalid token" errors**: Make sure `SUPABASE_SERVICE_ROLE_KEY` is correct in backend .env (not the anon key)

**Google OAuth not redirecting back**: Check Supabase redirect URLs include your exact frontend URL

**Cases not showing**: Check RLS policies ran correctly in SQL editor — the `cases_user_id_idx` index should exist
