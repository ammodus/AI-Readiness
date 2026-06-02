/**
 * Tamper-proof result signing.
 *
 * /api/send-report emails whatever `result` the browser posts. Without
 * verification, anyone could POST an arbitrary payload and have a branded
 * "Ammodus" report emailed to any address. To prevent this without a database,
 * /api/analyse signs the result it produces (HMAC-SHA256 over a stable
 * serialisation) and /api/send-report re-verifies the signature before sending.
 *
 * Set REPORT_SIGNING_SECRET in the environment. If it's unset we fall back to a
 * per-process random secret, which still blocks tampering within a session but
 * won't validate across instances — set the env var in production.
 */

import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto'

const SECRET = process.env.REPORT_SIGNING_SECRET || randomBytes(32).toString('hex')

/** Deterministic JSON serialisation with sorted keys, so order can't break the HMAC. */
export function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value)
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`
  const obj = value as Record<string, unknown>
  const keys = Object.keys(obj).sort()
  return `{${keys.map(k => `${JSON.stringify(k)}:${stableStringify(obj[k])}`).join(',')}}`
}

export function signResult(result: unknown): string {
  return createHmac('sha256', SECRET).update(stableStringify(result)).digest('hex')
}

export function verifyResult(result: unknown, signature: unknown): boolean {
  if (typeof signature !== 'string' || signature.length === 0) return false
  const expected = signResult(result)
  if (expected.length !== signature.length) return false
  try {
    return timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(signature, 'hex'))
  } catch {
    return false
  }
}
