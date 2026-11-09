# Zayd's Happy Day — GitHub Pages + Supabase (no Edge Functions)

## Setup
1. In Supabase, open Authentication > Providers > Anonymous Sign-Ins and enable anonymous sign-ins. Parent email/password users must already exist.
2. In Supabase SQL Editor, run `supabase/setup.sql` **only if you have not already run it**. Then run `supabase/no-edge-functions.sql` in its entirety. This second script provides secure RPC functions for browser clients and pairing.
3. In GitHub, upload the **contents** of this folder to the root of the public repository `...-...` (including `.github/workflows/pages.yml`). Commit.
4. GitHub repository > Settings > Pages > Source: **GitHub Actions**. The deploy workflow publishes the site.
5. On a parent device, sign in with a parent email/password. Generate a six-digit pairing code (valid 10 minutes).
6. On Zayd's iPad, open the website, tap Let's go, and enter the code. The iPad keeps its own anonymous Supabase Auth session so no daily login is required.

## Notes
- **No Edge Functions or notifications**. All app writes use server-enforced PostgreSQL RPC functions.
- Anonymous Auth accounts are separate from parent accounts. Don't sign out of the child's anonymous session or clear Safari website data, or you'll need to pair again.
- One Supabase Auth session is maintained per browser origin. Use separate devices/browsers for the parent dashboard and child dashboard to avoid replacing the child's anonymous session with a parent login.
- Keep the `sb_publishable_` key in `config.js`. **Never** put a secret/service_role key into GitHub.
- The six-digit code is single-use and expires in 10 minutes. Failed pairing attempts are limited to 8 per anonymous user per hour, but anonymous accounts can be recreated; for a public app with broader use, add IP-level rate limiting using a server or managed protection.
- The original SQL tables `hd_*` are used, not `cs_*` tables from an earlier iteration. Run `setup.sql` first if needed.
- A parent may revoke a child device by disabling its anonymous user in Supabase Auth, or updating its `hd_devices.revoked` row via SQL Editor. There is no device-management UI.
- This app has not been end-to-end tested against your live Supabase project. Test pairing, completions, parent bonuses, and redemption before relying on it.
