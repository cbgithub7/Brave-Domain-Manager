import winston from 'winston'
import DailyRotateFile from 'winston-daily-rotate-file'
import type { AppSettings, LogCategory } from '@shared/settings-types'
import type { SettingsStore } from '../settingsStore'

export type LogLevel = 'info' | 'warn' | 'error'

/** Pulled out as a pure function so the actual gating decision is unit-testable
 *  without touching winston or the filesystem at all. */
export function shouldLog(logging: AppSettings['logging'], category: LogCategory): boolean {
  return logging.enabled && logging.enabledCategories.includes(category)
}

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
 *
 * Takes logDir rather than computing it from app.getPath('userData')
 * internally, so this class has no Electron dependency and can be unit
 * tested against a plain temp directory.
 */
export class AppLogger {
  private readonly winston: winston.Logger

  constructor(
    private readonly settingsStore: SettingsStore,
    logDir: string
  ) {
    this.winston = winston.createLogger({
      level: 'info',
      format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
      transports: [
        new DailyRotateFile({
          dirname: logDir,
          filename: 'app-%DATE%.log',
          datePattern: 'YYYY-MM-DD',
          maxFiles: '14d'
        })
      ]
    })
  }

  log(category: LogCategory, level: LogLevel, message: string, meta?: Record<string, unknown>): void {
    if (!shouldLog(this.settingsStore.get().logging, category)) return
    this.winston.log({ level, message, category, ...meta })
  }
}
