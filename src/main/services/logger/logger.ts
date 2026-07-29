import { join } from 'node:path'
import { app } from 'electron'
import winston from 'winston'
import DailyRotateFile from 'winston-daily-rotate-file'
import type { LogCategory } from '@shared/settings-types'
import type { SettingsStore } from '../settingsStore'

export type LogLevel = 'info' | 'warn' | 'error'

/**
 * Every log call funnels through this one method, which gate-checks
 * settings.logging on every call - this is the structural fix for the old
 * app's 8 log-category checkboxes never actually being wired to anything:
 * there is exactly one call site logging can go through, so no call site
 * can forget the check. Settings changes take effect on the very next log
 * call, no restart needed (unlike the old app's logging-requires-restart
 * flow).
 *
 * winston, not pino: pino's worker-thread transports have a known rough
 * edge under asar-packaged Electron apps, and this app's log volume is
 * trivial either way, so pino's throughput advantage buys nothing here.
 */
export class AppLogger {
  private readonly winston: winston.Logger

  constructor(private readonly settingsStore: SettingsStore) {
    this.winston = winston.createLogger({
      level: 'info',
      format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
      transports: [
        new DailyRotateFile({
          dirname: join(app.getPath('userData'), 'logs'),
          filename: 'app-%DATE%.log',
          datePattern: 'YYYY-MM-DD',
          maxFiles: '14d'
        })
      ]
    })
  }

  log(category: LogCategory, level: LogLevel, message: string, meta?: Record<string, unknown>): void {
    const { logging } = this.settingsStore.get()
    if (!logging.enabled || !logging.enabledCategories.includes(category)) return
    this.winston.log({ level, message, category, ...meta })
  }
}
