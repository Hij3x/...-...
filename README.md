# My Happy Day — Zayd's Chores 🌈

A mobile-first GitHub Pages PWA for Zayd. Includes a friendly spoken greeting, animated daily checklist, morning/evening routines, star bank, 15-star Kinder Bueno Mini reward, extra chore requests, parent bonuses, and three parent roles. It uses the supplied Supabase project URL and **publishable** key (safe to expose when RLS is correctly configured). Never commit secret keys.

## IMPORTANT: Before use

This is an **early functional starter**, not a security-audited production app. The Edge Function includes application authorization, but star updates and redemption are currently separate database operations and are **not atomic**. Concurrent requests could miscount stars; do not rely on it for real rewards until the backend uses transactional SQL functions. The six-digit pairing code also needs server-side rate limiting before making the app publicly accessible. Push notifications require additional configuration and live testing. Do not use this as a publicly accessible child account system until those protections are implemented.

## 1. Database (Supabase)

Open SQL Editor and run `supabase/setup.sql` **in full**. It creates NEW tables named `hd_*`, without deleting or modifying your earlier `cs_*` tables. All tables have RLS enabled and **no direct browser policies**. The backend uses the service role only inside the Edge Function.

All three email accounts must already exist in Authentication → Users:

- `yamanhomsi8@gmail.com` — admin
- `lama.asali@icloud.com` — parent
- `waseemhomsy@gmail.com` — parent

## 2. Deploy the Edge Function (required)

Install Supabase CLI on your computer and log in:

```bash
npx supabase login
npx supabase link --project-ref voqcmxyjmljeipwbtlwt
npx supabase functions deploy child-api --no-verify-jwt
```

`--no-verify-jwt` is necessary for Zayd's paired-device token calls. The function performs its own checks, but needs brute-force protection before production. The `SUPABASE_SERVICE_ROLE_KEY` must stay exclusively in Supabase Edge Function secrets; it is never placed in GitHub Pages files.

## 3. Upload to GitHub

Upload all files including `.github/workflows/pages.yml` to your **public** GitHub repository named literally `...-...`. GitHub → Settings → Pages → Source: **GitHub Actions**. After the workflow succeeds, open:

`https://YOUR-GITHUB-USERNAME.github.io/...-.../`

Replace only `YOUR-GITHUB-USERNAME`. The repository's three dots and hyphen are literal.

## 4. Pair Zayd's iPad

On your phone, open the site, choose Parent Login, sign in with one of the Supabase Auth accounts, then select **Generate Pairing Code**. On Zayd's iPad, open the site, tap **Let's Go**, enter the six-digit code. The app saves a random device token in that browser so he won't need a login. Treat a paired iPad as authorized to mark chores and request extra chores. To revoke a lost device, set `revoked=true` on the matching `hd_devices` row in Supabase.

Voice plays on tapping **Let's Go** or the 🔊 button; iOS/Android often block autoplay without a tap. Voice quality depends on device voices. On iPhone, use Safari → Share → Add to Home Screen. On Android, Chrome → Install app.

## 5. Optional real push notifications

Generate VAPID keys locally using `npx web-push generate-vapid-keys`. In Supabase Edge Function secrets configure:

- `VAPID_PUBLIC_KEY`
- `VAPID_PRIVATE_KEY`
- `VAPID_SUBJECT` e.g. `mailto:your-address@example.com`

Add **only** the public VAPID key to `config.js` as `VAPID_PUBLIC_KEY`, commit, and deploy. Parents then install the PWA on their phones, sign in, and tap **Enable Notifications**. Push delivery is not guaranteed and requires supported browsers and permission; iPhone web push requires a Home Screen installed PWA. The function uses `npm:web-push` and must be tested in Supabase's Deno runtime before depending on it.

## Current limitations to address before a real family launch

- Atomic star accounting and redemption; parent/child concurrent actions are not transaction-safe.
- Pairing code brute-force rate limiting and device revocation UI.
- A safer account onboarding and recovery flow.
- Browser/device timezone handling: current completion dates use America/Toronto.
- Push subscription and delivery testing on actual iOS and Android devices.
- Accessibility and offline edits (the PWA shell caches, but chore updates need internet).
- Kinder Bueno is represented by a 🍫 emoji; no copyrighted product photo is bundled.

## Files

- `index.html`, `style.css`, `app.js` — app UI and logic
- `config.js` — public Supabase configuration
- `sw.js`, `manifest.webmanifest`, `assets/icon.svg` — installable PWA
- `.github/workflows/pages.yml` — automatic Pages deployment
- `supabase/setup.sql` — new database tables
- `supabase/functions/child-api/index.ts` — server-side API, pairing, parent actions, optional push
