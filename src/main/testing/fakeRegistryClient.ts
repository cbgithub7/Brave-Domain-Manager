import type { RegistryClient, RegistryValueEntry } from '../services/registryClient'

/**
 * In-memory stand-in for the real registry, used by every automated test so
 * nothing touches the actual Windows registry or requires elevation in CI.
 */
export class FakeRegistryClient implements RegistryClient {
  private keys = new Map<string, Map<string, string>>()

  async keyExists(path: string): Promise<boolean> {
    return this.keys.has(path)
  }

  async ensureKey(path: string): Promise<void> {
    if (!this.keys.has(path)) this.keys.set(path, new Map())
  }

  async listStringValues(path: string): Promise<RegistryValueEntry[]> {
    const values = this.keys.get(path)
    if (!values) return []
    return Array.from(values.entries()).map(([name, value]) => ({ name, value }))
  }

  async setStringValue(path: string, name: string, value: string): Promise<void> {
    await this.ensureKey(path)
    this.keys.get(path)!.set(name, value)
  }

  async deleteValue(path: string, name: string): Promise<void> {
    this.keys.get(path)?.delete(name)
  }
}
