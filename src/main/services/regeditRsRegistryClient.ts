import { RegSzValue, createKey, deleteValue, list, putValue } from 'regedit-rs'
import type { RegistryClient, RegistryValueEntry } from './registryClient'

// Compared as a string literal (not the RegistryType const enum) because
// isolatedModules disallows accessing ambient const enum members cross-module.
const REG_SZ = 'RegSz'

export class RegeditRsRegistryClient implements RegistryClient {
  async keyExists(path: string): Promise<boolean> {
    const result = await list(path)
    return result[path]?.exists ?? false
  }

  async ensureKey(path: string): Promise<void> {
    await createKey(path)
  }

  async listStringValues(path: string): Promise<RegistryValueEntry[]> {
    const result = await list(path)
    const item = result[path]
    if (!item?.exists) return []

    return Object.entries(item.values)
      .filter(([, entry]) => entry.type === REG_SZ)
      .map(([name, entry]) => ({ name, value: String(entry.value) }))
  }

  async setStringValue(path: string, name: string, value: string): Promise<void> {
    await putValue({ [path]: { [name]: new RegSzValue(value) } })
  }

  async deleteValue(path: string, name: string): Promise<void> {
    await deleteValue({ [path]: [name] })
  }
}
