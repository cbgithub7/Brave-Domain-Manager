import { randomUUID } from 'node:crypto'
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { app } from 'electron'
import { DEFAULT_SETTINGS, type AppSettings } from '@shared/settings-types'

/**
 * One JSON object, in and out - replaces the old app's ad-hoc per-widget
 * config.ini reads, which is exactly what caused its settings-tab crash (a
 * stale font_slider reference nothing else validated). Atomic write via
 * temp-file-then-rename so a crash or power loss mid-write can't corrupt the
 * settings file. Skips electron-store: its current major is ESM-only, which
 * fights electron-vite's default CJS main build for no real benefit here.
 */
export class SettingsStore {
  private settings: AppSettings = DEFAULT_SETTINGS
  private readonly filePath = join(app.getPath('userData'), 'settings.json')

  async load(): Promise<AppSettings> {
    try {
      const raw = await readFile(this.filePath, 'utf-8')
      const parsed = JSON.parse(raw) as Partial<AppSettings>
      this.settings = {
        ...DEFAULT_SETTINGS,
        ...parsed,
        logging: { ...DEFAULT_SETTINGS.logging, ...(parsed.logging ?? {}) }
      }
    } catch {
      this.settings = DEFAULT_SETTINGS
    }
    return this.settings
  }

  get(): AppSettings {
    return this.settings
  }

  async set(patch: Partial<AppSettings>): Promise<AppSettings> {
    this.settings = {
      ...this.settings,
      ...patch,
      logging: { ...this.settings.logging, ...(patch.logging ?? {}) }
    }
    await this.persist()
    return this.settings
  }

  private async persist(): Promise<void> {
    await mkdir(dirname(this.filePath), { recursive: true })
    const tmpPath = `${this.filePath}.tmp-${randomUUID()}`
    await writeFile(tmpPath, JSON.stringify(this.settings, null, 2), 'utf-8')
    await rename(tmpPath, this.filePath)
  }
}
