import { describe, expect, it } from 'vitest'
import { shouldLog } from '../../src/main/services/logger/logger'
import { createTestLogger } from './testHelpers'

describe('shouldLog', () => {
  it('is false when logging is disabled, regardless of category list', () => {
    expect(shouldLog({ enabled: false, enabledCategories: ['audit'] }, 'audit')).toBe(false)
  })

  it('is false when logging is enabled but the category is not in the list', () => {
    expect(shouldLog({ enabled: true, enabledCategories: ['registryAccess'] }, 'audit')).toBe(false)
  })

  it('is true only when enabled AND the category is enabled', () => {
    expect(shouldLog({ enabled: true, enabledCategories: ['audit'] }, 'audit')).toBe(true)
  })

  it('never leaks a category that was never enabled, even with others enabled', () => {
    const logging = { enabled: true, enabledCategories: ['registryAccess', 'userActivity'] as const }
    expect(shouldLog(logging as never, 'audit')).toBe(false)
    expect(shouldLog(logging as never, 'registryAccess')).toBe(true)
  })
})

describe('AppLogger', () => {
  it('does not throw when logging is disabled (the default)', () => {
    const logger = createTestLogger()
    expect(() => logger.log('audit', 'info', 'should be a no-op')).not.toThrow()
  })
})
