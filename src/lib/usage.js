import { useEffect, useState } from 'react'
import { supabase } from './supabase.js'

// The metered proxy (DekaSite/proxy). Its /v1/usage returns the caller's plan,
// usage this period, and the remaining credit allowance — the same numbers the
// proxy enforces, so this is a single source of truth (no client-side math).
const PROXY_URL = (import.meta.env.VITE_PROXY_URL || '').replace(/\/+$/, '')

export const isUsageConfigured = Boolean(PROXY_URL)

/**
 * Fetch the signed-in user's usage/remaining from the proxy. Uses the Supabase
 * access token as the bearer — the same JWT the desktop app sends, which the
 * Worker verifies. Returns { loading, usage, error }.
 *
 * `usage` shape (from proxy /v1/usage):
 *   { plan, usage: { estCostUsd, inputTokens, outputTokens, ... },
 *     limits: { maxCostUsd, maxTokens }, remaining: { costUsd, tokens } }
 */
export function useUsage(user) {
  const [state, setState] = useState({
    loading: Boolean(user && supabase && isUsageConfigured),
    usage: null,
    error: null,
  })

  useEffect(() => {
    if (!user || !supabase || !isUsageConfigured) {
      setState({ loading: false, usage: null, error: null })
      return
    }

    let cancelled = false
    setState((s) => ({ ...s, loading: true }))

    ;(async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        const token = session?.access_token
        if (!token) throw new Error('no session')

        const res = await fetch(`${PROXY_URL}/v1/usage`, {
          headers: { authorization: `Bearer ${token}` },
        })
        if (!res.ok) throw new Error(`usage ${res.status}`)
        const usage = await res.json()
        if (!cancelled) setState({ loading: false, usage, error: null })
      } catch (error) {
        if (!cancelled) setState({ loading: false, usage: null, error })
      }
    })()

    return () => {
      cancelled = true
    }
  }, [user?.id])

  return state
}

/** Fraction of this period's allowance consumed, 0–1 (cost-based). */
export function usedFraction(usage) {
  const max = usage?.limits?.maxCostUsd
  const spent = usage?.usage?.estCostUsd
  if (!max || max <= 0 || spent == null) return 0
  return Math.min(1, Math.max(0, spent / max))
}
