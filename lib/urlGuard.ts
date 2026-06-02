/**
 * SSRF guard for user-supplied URLs.
 *
 * The analyser and enricher fetch arbitrary URLs server-side. Without a guard a
 * user could point the tool at internal addresses (cloud metadata at
 * 169.254.169.254, localhost, private ranges) and read internal responses.
 *
 * assertPublicUrl: validates the scheme, then resolves the hostname via DNS and
 * rejects any result in a private/loopback/link-local range. Resolving DNS
 * (rather than just regex-checking the literal) blocks domains that intentionally
 * resolve to internal IPs.
 */

import { lookup } from 'node:dns/promises'
import net from 'node:net'

function isPrivateIPv4(ip: string): boolean {
  const parts = ip.split('.').map(Number)
  if (parts.length !== 4 || parts.some(n => Number.isNaN(n) || n < 0 || n > 255)) return true
  const [a, b] = parts
  if (a === 0) return true                          // 0.0.0.0/8
  if (a === 10) return true                         // private
  if (a === 127) return true                        // loopback
  if (a === 169 && b === 254) return true           // link-local (incl. cloud metadata)
  if (a === 172 && b >= 16 && b <= 31) return true  // private
  if (a === 192 && b === 168) return true           // private
  if (a === 100 && b >= 64 && b <= 127) return true // CGNAT
  if (a >= 224) return true                         // multicast / reserved
  return false
}

function isPrivateIPv6(ip: string): boolean {
  const lower = ip.toLowerCase()
  if (lower === '::1' || lower === '::') return true
  if (lower.startsWith('fe80') || lower.startsWith('fc') || lower.startsWith('fd')) return true
  if (lower.startsWith('::ffff:')) return isPrivateIPv4(lower.replace('::ffff:', ''))
  return false
}

function isPrivateAddress(ip: string): boolean {
  const family = net.isIP(ip)
  if (family === 4) return isPrivateIPv4(ip)
  if (family === 6) return isPrivateIPv6(ip)
  return true // unknown format — fail closed
}

export class UnsafeUrlError extends Error {}

/**
 * Throws UnsafeUrlError if the URL is not a public http(s) address.
 * Returns the parsed URL on success.
 */
export async function assertPublicUrl(rawUrl: string): Promise<URL> {
  let u: URL
  try {
    u = new URL(rawUrl)
  } catch {
    throw new UnsafeUrlError('Invalid URL')
  }

  if (u.protocol !== 'http:' && u.protocol !== 'https:') {
    throw new UnsafeUrlError('Only http(s) URLs are allowed')
  }

  const host = u.hostname.toLowerCase()
  if (host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.local') || host.endsWith('.internal')) {
    throw new UnsafeUrlError('Internal hostnames are not allowed')
  }

  // If the host is already an IP literal, check it directly.
  if (net.isIP(host)) {
    if (isPrivateAddress(host)) throw new UnsafeUrlError('Private IP addresses are not allowed')
    return u
  }

  // Otherwise resolve and check every returned address.
  let addrs: Array<{ address: string }>
  try {
    addrs = await lookup(host, { all: true })
  } catch {
    throw new UnsafeUrlError('Could not resolve hostname')
  }
  if (addrs.length === 0 || addrs.some(a => isPrivateAddress(a.address))) {
    throw new UnsafeUrlError('Hostname resolves to a private address')
  }

  return u
}
