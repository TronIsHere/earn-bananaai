# کمپین بنانا (earn-bananaai)

Creator monetization app for BananaAI campaigns (Instagram + YouTube), cash wallet, and admin campaign management.

## Run

Copy `.env.example` to `.env.local` and fill in the values, then:

```bash
cd /Users/erwin/Development/Website/earn-bananaai
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Unauthenticated visits redirect to `/login`.

## Auth (OTP)

Users and admins are real MongoDB accounts, signed in with a Kavenegar SMS OTP (same pattern as BananaAI). There is no shared BananaAI cookie yet; the same phone can register here independently.

Required env:

| Variable | Purpose |
|---|---|
| `MONGODB_URI` | MongoDB connection string |
| `NEXTAUTH_URL` | App origin, e.g. `http://localhost:3000` |
| `NEXTAUTH_SECRET` | JWT secret (`openssl rand -base64 32`) |
| `KAVENEGAR_API_KEY` | Kavenegar dashboard API key |
| `KAVENEGAR_VERIFY_TEMPLATE` | Approved template name (e.g. `verify`) |
| `OTP_SECRET` | HMAC secret for stored OTP hashes |
| `ADMIN_MOBILES` | Comma-separated `09…` numbers with admin access |

Flow: `/login` → send OTP → verify → existing users sign in, new users enter name → NextAuth JWT session. `/admin` is limited to `role=admin` or `ADMIN_MOBILES`.

## What's included (UI)

- RTL Persian UI with IRANSans + BananaAI lime-on-black brand (`src/lib/brand.ts`, `src/app/globals.css`)
- Public landing (`/`): one-line value prop, interactive earnings calculator, four-step flow, payout ladder, trust points, FAQ, inline OTP login
- Signed-in dashboard: wallet-first hero (balance, progress to minimum payout, pending review), "next step" onboarding checklist, open campaigns, recent submissions with a status timeline
- Sidebar branded **کمپین بنانا** with wallet card; mobile top bar with balance chip
- Nav: داشبورد، ارسال‌های من، کیف پول، پروفایل و تأیید پیج
- Campaign cards lead with the per-reel payout range and a live "views → Toman" slider; requirements are collapsed
- Submissions show a pending → approved → day-7 → finalized rail; rejected / changes-requested render as a flagged state
- Admin panel at `/admin` to create, pause, and end campaigns
- Campaigns are stored in MongoDB. The public dashboard only lists `active` campaigns that are not past their deadline.

Shared UI building blocks live in `src/components/`: `money.tsx` (count-up Toman), `wallet-hero.tsx`, `onboarding-checklist.tsx`, `how-it-works.tsx`, `payout-ladder.tsx`, `submission-timeline.tsx`, `fact-ticker.tsx`, `brand-mark.tsx`. `formatTomanCompact` in `src/lib/utils.ts` renders headline amounts like «۴۰۰ هزار» / «۲ میلیون».

## Product guide

See [docs/EARN-FEATURE-GUIDE.md](docs/EARN-FEATURE-GUIDE.md) for full models, APIs, and Iran-market flow (bio verification, day-7 bonuses, manual payouts).

## Next steps

1. Submission review + wallet credit APIs (partially in place)
2. Manual payout requests
