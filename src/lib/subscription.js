import { useEffect, useState } from 'react'
import { supabase } from './supabase.js'

const ENTITLED_STATUSES = new Set(['active', 'trialing'])

export function isEntitled(sub) {
  return Boolean(sub) && ENTITLED_STATUSES.has(sub.status)
}

export function useSubscription(user) {
  const [state, setState] = useState({
    loading: Boolean(user && supabase),
    subscription: null,
    error: null,
  })

  useEffect(() => {
    if (!user || !supabase) {
      setState({ loading: false, subscription: null, error: null })
      return
    }

    let cancelled = false
    setState((s) => ({ ...s, loading: true }))

    supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data, error }) => {
        if (cancelled) return
        if (error) {
          setState({ loading: false, subscription: null, error })
          return
        }
        setState({ loading: false, subscription: data ?? null, error: null })
      })

    return () => { cancelled = true }
  }, [user?.id])

  return state
}
