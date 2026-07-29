export const LOG_CATEGORIES = [
  'startupShutdown',
  'registryAccess',
  'successError',
  'userActivity',
  'configChanges',
  'audit',
  'performance',
  'security'
] as const

export type LogCategory = (typeof LOG_CATEGORIES)[number]

export type ThemePreference = 'light' | 'dark' | 'system'

export interface AppSettings {
  theme: ThemePreference
  fontScale: number
  logging: {
    enabled: boolean
    enabledCategories: LogCategory[]
  }
}

export const DEFAULT_SETTINGS: AppSettings = {
  theme: 'system',
  fontScale: 1,
  logging: {
    enabled: false,
    enabledCategories: []
  }
}
