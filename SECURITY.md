# Security Checklist

## Secrets Rule
- Never commit secrets to git (`.env`, notes, source, examples).
- Treat all API keys/tokens as compromised if they appear in commits, terminal logs, screenshots, or chat paste.

## Where Secrets Go
- Local development: `api/.env`, `dashboard/.env` (already gitignored).
- Production: hosting provider secret manager (Render environment variables).
- Never place real keys in `README.md`, `Notes.md`, or `TestData/*`.

## Required Keys In This Project
- Supabase backend key: `SUPABASE_SECRET_KEY` (server-side only).
- Supabase frontend key: `VITE_SUPABASE_PUBLISHABLE_KEY` (safe for client).
- Events ingest key: `evt_...` project API key (treat as secret).
- Third-party provider keys (for example OpenWeather): secret.

## Rotation Procedure (If A Key Leaks)
1. Revoke/regenerate the leaked key in the provider dashboard.
2. Update local `.env` and Render environment variables.
3. Redeploy affected services.
4. Remove secret from committed files and rewrite commit history if needed.
5. Re-test critical endpoints (`/health`, project creation, event ingestion).

## Safe Workflow Before Push
1. Run a quick secret scan:
```bash
rg -n "(evt_[a-zA-Z0-9]{16,}|SUPABASE_SECRET_KEY|OPENWEATHER_API_KEY|sb_secret_|service_role|apikey|api_key)" .
```
2. Verify `.env` files are not tracked:
```bash
git ls-files | rg "\.env$"
```
3. Push only after results are clean.

## Incident Notes
- If GitHub Push Protection blocks a push, do not bypass immediately.
- Remove the secret from commits first, then rotate key(s), then push.
