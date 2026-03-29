# NyayBot ⚖

> **Know your rights. Know your next step.**

AI-powered legal assistant for everyday Indians — built with React, Node.js, MongoDB, Supabase Auth, and Google Gemini (free).

---

## Features

- **6 Legal Categories** — Consumer, Police/FIR, Employment, Landlord, Cyber Crime, RTI
- **3 Languages** — English, Hindi (हिंदी), Malayalam (മലയാളം)
- **Structured AI Responses** — every answer follows: Your Situation → Your Rights → Your Options → Your Next Step
- **Complaint Letter Generator** — AI drafts a formal legal complaint from your conversation
- **Case Summary** — shareable structured summary of your rights and next action
- **23 State FIR Portals** — direct links to all state police online FIR filing portals
- **Google Login** — one-click sign in via Supabase Auth
- **Case History** — save conversations, auto-titled by AI, load/delete from sidebar
- **Free AI** — runs on Google Gemini 2.5 Flash Lite (1,000 req/day free, no credit card)

---

## Tech Stack

| Layer | Service | Cost |
|-------|---------|------|
| Frontend | React + Vite → Vercel | Free |
| Backend | Node.js + Express → Railway | Free |
| Database | MongoDB Atlas (M0 cluster) | Free |
| Auth | Supabase (Google OAuth) | Free |
| AI | Google Gemini 2.5 Flash Lite | Free (1k req/day) |
| Domain | Any registrar (.in recommended) | ~₹700/yr |

**Total monthly cost at launch: ₹0**

---

## Project Structure

```
nyaybot/
├── frontend/                          # React + Vite → deploy to Vercel
│   ├── src/
│   │   ├── App.jsx                    # Main app component
│   │   ├── App.css                    # Core styles
│   │   ├── auth.css                   # Auth & case history styles
│   │   ├── main.jsx                   # Entry point
│   │   ├── supabaseClient.js          # Supabase singleton
│   │   ├── components/
│   │   │   └── CaseHistory.jsx        # Saved cases sidebar
│   │   ├── hooks/
│   │   │   ├── useAuth.js             # Google login & session
│   │   │   ├── useCases.js            # Save / load / delete cases
│   │   │   └── useNyayBot.js          # AI chat logic
│   │   ├── i18n/
│   │   │   └── translations.js        # EN / HI / ML strings
│   │   └── data/
│   │       └── firPortals.js          # 23 state FIR portal links
│   ├── index.html
│   ├── package.json
│   ├── vite.config.js
│   └── vercel.json
├── backend/                           # Node.js + Express → deploy to Railway
│   ├── src/
│   │   ├── index.js                   # API server (chat, letter, summary, cases)
│   │   └── models/
│   │       └── Case.js                # Mongoose schema
│   ├── package.json
│   └── railway.toml
├── SUPABASE_SETUP.md                  # Step-by-step Google OAuth setup
├── MONGODB_SETUP.md                   # Step-by-step Atlas setup
├── .gitignore
└── README.md
```

---

## Local Setup (macOS)

### 1. Install prerequisites

```bash
# Install Homebrew (if not already installed)
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Install Node.js
brew install node

# Verify
node --version   # v20+
npm --version    # 9+
git --version    # already on Mac
```

### 2. Clone and install

```bash
git clone https://github.com/yourusername/nyaybot.git
cd nyaybot

cd backend && npm install
cd ../frontend && npm install
```

### 3. Get your free API keys

| Key | Where to get it | Time |
|-----|----------------|------|
| `GEMINI_API_KEY` | aistudio.google.com → Get API key | 2 min |
| `MONGODB_URI` | cloud.mongodb.com → free M0 cluster | 10 min |
| `SUPABASE_URL` + keys | supabase.com → new project | 5 min |
| Supabase Google OAuth | See SUPABASE_SETUP.md | 10 min |

### 4. Set environment variables

**backend/.env** (copy from `.env.example`)
```
GEMINI_API_KEY=your_key_here
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/nyaybot?retryWrites=true&w=majority
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
PORT=3001
FRONTEND_URL=http://localhost:5173
```

**frontend/.env** (copy from `.env.example`)
```
VITE_API_URL=http://localhost:3001
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key
```

### 5. Run locally

```bash
# Terminal 1 — backend
cd backend && npm run dev

# Terminal 2 — frontend
cd frontend && npm run dev
```

Open http://localhost:5173

---

## Deployment

### Backend → Railway (free)

1. Push code to GitHub
2. [railway.app](https://railway.app) → New Project → GitHub repo → root: `backend`
3. Add all backend env vars (same as `.env` but with production URLs)
4. Deploy → copy the generated Railway URL

### Frontend → Vercel (free)

1. [vercel.com](https://vercel.com) → New Project → GitHub repo → root: `frontend`
2. Add frontend env vars (use your Railway URL for `VITE_API_URL`)
3. Deploy → copy your Vercel URL
4. Update `FRONTEND_URL` in Railway to your Vercel URL
5. Update Supabase redirect URLs to your Vercel URL

### Custom domain (optional)

1. Buy `nyaybot.in` or similar from GoDaddy / BigRock / Namecheap (~₹700/yr)
2. Vercel → Settings → Domains → Add your domain
3. Add the DNS records Vercel shows you at your registrar
4. SSL certificate is automatic

---

## Switching to Anthropic (optional, higher quality)

When you outgrow Gemini's free tier or want better response quality:

1. `backend/package.json` — replace `@google/generative-ai` with `@anthropic-ai/sdk`
2. Get API key from [console.anthropic.com](https://console.anthropic.com)
3. Update `backend/src/index.js` — swap `GoogleGenerativeAI` for `Anthropic` client
4. Cost: ~$0.0024 per conversation (roughly ₹0.20 per user per day)

---

## API Endpoints

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| POST | `/api/chat` | Optional | Send a message, get AI legal response |
| POST | `/api/generate-letter` | Optional | Generate formal complaint letter |
| POST | `/api/summarise` | Optional | Generate structured case summary |
| GET | `/api/cases` | Required | List all saved cases |
| GET | `/api/cases/:id` | Required | Get a single case with messages |
| POST | `/api/cases` | Required | Save a new case |
| PATCH | `/api/cases/:id` | Required | Update case (messages / letter / summary) |
| DELETE | `/api/cases/:id` | Required | Delete a case |
| GET | `/health` | None | Health check |

---

## Roadmap

- [ ] PDF export of complaint letters
- [ ] WhatsApp integration
- [ ] Tamil, Telugu language support
- [ ] Lawyer referral marketplace (monetisation)
- [ ] State-specific jurisdiction detection

---

## Disclaimer

NyayBot provides general legal information, not legal advice. For serious legal matters, always consult a qualified lawyer.
