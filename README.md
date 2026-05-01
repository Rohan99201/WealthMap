# Wealthmap — Personal Finance Planner

Full-stack Next.js app with PostgreSQL (Neon), deployable to Vercel for free.

---

## Stack

| Layer | Tech |
|---|---|
| Frontend | Next.js 14 (App Router), React, Chart.js |
| Backend | Next.js API Routes (serverless) |
| Database | Neon PostgreSQL (free tier, 0.5 GB) |
| Auth | HTTP-only JWT cookie (30-day session) |
| Hosting | Vercel (free hobby plan) |

---

## Features

- ✅ All data persisted in PostgreSQL
- ✅ **Auto corpus compounding** — investment corpus grows monthly based on your entered return % every time you open the app
- ✅ Edit & delete every entry
- ✅ Dashboard with live charts
- ✅ 8 sections: Salary, Assets, Liabilities, Investments, Savings, Goals, Essentials, Budget

---

## Deploy in 4 steps

### Step 1 — Get a free PostgreSQL database (Neon)

1. Go to **https://neon.tech** and sign up (free)
2. Create a new project → copy the **Connection string** (starts with `postgresql://...`)

### Step 2 — Deploy to Vercel

1. Push this folder to a GitHub repo:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   gh repo create wealthmap --private --push --source=.
   # or: git remote add origin https://github.com/YOUR_USERNAME/wealthmap.git && git push -u origin main
   ```

2. Go to **https://vercel.com** → New Project → Import your GitHub repo

3. Add these **Environment Variables** in Vercel dashboard (Settings → Environment Variables):

   | Name | Value |
   |---|---|
   | `DATABASE_URL` | Your Neon connection string |
   | `JWT_SECRET` | Any random 32+ char string (e.g. run: `openssl rand -base64 32`) |
   | `APP_PASSWORD` | `Rohan07@` |

4. Click **Deploy** — done! Vercel auto-builds and deploys.

### Step 3 — First login triggers DB setup

On your first login, the app automatically creates the required tables in your Neon database. No manual SQL needed.

---

## Local development

```bash
# 1. Copy env file
cp .env.example .env.local

# 2. Fill in your DATABASE_URL, JWT_SECRET, APP_PASSWORD in .env.local

# 3. Install deps
npm install

# 4. Run dev server
npm run dev

# Open http://localhost:3000
```

---

## How auto-corpus works

When you add an investment with a monthly amount and return %, the app records the exact timestamp in the database.

Every time you load the Investments page or Dashboard, the server:
1. Reads each investment's `updated_at` timestamp
2. Calculates months elapsed since last update
3. Applies compound interest: `FV = corpus × (1+r)^n + monthly × [(1+r)^n - 1] / r`
4. Saves the new corpus back to the DB
5. Shows a small `↑ auto` indicator on updated rows

This means your corpus grows automatically each month — no manual updates needed.

---

## Database schema

```sql
-- All finance entries
CREATE TABLE finance_data (
  id         SERIAL PRIMARY KEY,
  section    TEXT NOT NULL,          -- salary/assets/liabilities/etc
  item_id    BIGINT NOT NULL,
  payload    JSONB NOT NULL,         -- full item data
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(section, item_id)
);

-- Corpus growth tracking
CREATE TABLE corpus_snapshots (
  item_id      BIGINT PRIMARY KEY,
  corpus       NUMERIC NOT NULL,
  last_updated DATE NOT NULL DEFAULT CURRENT_DATE
);
```

---

## Security notes

- Password is checked server-side only (never exposed in JS bundle)
- JWT stored in `httpOnly` cookie — not accessible to JavaScript
- All API routes require valid JWT
- Change `APP_PASSWORD` in Vercel env vars anytime to update the password

---

## Updating the password

In Vercel dashboard → Settings → Environment Variables → change `APP_PASSWORD` → Redeploy.
