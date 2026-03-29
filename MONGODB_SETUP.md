# MongoDB Atlas Setup Guide for NyayBot

## Step 1 — Create a free MongoDB Atlas cluster

1. Go to https://cloud.mongodb.com → Sign up / Log in
2. Create a new project → "nyaybot"
3. Build a Database → **Free tier (M0)** → choose a cloud provider + region (AWS ap-south-1 for India)
4. Cluster name: `nyaybot-cluster` → Create

---

## Step 2 — Create a database user

1. Security → Database Access → Add New Database User
2. Authentication: Password
3. Username: `nyaybot`
4. Autogenerate a secure password → **copy it now**
5. Built-in Role: **Read and write to any database**
6. Add User

---

## Step 3 — Allow network access

1. Security → Network Access → Add IP Address
2. For development: "Allow Access from Anywhere" (0.0.0.0/0)
3. For production: add only your Railway backend IP (or use 0.0.0.0/0 and rely on the user/password auth)
4. Confirm

---

## Step 4 — Get your connection string

1. Database → Connect → Drivers
2. Driver: Node.js, Version: 5.5 or later
3. Copy the connection string — it looks like:
   ```
   mongodb+srv://nyaybot:<password>@nyaybot-cluster.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```
4. Replace `<password>` with your actual password
5. Add the database name before the `?`:
   ```
   mongodb+srv://nyaybot:yourpassword@nyaybot-cluster.xxxxx.mongodb.net/nyaybot?retryWrites=true&w=majority
   ```

---

## Step 5 — Add to backend .env

```
MONGODB_URI=mongodb+srv://nyaybot:yourpassword@nyaybot-cluster.xxxxx.mongodb.net/nyaybot?retryWrites=true&w=majority
```

MongoDB Atlas automatically creates the `nyaybot` database and `cases` collection the first time a document is inserted — no schema migration needed.

---

## Step 6 — Add to Railway env vars

In your Railway backend service → Variables → add:
```
MONGODB_URI=mongodb+srv://nyaybot:yourpassword@...
```

---

## Verifying it works

After deploying, hit the health endpoint:
```
GET https://your-backend.railway.app/health
```

You should see:
```json
{ "status": "ok", "mongo": "connected" }
```

---

## What's stored in MongoDB

Collection: `cases`

Each document looks like:
```json
{
  "_id": "ObjectId(...)",
  "userId": "supabase-user-uuid",
  "title": "Amazon refund denied for defective phone",
  "category": "consumer",
  "language": "en",
  "messages": [
    { "role": "user", "content": "I ordered a phone..." },
    { "role": "assistant", "content": "<span class='sl sl-s'>..." }
  ],
  "summary": "SITUATION: ...",
  "letter": "Dear Sir/Madam...",
  "createdAt": "2025-03-28T...",
  "updatedAt": "2025-03-28T..."
}
```

Note: Supabase is still used for **authentication only** (Google login + JWT verification). MongoDB stores all case data.
