import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { BackupService } from '../../src/main/services/backupService'
import { DomainService } from '../../src/main/services/domainService'
import { HistoryService } from '../../src/main/services/historyService'
import { FakeRegistryClient } from '../../src/main/testing/fakeRegistryClient'
import { createFakeElevationRunner } from '../../src/main/testing/fakeElevationRunner'
import { createTestLogger } from './testHelpers'

describe('BackupService', () => {
  let domainService: DomainService
  let backupService: BackupService
  let dir: string

  beforeEach(async () => {
    const registry = new FakeRegistryClient()
    const history = new HistoryService()
    const logger = createTestLogger()
    domainService = new DomainService(registry, history, logger, createFakeElevationRunner(registry))
    backupService = new BackupService(domainService, logger)
    dir = await mkdtemp(join(tmpdir(), 'bdm-backup-test-'))
  })

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true })
  })

  it('exports the current blocklist to a valid snapshot file', async () => {
    await domainService.addDomains(['a.com', 'b.com'])
    const filePath = join(dir, 'export.json')

    const result = await backupService.exportToFile(filePath)
    expect(result.count).toBe(2)

    const snapshot = JSON.parse(await readFile(filePath, 'utf-8'))
    expect(snapshot.version).toBe(1)
    expect(typeof snapshot.createdAt).toBe('string')
    expect(snapshot.domains.sort()).toEqual(['a.com', 'b.com'])
  })

  it('merge mode adds new domains and skips ones already blocked', async () => {
    await domainService.addDomains(['a.com'])
    const filePath = join(dir, 'merge.json')
    await backupService.exportToFile(filePath) // snapshot containing just a.com

    await domainService.addDomains(['b.com']) // now blocklist has a.com + b.com

    const snapshotFilePath = join(dir, 'snapshot-with-c.json')
    const fs = await import('node:fs/promises')
    await fs.writeFile(
      snapshotFilePath,
      JSON.stringify({ version: 1, createdAt: new Date(0).toISOString(), domains: ['a.com', 'c.com'] })
    )

    const result = await backupService.importFromFile(snapshotFilePath, 'merge')
    expect(result.added).toBe(1) // only c.com is new
    expect(result.skipped).toEqual([{ domain: 'a.com', reason: 'Already blocked.' }])
    expect(result.removedBeforeImport).toBe(0)

    const domains = (await domainService.listBlockedDomains()).map((e) => e.domain).sort()
    expect(domains).toEqual(['a.com', 'b.com', 'c.com'])
  })

  it('replace mode clears the current list before restoring from the snapshot', async () => {
    await domainService.addDomains(['a.com', 'b.com'])
    const filePath = join(dir, 'original.json')
    await backupService.exportToFile(filePath)

    await domainService.addDomains(['c.com']) // blocklist now a, b, c

    const result = await backupService.importFromFile(filePath, 'replace')
    expect(result.removedBeforeImport).toBe(3)
    expect(result.added).toBe(2)

    const domains = (await domainService.listBlockedDomains()).map((e) => e.domain).sort()
    expect(domains).toEqual(['a.com', 'b.com'])
  })

  it('rejects a non-JSON file with FILE_PARSE_ERROR', async () => {
    const filePath = join(dir, 'bad.json')
    const fs = await import('node:fs/promises')
    await fs.writeFile(filePath, 'not json at all')

    await expect(backupService.importFromFile(filePath, 'merge')).rejects.toMatchObject({
      code: 'FILE_PARSE_ERROR'
    })
  })

  it('rejects a JSON file that is not a valid snapshot shape', async () => {
    const filePath = join(dir, 'wrong-shape.json')
    const fs = await import('node:fs/promises')
    await fs.writeFile(filePath, JSON.stringify({ foo: 'bar' }))

    await expect(backupService.importFromFile(filePath, 'merge')).rejects.toMatchObject({
      code: 'FILE_PARSE_ERROR'
    })
  })
})
