# Briefly

**Briefly turns your noisy X (Twitter) and LinkedIn feeds into one calm, AI-written email every morning.**

You sign in with X, and each day Briefly fetches your timeline, uses Claude to separate signal from noise, and synthesizes everything into a crisp, newsletter-style digest — a single big story, professional/industry trends, and fast-moving tech news — delivered to your inbox. No infinite scroll, no doomscrolling. Just the gist.

🔗 Live at [gobriefly.app](https://www.gobriefly.app)

---

## What it does

1. **Sign in with X.** OAuth 2.0 via NextAuth. Your access/refresh tokens are encrypted at rest.
2. **Set your signal.** Optionally tell Briefly the keywords you care about, topics to ignore, and a free-text description of what "relevant" means to you.
3. **Get a daily digest.** A Vercel Cron job runs every morning, builds a personalized digest for each user, and emails it via Resend from `digest@gobriefly.app`.
4. **Flag misses.** Each digest has a "flag an issue" link so accuracy problems are recorded and can be reviewed.
5. **Subscriptions.** Stripe-backed plans (free / paid / trialing) gate eligibility when enabled.

---

## Tech stack

| Layer | Choice |
| --- | --- |
| **Framework** | [Next.js 14](https://nextjs.org) (App Router), React 18, TypeScript |
| **Styling / UI** | Tailwind CSS, [shadcn/ui](https://ui.shadcn.com) (Radix primitives), Geist font, `lucide-react` |
| **Auth** | [NextAuth v5](https://authjs.dev) (OAuth 2.0 — X/Twitter + LinkedIn) with the Prisma adapter |
| **Database** | PostgreSQL ([Neon](https://neon.tech)) via [Prisma 6](https://www.prisma.io) |
| **AI** | [Anthropic Claude](https://www.anthropic.com) (`claude-haiku-4-5`) via the official SDK |
| **Feed data** | [SocialData.tools](https://socialdata.tools) synthetic timeline (default) or the official X API v2 |
| **Email** | [Resend](https://resend.com) |
| **Payments** | [Stripe](https://stripe.com) (Checkout, Billing Portal, webhooks) |
| **Token encryption** | AES-256-GCM (Node `crypto`) |
| **Hosting** | [Vercel](https://vercel.com) (Serverless Functions + Cron) |

> The pipeline is **provider-agnostic** for feed data. Set `FEED_PROVIDER=socialdata` (cheap synthetic timeline, the default) or `FEED_PROVIDER=twitter` (official X API v2, requires the paid Basic tier).

---

## How it works

### The digest pipeline

For each user, `src/lib/agents/pipeline.ts` runs a five-stage flow:

```
 Decrypt tokens  ─▶  Fetch feed  ─▶  Categorize (Claude)  ─▶  Synthesize (Claude)  ─▶  Render + send email
   (AES-256-GCM)     (SocialData /     News / Opinion /         Big Story /              (Resend)
                      X API / LinkedIn)  Noise, in batches       Professional Pulse /
                                         of 50                   X-Factor
```

1. **Decrypt** — the user's OAuth tokens are pulled from Postgres and decrypted with `ENCRYPTION_KEY`. On a `401` from the X API, the token is auto-refreshed and the fetch is retried.
2. **Fetch** — `fetchTwitterFeed()` (and optionally LinkedIn) returns the raw timeline. The provider is swappable behind `src/lib/api/feed-provider.ts`.
3. **Categorize** (`categorizer.ts`) — posts are normalized (retweets dropped, `t.co` links expanded), the top ~50 by engagement are kept, then Claude Haiku labels each one **News / Opinion / Noise** with a confidence score. The model is told to be *inclusive* — only true spam or explicitly-ignored topics become "Noise." Every failure mode (no JSON, parse error, API error) degrades gracefully to "Opinion" rather than dropping posts.
4. **Synthesize** (`synthesizer.ts`) — the non-noise posts are handed to Claude as a "senior newsletter editor," which produces a structured digest: a single `bigStory`, up to 3 `professionalPulse` (LinkedIn/industry) headlines, and up to 3 `xFactor` (fast tech/news) headlines, each with title, summary, source post IDs, source URLs, and bull/bear perspectives. Output is validated field-by-field so malformed responses can't crash the run.
5. **Render & send** — the digest is rendered to HTML (`src/lib/email/templates/daily-digest.tsx`), emailed via Resend, and recorded in `DigestHistory`.

### Cron: orchestrator / worker fan-out

Vercel's Hobby plan caps function duration, so the daily job (`src/app/api/cron/daily-digest/route.ts`) uses an **orchestrator/worker** pattern:

- **Orchestrator** (the scheduled cron hit) finds every eligible user who hasn't received a digest today, then dispatches one HTTP request *per user* back to the same route in **worker mode** — all in parallel via `Promise.allSettled`.
- **Worker** (`?forceUser=<id>`) gets its own fresh serverless invocation (and its own time budget) to run the pipeline for a single user.
- After fan-out, the orchestrator **verifies the result against the database** (counting actual `DigestHistory` rows for today rather than trusting worker responses) and emails a status report to the admin: how many were eligible, sent, and missed.

Both modes are protected by a `CRON_SECRET` bearer token (or Vercel's own `vercel-cron` user-agent).

### Security

- **OAuth tokens are never stored in plaintext.** They're encrypted with AES-256-GCM (`iv:tag:ciphertext`) using a 32-byte `ENCRYPTION_KEY` before hitting the database, and decrypted only in-memory during the pipeline.
- **Admin endpoints** are gated by either an admin email allowlist (`ADMIN_EMAILS`) on the authenticated session, or an `ADMIN_SECRET` bearer token.
- **Stripe webhooks** are signature-verified with `STRIPE_WEBHOOK_SECRET`.
- All real configuration lives in environment variables — see `.env.example`.

---

## Data model

Prisma schema (`prisma/schema.prisma`), Postgres:

- **User** — profile + Stripe subscription state (`planType`, status, period end, trial).
- **Account** — NextAuth OAuth accounts; holds the **encrypted** `access_token` / `refresh_token`.
- **Session / VerificationToken** — NextAuth session storage.
- **UserPreference** — the user's "signal": `keywords`, `ignoredTopics`, `signalDescription`.
- **DigestHistory** — every digest sent (summary + rendered HTML), the source of truth for "did we send today?"
- **DigestFlag** — user-reported accuracy issues, linked to a digest.
- **TwitterFollowing** — cached following list, used to build the synthetic timeline.

---

## Project structure

```
src/
├── app/
│   ├── api/
│   │   ├── auth/[...nextauth]/   # NextAuth handlers
│   │   ├── cron/daily-digest/    # orchestrator + worker (the heart of the app)
│   │   ├── stripe/               # checkout, billing portal, webhook
│   │   ├── subscription/status/  # plan state for the dashboard
│   │   ├── preferences/          # save user signal
│   │   ├── flag/                 # report a digest issue
│   │   ├── feedback/             # in-app feedback → email
│   │   └── admin/                # admin-gated ops (flags, status, grant/revoke plan, trigger digest)
│   ├── dashboard/  onboarding/  pricing/  privacy/  terms/  flag/   # pages
│   └── page.tsx                  # landing page
├── lib/
│   ├── agents/
│   │   ├── pipeline.ts           # per-user orchestration of the 5 stages
│   │   ├── categorizer.ts        # Claude: News / Opinion / Noise
│   │   └── synthesizer.ts        # Claude: digest sections + perspectives
│   ├── api/
│   │   ├── feed-provider.ts      # swappable provider (socialdata | twitter)
│   │   ├── socialdata-client.ts  # SocialData.tools synthetic timeline
│   │   ├── x-client.ts           # official X API v2
│   │   ├── linkedin-client.ts    # LinkedIn feed
│   │   └── token-refresh.ts      # OAuth refresh on 401
│   ├── email/
│   │   ├── send.ts               # Resend wrappers (digest + alerts)
│   │   └── templates/daily-digest.tsx
│   ├── crypto.ts                 # AES-256-GCM encrypt/decrypt
│   ├── auth.ts                   # NextAuth config
│   ├── admin.ts   subscription.ts   stripe.ts   db.ts
└── components/                   # UI (shadcn/ui + digest demo)
prisma/                           # schema + migrations
```

---

## Running locally

### Prerequisites

- Node.js 18+ and a package manager (npm/pnpm/yarn)
- A PostgreSQL database (local, or a free [Neon](https://neon.tech) project)
- API keys for: Anthropic, Resend, SocialData (or X API), and X/LinkedIn OAuth apps

### Setup

```bash
# 1. Install
npm install

# 2. Configure environment
cp .env.example .env
#   then fill in the values (see below)

# 3. Generate a 32-byte encryption key for ENCRYPTION_KEY
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# 4. Push the Prisma schema to your database
npx prisma db push

# 5. Run the dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Environment variables

All keys are documented in [`.env.example`](./.env.example). The essentials:

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | Postgres connection string |
| `ENCRYPTION_KEY` | 64-char hex (32 bytes) for AES-256-GCM token encryption |
| `NEXTAUTH_SECRET` / `NEXTAUTH_URL` | NextAuth session signing + base URL |
| `X_CLIENT_ID` / `X_CLIENT_SECRET` | X (Twitter) OAuth 2.0 app |
| `LINKEDIN_CLIENT_ID` / `LINKEDIN_CLIENT_SECRET` | LinkedIn OAuth (optional) |
| `ANTHROPIC_API_KEY` | Claude API (categorize + synthesize) |
| `SOCIALDATA_API_KEY` | SocialData.tools (when `FEED_PROVIDER=socialdata`) |
| `FEED_PROVIDER` | `socialdata` (default) or `twitter` |
| `RESEND_API_KEY` / `EMAIL_FROM` | Email delivery |
| `CRON_SECRET` | Protects the daily-digest cron route |
| `STRIPE_SECRET_KEY` / `STRIPE_PUBLISHABLE_KEY` / `STRIPE_WEBHOOK_SECRET` / `STRIPE_PRICE_ID` | Payments |
| `SUBSCRIPTIONS_ENABLED` | `true` to enforce paid plans for digest eligibility |
| `ADMIN_SECRET` / `ADMIN_EMAILS` | Admin endpoint auth + status-email recipient |

### Triggering a digest manually

```bash
# Whole run (orchestrator)
curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/daily-digest

# Single user (worker mode)
curl -H "Authorization: Bearer $CRON_SECRET" "http://localhost:3000/api/cron/daily-digest?forceUser=<userId>"
```

---

## Deployment

Deployed on **Vercel**. The cron schedule lives in [`vercel.json`](./vercel.json):

```json
{ "crons": [{ "path": "/api/cron/daily-digest", "schedule": "0 10 * * *" }] }
```

The `build` script runs `prisma generate && prisma db push` before `next build`, so the database schema is applied automatically on deploy. Configure all environment variables in the Vercel dashboard.

---

## License

No license specified — all rights reserved by the author.
