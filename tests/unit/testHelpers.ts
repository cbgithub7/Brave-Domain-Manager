import { randomUUID } from 'node:crypto'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { AppLogger } from '../../src/main/services/logger/logger'
import { SettingsStore } from '../../src/main/services/settingsStore'

/** Logging disabled by default settings, so log() always short-circuits before touching winston - no file I/O in unit tests. */
export function createTestLogger(): AppLogger {
  const settingsStore = new SettingsStore(join(tmpdir(), `bdm-test-settings-${randomUUID()}.json`))
  return new AppLogger(settingsStore, join(tmpdir(), `bdm-test-logs-${randomUUID()}`))
}
