# Deka model proxy

A thin Cloudflare Worker that sits between the Deka desktop app and the model
providers. It authenticates the user with their Supabase JWT, enforces the
plan's model allowlist + usage quota, forwards to Anthropic/Gemini with the
**developer's pooled key**, and meters tokens into Supabase `usage_ledger`.

BYOK users never hit this proxy — the desktop app calls the provider directly
with the user's own key, so they cost the developer nothing.

## Endpoints
| Method | Path | Purpose |
|---|---|---|
| GET | `/healthz` | liveness |
| POST | `/v1/messages` | Anthropic Messages passthrough (stream + non-stream) |
| POST | `/v1/gemini/<model>:<method>` | Gemini generateContent / streamGenerateContent |
| GET | `/v1/usage` | caller's plan + current-period usage + limits |

All non-health routes require `Authorization: Bearer <supabase access_token>`.

## Configure
1. `cd DekaSite/proxy && npm install`
2. Set `SUPABASE_URL` in `wrangler.toml` (`[vars]`).
3. Secrets:
   ```
   npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY
   npx wrangler secret put ANTHROPIC_POOL_KEY
   npx wrangler secret put GEMINI_POOL_KEY
   # only if your Supabase project still issues legacy HS256 JWTs:
   npx wrangler secret put SUPABASE_JWT_SECRET
   ```
   **JWT alg check:** decode one real `access_token` (jwt.io) — `alg: HS256`
   means set `SUPABASE_JWT_SECRET`; `ES256`/`RS256` means leave it unset
   (the Worker verifies via your project JWKS automatically).

## Run / deploy
- Local: copy `.dev.vars.example` → `.dev.vars`, fill it, `npm run dev`.
- Deploy: `npm run deploy` → note the `*.workers.dev` URL (or bind a custom
  domain). Put that URL in the desktop app's `DEKA_PROXY_URL`.

## Smoke test (with a real JWT)
```sh
TOKEN=...   # grab session.access_token from the desktop renderer devtools
BASE=https://deka-proxy.<you>.workers.dev

curl $BASE/healthz
curl -s $BASE/v1/usage -H "authorization: Bearer $TOKEN"
curl -s $BASE/v1/messages -H "authorization: Bearer $TOKEN" \
  -H 'anthropic-version: 2023-06-01' -H 'content-type: application/json' \
  -d '{"model":"claude-haiku-4-5-20251001","max_tokens":64,"messages":[{"role":"user","content":"hi"}]}'
```
Then confirm a row appears: `select * from usage_ledger order by ts desc limit 3;`

## Notes
- Prerequisite migrations: `0002_usage_ledger`, `0003_entitlement_rpc`,
  `0004_subscriptions_email` (in `../supabase/migrations`).
- The Worker bills CPU, not wall-clock, so multi-minute streaming calls are fine
  on the free plan.
- Per-user request rate limiting (KV) is Phase 4 — bind a `RATE_LIMIT` KV and
  wire it in `index.ts` when ready.
