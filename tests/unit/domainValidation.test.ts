import { describe, expect, it } from 'vitest'
import { validateDomain } from '../../src/shared/domainValidation'

describe('validateDomain', () => {
  it('accepts a plain domain', () => {
    const result = validateDomain('example.com')
    expect(result).toEqual({ valid: true, cleaned: 'example.com' })
  })

  it('accepts a subdomain', () => {
    const result = validateDomain('sub.example.com')
    expect(result.valid).toBe(true)
  })

  it('strips a leading protocol and www', () => {
    const result = validateDomain('https://www.example.com')
    expect(result).toEqual({ valid: true, cleaned: 'example.com' })
  })

  it('strips a trailing path', () => {
    const result = validateDomain('example.com/some/path?x=1')
    expect(result).toEqual({ valid: true, cleaned: 'example.com' })
  })

  it('trims whitespace', () => {
    const result = validateDomain('  example.com  ')
    expect(result).toEqual({ valid: true, cleaned: 'example.com' })
  })

  it('rejects an empty string instead of throwing', () => {
    const result = validateDomain('')
    expect(result.valid).toBe(false)
  })

  it('rejects free text instead of throwing (old app crashed on this)', () => {
    const result = validateDomain('not a valid domain')
    expect(result.valid).toBe(false)
    if (!result.valid) {
      expect(result.reason).toContain('not a valid domain')
    }
  })

  it('rejects a bare TLD-less string', () => {
    const result = validateDomain('localhost')
    expect(result.valid).toBe(false)
  })
})
