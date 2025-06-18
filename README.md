# Language Learning App (Next.js + Supabase)

Prototype language learning application with email/password auth, scenario selection, and progress tracking.

## Setup

1. Create a free Supabase project at [supabase.com](https://supabase.com) and grab your `PROJECT_URL` and `ANON_KEY`.
2. In Supabase, create tables:
   - `scenarios` (id uuid primary key default uuid_generate_v4(), title text, description text)
   - `progress` (user_id uuid, scenario_id uuid, percent int4, primary key (user_id, scenario_id))
3. Insert a few rows into `scenarios` for testing.
4. Copy `.env.example` to `.env.local` and fill in your Supabase credentials.

```bash
NEXT_PUBLIC_SUPABASE_URL=your-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

## Local dev

```bash
npm install
npm run dev
```

Open http://localhost:3000

## Deploy

This repo is ready for Netlify / Vercel. Build command: `npm run build`. Output directory: `.next` (handled automatically).
