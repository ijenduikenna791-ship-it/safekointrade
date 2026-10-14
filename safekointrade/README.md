# SafeKoinTrade — term-based crypto investment platform

A Next.js + Supabase platform for fixed-term crypto investment plans: public site, customer dashboard, staff console, and a Postgres ledger where every balance change is reviewed, idempotent, and audited.

> **Status: demo mode.** No licensed payment or custody provider is connected. All deposits, withdrawals and positions are **simulated** and labelled that way in the UI. Read [Before going live](#before-going-live) before handling real money.

---

## Contents

1. [Stack](#stack)
2. [Quick start (local)](#quick-start-local)
3. [Supabase setup](#supabase-setup)
4. [Create the first owner account](#create-the-first-owner-account)
5. [Deploy to Vercel](#deploy-to-vercel)
6. [Environment variables](#environment-variables)
7. [How money moves](#how-money-moves)
8. [Roles and permissions](#roles-and-permissions)
9. [Languages](#languages)
10. [Testing](#testing)
11. [Project structure](#project-structure)
12. [Customising](#customising)
13. [Known limitations](#known-limitations)
14. [Before going live](#before-going-live)

---

## Stack

| Area | Choice |
|---|---|
| Framework | Next.js 16 (App Router, JavaScript, Turbopack), React 19 |
| Styling | Tailwind CSS v4, design tokens in `app/globals.css`, light/dark via `next-themes` |
| Data & auth | Supabase (Postgres, Auth, Storage, Realtime) via `@supabase/ssr` |
| Forms | React Hook Form + Zod (the same schemas re-run on the server) |
| i18n | `next-intl`, 8 locales: en, fr, es, pt, ar (RTL), de, zh, yo |
| UI | Framer Motion, Lucide icons, Recharts, `libphonenumber-js` phone input, Sonner toasts |
| Email | Resend (optional; emails are logged and skipped when unconfigured) |
| Market data | CoinGecko public API (optional key) |
| Tests | Vitest (unit + PGlite database integration), Playwright (e2e smoke) |

Requires **Node.js 20.9+**.

---

## Quick start (local)

```bash
npm install
cp .env.example .env.local      # then fill in the Supabase values
npm run dev                     # http://localhost:3000
```

Without Supabase credentials the public site still renders. Sign-in forms show a "Server not connected" notice, and private areas redirect to the login page.

---

## Supabase setup

1. **Create a project** at [supabase.com](https://supabase.com). Under **Project Settings → API Keys**, copy:
   - the Project URL → `NEXT_PUBLIC_SUPABASE_URL`
   - the publishable key → `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (legacy projects: anon key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`)
   - the secret key → `SUPABASE_SECRET_KEY` (legacy: `SUPABASE_SERVICE_ROLE_KEY`). **Server only.**

2. **Apply the migrations**, in filename order. Use either option:

   *Supabase CLI (recommended):*
   ```bash
   npx supabase login
   npx supabase link --project-ref <your-project-ref>
   npx supabase db push
   psql "<connection string>" -f supabase/seed.sql     # default plans and assets
   ```

   *SQL editor:* paste each file in `supabase/migrations/` in order (`…0001_helpers.sql` → `…0006_storage_realtime_settings.sql`) and run it, then run `supabase/seed.sql`.

   The migrations create every table with Row Level Security enabled, the money-movement functions, default platform settings (limits and fees), a private `receipts` storage bucket, and Realtime for notifications. The seed adds the default plans and assets and **no users**.

3. **Auth settings** (Authentication → URL Configuration):
   - **Site URL:** your app origin, e.g. `https://app.yourdomain.com`
   - **Redirect URLs:** add `https://app.yourdomain.com/api/auth/callback` (and `http://localhost:3000/api/auth/callback` for local dev)

4. **Auth providers:** under Authentication → Sign In / Providers, keep **Email** enabled with **Confirm email** on. Under Authentication → Multi-Factor, keep **TOTP** enabled; staff accounts need it (see [Roles](#roles-and-permissions)).

5. **Email delivery:** Supabase's built-in mailer is heavily rate-limited. For real use, set up custom SMTP under Authentication → SMTP Settings. Resend's SMTP works, and it can share the same domain as `EMAIL_FROM`.

6. **Maturities (optional):** positions are settled when their owner opens the dashboard, and staff can settle in bulk from the admin overview. To settle on a schedule as well, enable the `pg_cron` extension and run:
   ```sql
   select cron.schedule('settle-maturities', '*/15 * * * *',
     $$select public.process_matured_investments(500)$$);
   ```

---

## Create the first owner account

There is **no admin sign-up page** and no default admin password. The first owner is promoted by a one-time script that runs on your own machine:

1. Sign up through the app with **your own** email and a strong password, then confirm the email.
2. Generate a token and add it to `.env.local`:
   ```bash
   echo "ADMIN_BOOTSTRAP_TOKEN=$(openssl rand -hex 32)" >> .env.local
   ```
3. Run the script with the same token:
   ```bash
   npm run bootstrap:admin -- --email you@yourdomain.com --token <the token>
   ```
4. **Delete `ADMIN_BOOTSTRAP_TOKEN`** from `.env.local`.
5. Sign in at `/admin/login`. You'll be asked to set up an authenticator app before you can use staff tools.

Once any owner exists, the script refuses to run again. Owners grant further staff roles from **Admin → Users**.

---

## Deploy to Vercel

1. Push the project to a Git repository and import it in Vercel. The defaults are correct: framework Next.js, `npm run build`.
2. Under **Settings → Environment Variables**, add the values from [Environment variables](#environment-variables). Set `NEXT_PUBLIC_APP_URL` to the production origin.
3. Deploy, then update Supabase's **Site URL** and **Redirect URLs** to the production domain.
4. Create the first owner (above) by running the bootstrap script locally against the production project. The script needs the secret key, so never run it in CI or in the browser.

Security headers (HSTS, `X-Frame-Options: DENY`, `nosniff`, referrer and permissions policies) are set in `next.config.mjs`.

---

## Environment variables

All variables are documented in [`.env.example`](.env.example).

| Variable | Exposure | Required | Purpose |
|---|---|---|---|
| `NEXT_PUBLIC_APP_URL` | public | yes | Origin for email and auth redirect links |
| `NEXT_PUBLIC_DEMO_MODE` | public | — | `true` by default; labels all money flows as simulated |
| `NEXT_PUBLIC_SUPABASE_URL` | public | yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` / `…_ANON_KEY` | public | yes | Browser key; RLS protects the data |
| `SUPABASE_SECRET_KEY` / `SUPABASE_SERVICE_ROLE_KEY` | **secret** | yes | Server-only admin client and bootstrap script |
| `RESEND_API_KEY`, `EMAIL_FROM` | secret | — | Transactional email; skipped and logged if unset |
| `COINGECKO_API_KEY` | secret | — | Higher market-data rate limits |
| `PAYMENT_PROVIDER_SECRET_KEY`, `PAYMENT_WEBHOOK_SECRET` | secret | — | Reserved; no provider is integrated |
| `ADMIN_BOOTSTRAP_TOKEN` | secret | once | One-time owner bootstrap; remove afterwards |

**Never** prefix a secret with `NEXT_PUBLIC_`, and never commit `.env.local`. `.gitignore` already excludes every `.env*` except `.env.example`.

---

## How money moves

The browser never decides a balance. Every change runs inside a `SECURITY DEFINER` Postgres function (`supabase/migrations/…0004` and `…0005`) that:

- re-checks the caller's identity, account status and role, with MFA required for staff;
- locks the user's balance row (`FOR UPDATE`) so concurrent requests can't overspend;
- takes an **idempotency key**, so a double-click or retry can't create a duplicate;
- writes an **append-only ledger** entry (`transactions`) with before and after balances;
- writes an **append-only audit log** entry for staff actions.

| Flow | What happens |
|---|---|
| Deposit | The customer files a request (and optionally a receipt). The balance doesn't change until a finance reviewer approves it. The credited amount can't exceed the request. |
| Withdrawal | The amount moves from *available* to *held*. A reviewer approves it, then marks it complete with a payout reference. Rejecting or cancelling releases the hold. |
| Position | The amount moves from *available* to *invested*. It can be cancelled within 24 h. At maturity, **principal only** is returned. |

**No profit is ever credited automatically.** A plan's target return is optional, shown only with a published basis, and never paid by the system. Paying returns requires a documented, auditable rule that you add deliberately.

Nobody can review their own request, and reviewers act only through these functions; there are no direct table writes.

---

## Roles and permissions

| Role | Can do |
|---|---|
| **owner** | Everything, including granting or revoking admin roles |
| **admin** | Users, plans, settings, audit log, support; grant finance and support roles |
| **finance** | Review deposits and withdrawals, settle maturities |
| **support** | Support tickets, announcements, read-only user and finance views |

The database enforces the same rules (`require_role`). The UI map in `lib/authorization/permissions.js` decides only what to show. Staff who have enrolled an authenticator must be at **AAL2** for any staff function to run, and the admin console asks staff without one to enrol.

---

## Languages

| Code | Language | Notes |
|---|---|---|
| en | English | Source of truth |
| fr, es, pt, de | French, Spanish, Portuguese (BR), German | |
| ar | Arabic | Full RTL layout, Arabic plural forms |
| zh | Chinese (Simplified) | |
| yo | Yoruba | Diacritics supported by a self-hosted font subset |

The default locale has no URL prefix (`/dashboard`); others do (`/fr/dashboard`). Missing keys fall back to English.

```bash
node scripts/check-translations.mjs   # keys, ICU arguments and rich-text tags vs en.json
```

**Have native speakers review the translations before launch**, especially the legal and risk wording. The legal pages (`lib/content/legal.js`) are English-only templates.

To add a locale: add it to `lib/i18n/routing.js` (`locales` and `localeMeta`), create `messages/<code>.json`, and run the checker.

---

## Testing

```bash
npm test               # all Vitest suites (unit + database)
npm run test:unit      # schemas, permissions, formatting, redirects, all translations
npm run test:db        # runs the real migrations in PGlite: RLS, idempotency,
                       # double-submit, self-review, MFA, ledger consistency, append-only
npm run build && npm run test:e2e   # Playwright smoke tests against a production build
npm run lint
```

The database tests need no Supabase project: they load the migrations into an in-process Postgres (PGlite) with stubs for Supabase's `auth` and `storage` schemas.

The e2e suite needs no credentials either. To use a pre-installed Chromium, set `PLAYWRIGHT_CHROMIUM_PATH`; otherwise run `npx playwright install chromium` once.

---

## Project structure

```
app/[locale]/(marketing)/    public site: home, about, contact, legal
app/[locale]/(auth)/         login, register, verify, forgot/reset, MFA, logout
app/[locale]/dashboard/      customer area
app/[locale]/admin/          staff console (login + (panel) routes)
app/api/                     auth callback, newsletter, payment webhook stub
components/                  ui, layout, marketing, dashboard, admin, charts, forms
lib/actions/                 Server Actions (user, admin) – validate → RPC → notify
lib/auth, lib/authorization  session helpers and page/action guards
lib/supabase/                browser, server, public and service-role clients
lib/validation/schemas.js    Zod schemas shared by client and server
messages/                    translations
proxy.js                     locale routing, session refresh, private-area redirects
supabase/migrations/         schema, RLS, functions, storage
scripts/                     bootstrap-admin, check-translations
tests/                       unit, integration (PGlite), e2e (Playwright)
```

---

## Customising

- **Name, legal entity, contact details:** `lib/config/brand.js`
- **Colours and type:** tokens in `app/globals.css`; fonts are self-hosted in `public/fonts` (OFL licences included)
- **Default plans and assets:** `supabase/seed.sql`; afterwards edit them in **Admin → Plans / Settings**
- **Limits, fees, maintenance mode, registrations:** **Admin → Settings** (all changes are audited)
- **Hero and section photos:** `lib/config/images.js` (Pexels, credited)

---

## Known limitations

- **Demo mode only.** No payment, custody or on-chain integration. `/api/webhooks/payments` rejects every request until a provider is wired up and its signature is verified.
- **No KYC provider.** The KYC page shows counts only. Statuses can't be set by hand; they should come from a provider's webhook.
- **Phone numbers are validated but not verified.** SMS OTP isn't implemented, so the profile marks phones "unverified".
- **Legal pages are drafts** that need review by qualified counsel, and they are English-only.
- **Machine-assisted translations** need native-speaker review.
- **Sandbox verification gaps:** Pexels images, the CoinGecko ticker and charts, Google-hosted resources, and live Supabase/Resend calls couldn't be reached from the build environment. Those parts were verified only to the point of showing their *unavailable* states, not fake data. Check them on your first deploy.
- **Rate limiting** uses a database function (`check_rate_limit`) with an in-memory fallback. For high traffic, consider an edge store such as Upstash.

---

## Before going live

Real money brings regulatory obligations this codebase cannot meet for you. At minimum:

1. Obtain the licences required in each jurisdiction you serve (e.g. VASP/MSB registration).
2. Integrate a **licensed** payment and custody provider; verify webhook signatures; reconcile the ledger daily.
3. Integrate a KYC/AML provider and sanctions screening; add transaction monitoring.
4. Have counsel finalise the terms, privacy, risk and cookie documents (and translate them).
5. Commission an independent security review and penetration test.
6. Set `NEXT_PUBLIC_DEMO_MODE=false` **only** after all of the above.

Never advertise guaranteed or fixed returns, and never show earnings that the ledger can't back.
