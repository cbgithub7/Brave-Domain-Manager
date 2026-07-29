// Shared by main (authoritative) and renderer (instant feedback) so
// validation can never drift between the two, unlike the old app where the
// Python UI validated one way and the PowerShell script trusted its input
// blindly. Never throws - the old app crashed on invalid manual/file input
// because the exception couldn't reach the feedback UI cleanly; this returns
// a result instead.
const DOMAIN_PATTERN = /^([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}$/

export type DomainValidationResult = { valid: true; cleaned: string } | { valid: false; reason: string }

export function validateDomain(rawDomain: string): DomainValidationResult {
  let cleaned = rawDomain.trim()
  cleaned = cleaned.replace(/^(https?:\/\/)?(www\.)?/i, '')
  cleaned = cleaned.replace(/\/.+$/, '')

  if (!cleaned || !DOMAIN_PATTERN.test(cleaned)) {
    return {
      valid: false,
      reason: `"${rawDomain}" is not a valid domain. Use [subdomain.]domain.tld format.`
    }
  }

  return { valid: true, cleaned }
}
