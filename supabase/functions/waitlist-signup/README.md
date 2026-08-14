# waitlist-signup

Public Edge Function for the LinkHelp pre-launch waitlist. It validates and
normalizes input, applies a hashed-IP rate limit, and writes with the server-side
service role to the private `waitlist_leads` table.

## Deployment order

1. Apply `supabase/migrations/0054_secure_waitlist_leads.sql`.
2. Set `WAITLIST_RATE_LIMIT_SALT` to a long random secret.
3. Optionally set `WAITLIST_ALLOWED_ORIGINS` to a comma-separated list of any
   additional preview domains.
4. Deploy with JWT verification disabled, as declared in `supabase/config.toml`:
   `supabase functions deploy waitlist-signup --no-verify-jwt`.
5. Deploy the frontend only after the migration and Edge Function are live.

`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are provided by Supabase to the
Edge Function runtime. They must never be copied into a `VITE_*` variable.

## Production smoke test

- submit a new email and confirm one `waitlist_leads` row;
- submit the same email with different casing and confirm the same row is updated;
- verify `client`, `helper`, and `both`;
- verify checked and unchecked marketing consent timestamps;
- verify invalid/missing input returns a generic client-safe error;
- verify rapid submissions are rate-limited;
- verify `anon` and `authenticated` cannot select, insert, update, or delete rows.
