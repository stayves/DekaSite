export interface Env {
  /** Public project URL, e.g. https://abc.supabase.co */
  SUPABASE_URL: string
  /** Service role key — server-only, bypasses RLS. Set via `wrangler secret put`. */
  SUPABASE_SERVICE_ROLE_KEY: string
  /** Legacy HS256 JWT secret. If set, JWTs are verified with it; else via JWKS. */
  SUPABASE_JWT_SECRET?: string
  /** Pooled provider keys (the developer's keys). */
  ANTHROPIC_POOL_KEY: string
  GEMINI_POOL_KEY: string
  /**
   * Pooled Kimi (Gonka / Moonshot) credentials — the founder's PRIMARY token
   * source. KIMI_POOL_KEY is the bearer token; KIMI_BASE_URL is the OpenAI root
   * the `/chat/completions` path is appended to (e.g. a Gonka Supabase broker
   * `https://…/functions/v1/gonka`, or Moonshot's `https://api.moonshot.ai/v1`).
   * KIMI_POOL_MODEL, when set, PINS the upstream model regardless of what the
   * client requested, giving the founder cost control. Secret via
   * `wrangler secret put KIMI_POOL_KEY`; the rest are non-secret [vars].
   */
  KIMI_POOL_KEY: string
  KIMI_BASE_URL?: string
  KIMI_POOL_MODEL?: string
  /** Optional KV for per-user rate limiting (Phase 4). */
  RATE_LIMIT?: KVNamespace
}

export type Plan = 'free' | 'pro' | 'team'

export interface Entitlement {
  plan: Plan
  periodStart: string
  inputTokens: number
  outputTokens: number
  estCostUsd: number
}

/** Token counts for a single model call, normalized across providers. */
export interface UsageDelta {
  input: number
  output: number
  cacheRead: number
  cacheWrite: number
}
