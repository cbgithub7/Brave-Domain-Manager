import type { DomainEntry } from '@shared/domain-types'
import { AppErrorException } from '../ipc/wrapHandler'
import { runElevatedRegistryBatch } from './elevation/elevate'
import type { RegistryClient } from './registryClient'

export const BRAVE_URL_BLOCKLIST_PATH = 'HKLM\\SOFTWARE\\Policies\\BraveSoftware\\Brave\\URLBlocklist'

/** Smallest positive integer not already used as a registry value name. */
function getNextAvailableName(existingNames: string[]): string {
  const used = new Set(
    existingNames.map(Number).filter((n) => Number.isInteger(n) && n > 0)
  )
  let candidate = 1
  while (used.has(candidate)) candidate++
  return String(candidate)
}

export class DomainService {
  constructor(private readonly registry: RegistryClient) {}

  async listBlockedDomains(): Promise<DomainEntry[]> {
    const entries = await this.registry.listStringValues(BRAVE_URL_BLOCKLIST_PATH)
    return entries.map((entry) => ({ name: entry.name, domain: entry.value }))
  }

  async addDomain(domain: string): Promise<DomainEntry> {
    const existing = await this.registry.listStringValues(BRAVE_URL_BLOCKLIST_PATH)

    if (existing.some((entry) => entry.value === domain)) {
      throw new AppErrorException('VALIDATION_ERROR', `${domain} is already blocked.`)
    }

    const name = getNextAvailableName(existing.map((entry) => entry.name))
    const results = await runElevatedRegistryBatch(BRAVE_URL_BLOCKLIST_PATH, [
      { op: 'set', name, value: domain }
    ])

    const result = results[0]
    if (!result?.ok) {
      throw new AppErrorException(
        'REGISTRY_WRITE_ERROR',
        result?.error ?? `Failed to add ${domain}.`
      )
    }

    return { name, domain }
  }

  async removeDomain(name: string): Promise<void> {
    const results = await runElevatedRegistryBatch(BRAVE_URL_BLOCKLIST_PATH, [
      { op: 'delete', name }
    ])

    const result = results[0]
    if (!result?.ok) {
      throw new AppErrorException(
        'REGISTRY_WRITE_ERROR',
        result?.error ?? `Failed to remove domain at ${name}.`
      )
    }
  }
}
