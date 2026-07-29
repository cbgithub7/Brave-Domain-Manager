import { useEffect, useState } from 'react'
import { LOG_CATEGORIES, type AppSettings, type LogCategory, type ThemePreference } from '@shared/settings-types'
import { Card, CardBody, CardHead } from '../../components/Card'
import styles from './SettingsTab.module.css'

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
  const [version, setVersion] = useState<string | null>(null)

  useEffect(() => {
    window.api.app.version().then((result) => {
      if (result.ok) setVersion(result.data)
    })
  }, [])

  return (
    <div className={styles.stack}>
      <Card>
        <CardHead>
          <h3>Theme</h3>
        </CardHead>
        <CardBody>
          <div className={styles.radioRow}>
            {(['system', 'light', 'dark'] as ThemePreference[]).map((option) => (
              <label key={option} className={styles.radio}>
                <input type="radio" name="theme" checked={settings.theme === option} onChange={() => onChange({ theme: option })} />
                {option === 'system' ? 'Follow system' : option[0].toUpperCase() + option.slice(1)}
              </label>
            ))}
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHead>
          <h3>Font scale</h3>
        </CardHead>
        <CardBody>
          <select
            className={styles.select}
            value={settings.fontScale}
            onChange={(event) => onChange({ fontScale: Number(event.target.value) })}
          >
            {[0.7, 0.8, 0.9, 1, 1.1, 1.2, 1.3, 1.4].map((scale) => (
              <option key={scale} value={scale}>
                {Math.round(scale * 100)}%
              </option>
            ))}
          </select>
        </CardBody>
      </Card>

      <Card>
        <CardHead>
          <h3>Logging</h3>
        </CardHead>
        <CardBody>
          <label className={styles.checkboxRow}>
            <input
              type="checkbox"
              checked={settings.logging.enabled}
              onChange={(event) => onChange({ logging: { ...settings.logging, enabled: event.target.checked } })}
            />
            Enable logging
          </label>

          <div className={styles.categoryGrid}>
            {LOG_CATEGORIES.map((category) => (
              <label key={category} className={styles.category}>
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
                />
                {CATEGORY_LABELS[category]}
              </label>
            ))}
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHead>
          <h3>About</h3>
        </CardHead>
        <CardBody>
          <p className={styles.about}>Brave Domain Manager{version ? ` — v${version}` : ''}</p>
        </CardBody>
      </Card>
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
