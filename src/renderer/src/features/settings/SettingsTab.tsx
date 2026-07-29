import { useEffect, useState } from 'react'
import { LOG_CATEGORIES, type AppSettings, type LogCategory, type ThemePreference } from '@shared/settings-types'

const CATEGORY_LABELS: Record<LogCategory, string> = {
  startupShutdown: 'Startup/Shutdown',
  registryAccess: 'Registry Access',
  successError: 'Success/Error',
  userActivity: 'User Activity',
  configChanges: 'Configuration Changes',
  audit: 'Audit',
  performance: 'Performance',
  security: 'Security'
}

interface SettingsTabProps {
  settings: AppSettings
  onChange: (patch: Partial<AppSettings>) => void
}

export function SettingsTab({ settings, onChange }: SettingsTabProps): JSX.Element {
  return (
    <div>
      <h2>Theme</h2>
      <div style={{ display: 'flex', gap: 'var(--spacing-3)', marginBottom: 'var(--spacing-4)' }}>
        {(['system', 'light', 'dark'] as ThemePreference[]).map((option) => (
          <label key={option}>
            <input
              type="radio"
              name="theme"
              checked={settings.theme === option}
              onChange={() => onChange({ theme: option })}
            />{' '}
            {option === 'system' ? 'Follow system' : option[0].toUpperCase() + option.slice(1)}
          </label>
        ))}
      </div>

      <h2>Font scale</h2>
      <div style={{ marginBottom: 'var(--spacing-4)' }}>
        <select
          value={settings.fontScale}
          onChange={(event) => onChange({ fontScale: Number(event.target.value) })}
        >
          {[0.7, 0.8, 0.9, 1, 1.1, 1.2, 1.3, 1.4].map((scale) => (
            <option key={scale} value={scale}>
              {Math.round(scale * 100)}%
            </option>
          ))}
        </select>
      </div>

      <h2>Logging</h2>
      <label style={{ display: 'block', marginBottom: 'var(--spacing-2)' }}>
        <input
          type="checkbox"
          checked={settings.logging.enabled}
          onChange={(event) => onChange({ logging: { ...settings.logging, enabled: event.target.checked } })}
        />{' '}
        Enable logging
      </label>

      <div style={{ paddingLeft: 'var(--spacing-4)' }}>
        {LOG_CATEGORIES.map((category) => (
          <label key={category} style={{ display: 'block' }}>
            <input
              type="checkbox"
              disabled={!settings.logging.enabled}
              checked={settings.logging.enabledCategories.includes(category)}
              onChange={(event) => {
                const enabledCategories = event.target.checked
                  ? [...settings.logging.enabledCategories, category]
                  : settings.logging.enabledCategories.filter((c) => c !== category)
                onChange({ logging: { ...settings.logging, enabledCategories } })
              }}
            />{' '}
            {CATEGORY_LABELS[category]}
          </label>
        ))}
      </div>
    </div>
  )
}

export function useSettings(): {
  settings: AppSettings | null
  updateSettings: (patch: Partial<AppSettings>) => Promise<void>
} {
  const [settings, setSettings] = useState<AppSettings | null>(null)

  useEffect(() => {
    window.api.settings.get().then((result) => {
      if (result.ok) setSettings(result.data)
    })
  }, [])

  const updateSettings = async (patch: Partial<AppSettings>): Promise<void> => {
    const result = await window.api.settings.set(patch)
    if (result.ok) setSettings(result.data)
  }

  return { settings, updateSettings }
}
