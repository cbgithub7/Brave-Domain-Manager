export interface RegistryValueEntry {
  name: string
  value: string
}

/**
 * Seam between the rest of the app and the actual Windows registry.
 * Everything outside this file talks to a RegistryClient, never to the
 * native binding directly - that's what makes FakeRegistryClient possible
 * for tests, and lets the real implementation be swapped without touching
 * callers.
 */
export interface RegistryClient {
  keyExists(path: string): Promise<boolean>
  ensureKey(path: string): Promise<void>
  listStringValues(path: string): Promise<RegistryValueEntry[]>
  setStringValue(path: string, name: string, value: string): Promise<void>
  deleteValue(path: string, name: string): Promise<void>
}
