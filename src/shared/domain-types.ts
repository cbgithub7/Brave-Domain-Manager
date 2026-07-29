export interface DomainEntry {
  /** Registry value name under URLBlocklist (an app-chosen numeric string, not user-facing). */
  name: string
  /** The actual blocked domain string. */
  domain: string
}
