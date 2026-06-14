import { createRemoteJWKSet, jwtVerify, type JWTPayload } from 'jose'
import type { Env } from './types'

export interface Caller {
  userId: string
  email?: string
  exp: number
}

export class AuthError extends Error {
  constructor(public reason: 'expired' | 'invalid', message?: string) {
    super(message ?? reason)
    this.name = 'AuthError'
  }
}

// Cached across requests within an isolate (best effort).
let jwks: ReturnType<typeof createRemoteJWKSet> | null = null
function getJwks(env: Env) {
  if (!jwks) {
    jwks = createRemoteJWKSet(new URL(`${env.SUPABASE_URL}/auth/v1/.well-known/jwks.json`))
  }
  return jwks
}

/**
 * Verify a Supabase access token LOCALLY (no network round-trip to Supabase
 * Auth on the hot path). Uses the legacy HS256 shared secret when
 * SUPABASE_JWT_SECRET is set, otherwise the project's asymmetric JWKS.
 */
export async function verifySupabaseJwt(token: string, env: Env): Promise<Caller> {
  const opts = {
    issuer: `${env.SUPABASE_URL}/auth/v1`,
    audience: 'authenticated',
  }
  try {
    let payload: JWTPayload
    if (env.SUPABASE_JWT_SECRET) {
      const key = new TextEncoder().encode(env.SUPABASE_JWT_SECRET)
      ;({ payload } = await jwtVerify(token, key, opts))
    } else {
      ;({ payload } = await jwtVerify(token, getJwks(env), opts))
    }
    if (!payload.sub) throw new AuthError('invalid', 'missing sub claim')
    return {
      userId: payload.sub,
      email: typeof payload.email === 'string' ? payload.email : undefined,
      exp: typeof payload.exp === 'number' ? payload.exp : 0,
    }
  } catch (e: unknown) {
    if (e instanceof AuthError) throw e
    const code = (e as { code?: string })?.code
    if (code === 'ERR_JWT_EXPIRED') throw new AuthError('expired')
    throw new AuthError('invalid', (e as Error)?.message)
  }
}
