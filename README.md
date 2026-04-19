# Airtel SCM — Statement of Work Form

SOW submission portal for Airtel Supply Chain Management buyers. Features mandatory Claude AI validation before any submission is accepted.

## Features

- Dynamic SOW form with all standard procurement fields
- Claude AI validation — checks completeness and logical coherence before submission
- Field-level inline feedback from AI (green/yellow/red borders)
- Supabase database for persistent storage
- Fully serverless — Next.js API routes on Vercel Edge

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 15 + Tailwind CSS |
| AI Validation | Claude claude-sonnet-4-6 (Anthropic) |
| Database | Supabase (PostgreSQL) |
| Hosting | Vercel (serverless) |

## Setup

### 1. Clone & Install

```bash
npm install
```

### 2. Set up Supabase

1. Create a project at [supabase.com](https://supabase.com)
2. Run `supabase/schema.sql` in the Supabase SQL editor
3. Copy your project URL, anon key, and service role key

### 3. Get Anthropic API Key

1. Sign up at [console.anthropic.com](https://console.anthropic.com)
2. Create an API key

### 4. Configure Environment Variables

```bash
cp .env.local.example .env.local
# Fill in your keys
```

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
ANTHROPIC_API_KEY=your-anthropic-api-key
```

### 5. Run Locally

```bash
npm run dev
```

## Deploy to Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Set environment variables in Vercel dashboard or CLI:
vercel env add NEXT_PUBLIC_SUPABASE_URL
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
vercel env add SUPABASE_SERVICE_ROLE_KEY
vercel env add ANTHROPIC_API_KEY
```

Or connect your GitHub repo to Vercel for automatic deployments.

## How AI Validation Works

1. User fills in the SOW form
2. Clicks **Run AI Validation**
3. Form data is sent to `/api/validate-sow` (serverless function)
4. Claude AI reviews all fields for:
   - Completeness (no empty required fields)
   - Logical consistency (end date after start date, etc.)
   - Business sense (scope aligns with deliverables and KPIs)
   - Measurability of KPIs
   - Validity of commercial terms
5. AI returns a score (0–100), blockers, and warnings
6. If score ≥ 70 with zero blockers → **Submit SOW** button unlocks
7. Form submits to Supabase via `/api/submit-sow`
