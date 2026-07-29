import type { ElevationRunner, RegistryWriteEntryResult } from '../services/elevation/elevate'
import type { RegistryClient } from '../services/registryClient'

/**
 * Applies "elevated" writes directly to a RegistryClient (normally a
 * FakeRegistryClient) with no subprocess, no manifest, no UAC - used by
 * tests and NODE_ENV=test E2E runs so nothing in CI needs real admin rights.
 */
export function createFakeElevationRunner(registry: RegistryClient): ElevationRunner {
  return async (registryPath, entries): Promise<RegistryWriteEntryResult[]> => {
    const results: RegistryWriteEntryResult[] = []
    for (const entry of entries) {
      try {
        if (entry.op === 'set') {
          await registry.setStringValue(registryPath, entry.name, entry.value ?? '')
        } else {
          await registry.deleteValue(registryPath, entry.name)
        }
        results.push({ name: entry.name, ok: true })
      } catch (error) {
        results.push({ name: entry.name, ok: false, error: error instanceof Error ? error.message : String(error) })
      }
    }
    return results
  }
}
