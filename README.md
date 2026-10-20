# Spotify Clone

A full-featured Spotify clone built with Next.js, featuring song upload/playback, authentication, and Stripe subscriptions.

## Tech Stack

- **Framework:** Next.js 13 (App Router)
- **Language:** TypeScript
- **Database:** PostgreSQL + Prisma
- **Auth:** Better Auth (email/password + Google OAuth)
- **Payments:** Stripe (via Better Auth Stripe plugin)
- **Storage:** Cloudflare R2 (production) / local filesystem (development)
- **UI:** Tailwind CSS + shadcn/ui
- **Package Manager:** pnpm

## Features

- Song upload and playback
- Like/unlike songs
- Search songs by title
- User authentication (email/password + Google OAuth)
- Stripe subscription integration
- Account management with customer portal
- Rate-limited uploads (10/hour per user)

## Prerequisites

- Node.js 20+
- pnpm
- PostgreSQL
- Cloudflare R2 account (for production file storage)
- Stripe account
- Google OAuth credentials

## Getting Started

1. Clone the repo:
   ```bash
   git clone https://github.com/FALAK097/spotify_clone.git
   cd spotify_clone
   ```

2. Install dependencies:
   ```bash
   pnpm install
   ```

3. Copy the environment template:
   ```bash
   cp .env.example .env.local
   ```

4. Fill in `.env.local` with your credentials:
   - Google OAuth client ID and secret
   - PostgreSQL connection string
   - Stripe keys
   - Cloudflare R2 credentials (optional for dev)

5. Set up the database:
   ```bash
   pnpm prisma generate
   pnpm prisma migrate dev
   ```

6. Start the dev server:
   ```bash
   pnpm dev
   ```

Open [http://localhost:3000](http://localhost:3000) to see the app.

## Environment Variables

See `.env.example` for all required variables.

## License

MIT
