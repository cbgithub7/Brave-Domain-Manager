import type { DomainEntry } from '@shared/domain-types'
import type { RegistryClient } from './registryClient'

export const BRAVE_URL_BLOCKLIST_PATH = 'HKLM\\SOFTWARE\\Policies\\BraveSoftware\\Brave\\URLBlocklist'

export class DomainService {
  constructor(private readonly registry: RegistryClient) {}

  async listBlockedDomains(): Promise<DomainEntry[]> {
    const entries = await this.registry.listStringValues(BRAVE_URL_BLOCKLIST_PATH)
    return entries.map((entry) => ({ name: entry.name, domain: entry.value }))
  }
}
