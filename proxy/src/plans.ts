import type { Plan, UsageDelta } from './types'

// Model ids the desktop app actually sends. Keep in sync with DekaApp
// aiAgent.ts / intentDecoder.ts. VERIFY current ids before relying on them.
export const MODELS = {
  sonnet: 'claude-sonnet-4-5-20250929',
  haiku: 'claude-haiku-4-5-20251001',
  geminiFlash: 'gemini-2.5-flash',
  geminiFlashPreview: 'gemini-3-flash-preview',
  geminiFlashLite: 'gemini-2.5-flash-lite',
  // Kimi (Moonshot K2.x) — the founder's pooled primary. The /kimi handler
  // pins to env.KIMI_POOL_MODEL when set, so both ids exist mostly so the
  // metering price lookup resolves whichever the desktop sends.
  kimi: 'kimi-k2.6',
  kimiPrev: 'kimi-k2.5',
} as const

// Per-plan model policy.
//   allow:     usable as requested
//   downgrade: a disallowed model is rewritten to the cheap substitute so a
//              free user's agentic loop keeps running instead of erroring.
export const PLAN_MODELS: Record<Plan, { allow: string[]; downgrade: Record<string, string> }> = {
  free: {
    // Pooled traffic runs on Kimi (the founder's primary source) for both
    // tiers — free vs pro differ by the hard cost cap below, not the model.
    // Haiku stays allowed for the legacy Anthropic-pooled route. The main
    // loop's Sonnet request is still downgraded to Haiku on that route.
    allow: [MODELS.kimi, MODELS.kimiPrev, MODELS.haiku],
    downgrade: {
      [MODELS.sonnet]: MODELS.haiku,
    },
  },
  pro: {
    allow: [
      MODELS.kimi,
      MODELS.kimiPrev,
      MODELS.sonnet,
      MODELS.haiku,
      MODELS.geminiFlashPreview,
      MODELS.geminiFlash,
      MODELS.geminiFlashLite,
    ],
    downgrade: {},
  },
  // Team mirrors Pro's model access (all models, no downgrades); it differs by
  // the higher hard cap below, matching the higher per-seat price.
  team: {
    allow: [
      MODELS.kimi,
      MODELS.kimiPrev,
      MODELS.sonnet,
      MODELS.haiku,
      MODELS.geminiFlashPreview,
      MODELS.geminiFlash,
      MODELS.geminiFlashLite,
    ],
    downgrade: {},
  },
}

// Hard caps per billing (Pro) / calendar (Free) period. Tune to your margin.
export const PLAN_LIMITS: Record<Plan, { maxTokens: number; maxCostUsd: number }> = {
  free: { maxTokens: 1_000_000, maxCostUsd: 1 },
  pro: { maxTokens: 50_000_000, maxCostUsd: 60 },
  // Team is $60/mo per seat — give it a higher ceiling than Pro. Tune to margin.
  team: { maxTokens: 100_000_000, maxCostUsd: 120 },
}

// Kimi/Moonshot list price (mid-2026, K2.x): ~$0.60/M in, $2.50/M out, cache
// hit ~$0.15/M. If you buy Kimi through a Gonka broker at a different rate, set
// these to YOUR effective cost so the credit cap reflects real spend. VERIFY.
const KIMI_PRICE = { in: 0.6 / 1e6, out: 2.5 / 1e6, cacheRead: 0.15 / 1e6, cacheWrite: 0 }

// Fallback used when a `kimi-*` model id isn't explicitly in PRICE — keeps
// metering honest (estimateCost returning 0 would silently disable the cap).
export const PRICE_KIMI_DEFAULT = KIMI_PRICE

// USD per token. VERIFY against live pricing pages before trusting cost caps.
// (Haiku rates match DekaApp depthAgent.ts; others approximate, mid-2026.)
export const PRICE: Record<string, { in: number; out: number; cacheRead: number; cacheWrite: number }> = {
  [MODELS.sonnet]: { in: 3 / 1e6, out: 15 / 1e6, cacheRead: 0.3 / 1e6, cacheWrite: 3.75 / 1e6 },
  [MODELS.haiku]: { in: 1 / 1e6, out: 5 / 1e6, cacheRead: 0.1 / 1e6, cacheWrite: 1.25 / 1e6 },
  [MODELS.kimi]: KIMI_PRICE,
  [MODELS.kimiPrev]: KIMI_PRICE,
  [MODELS.geminiFlash]: { in: 0.3 / 1e6, out: 2.5 / 1e6, cacheRead: 0.075 / 1e6, cacheWrite: 0 },
  [MODELS.geminiFlashLite]: { in: 0.1 / 1e6, out: 0.4 / 1e6, cacheRead: 0.025 / 1e6, cacheWrite: 0 },
  [MODELS.geminiFlashPreview]: { in: 0.3 / 1e6, out: 2.5 / 1e6, cacheRead: 0.075 / 1e6, cacheWrite: 0 },
}

export type ModelDecision =
  | { action: 'allow'; model: string; downgraded: false }
  | { action: 'downgrade'; model: string; downgraded: true; from: string }
  | { action: 'reject'; model: string }

export function enforceModel(plan: Plan, requested: string, allowDowngrade: boolean): ModelDecision {
  const policy = PLAN_MODELS[plan]
  if (policy.allow.includes(requested)) return { action: 'allow', model: requested, downgraded: false }
  const sub = policy.downgrade[requested]
  if (sub && allowDowngrade) return { action: 'downgrade', model: sub, downgraded: true, from: requested }
  return { action: 'reject', model: requested }
}

export function estimateCost(model: string, u: UsageDelta): number {
  const p = PRICE[model] ?? (model.startsWith('kimi') ? PRICE_KIMI_DEFAULT : undefined)
  if (!p) return 0
  return u.input * p.in + u.output * p.out + u.cacheRead * p.cacheRead + u.cacheWrite * p.cacheWrite
}

export function overHardCap(
  plan: Plan,
  ent: { inputTokens: number; outputTokens: number; estCostUsd: number },
): boolean {
  const lim = PLAN_LIMITS[plan]
  return ent.inputTokens + ent.outputTokens >= lim.maxTokens || ent.estCostUsd >= lim.maxCostUsd
}
