import { beforeEach, describe, expect, it } from 'vitest'
import { DomainService, BRAVE_URL_BLOCKLIST_PATH } from '../../src/main/services/domainService'
import { HistoryService } from '../../src/main/services/historyService'
import { FakeRegistryClient } from '../../src/main/testing/fakeRegistryClient'
import { createFakeElevationRunner } from '../../src/main/testing/fakeElevationRunner'
import { createTestLogger } from './testHelpers'

function makeService(): { service: DomainService; registry: FakeRegistryClient; history: HistoryService } {
  const registry = new FakeRegistryClient()
  const history = new HistoryService()
  const runElevated = createFakeElevationRunner(registry)
  const service = new DomainService(registry, history, createTestLogger(), runElevated)
  return { service, registry, history }
}

describe('DomainService.addDomains', () => {
  let ctx: ReturnType<typeof makeService>

  beforeEach(() => {
    ctx = makeService()
  })

  it('adds a new valid domain and allocates name "1" first', async () => {
    const result = await ctx.service.addDomains(['example.com'])
    expect(result.added).toEqual([{ name: '1', domain: 'example.com' }])
    expect(result.skipped).toEqual([])
  })

  it('skips an invalid domain with a reason instead of throwing', async () => {
    const result = await ctx.service.addDomains(['not a domain'])
    expect(result.added).toEqual([])
    expect(result.skipped).toHaveLength(1)
    expect(result.skipped[0].reason).toContain('not a valid domain')
  })

  it('skips a domain already blocked', async () => {
    await ctx.service.addDomains(['example.com'])
    const result = await ctx.service.addDomains(['example.com'])
    expect(result.added).toEqual([])
    expect(result.skipped).toEqual([{ domain: 'example.com', reason: 'Already blocked.' }])
  })

  it('skips duplicates within the same batch', async () => {
    const result = await ctx.service.addDomains(['example.com', 'example.com'])
    expect(result.added).toHaveLength(1)
    expect(result.skipped).toEqual([{ domain: 'example.com', reason: 'Already blocked.' }])
  })

  it('fills the smallest available name after a gap, not just incrementing', async () => {
    await ctx.service.addDomains(['a.com', 'b.com', 'c.com']) // names 1, 2, 3
    await ctx.service.removeDomains(['2']) // gap at 2
    const result = await ctx.service.addDomains(['d.com'])
    expect(result.added).toEqual([{ name: '2', domain: 'd.com' }])
  })

  it('pushes exactly one history entry per batch, undoable', async () => {
    const result = await ctx.service.addDomains(['a.com', 'b.com'])
    expect(result.history.canUndo).toBe(true)
    expect(result.history.undoLabel).toBe('Add 2 domains')
  })
})

describe('DomainService.removeDomains', () => {
  let ctx: ReturnType<typeof makeService>

  beforeEach(async () => {
    ctx = makeService()
    await ctx.service.addDomains(['example.com'])
  })

  it('removes an existing domain', async () => {
    const list = await ctx.service.listBlockedDomains()
    const result = await ctx.service.removeDomains([list[0].name])
    expect(result.removed).toEqual([list[0].name])
    expect(await ctx.service.listBlockedDomains()).toEqual([])
  })
})

describe('DomainService undo/redo', () => {
  let ctx: ReturnType<typeof makeService>

  beforeEach(() => {
    ctx = makeService()
  })

  it('undo of an add removes the domain, redo restores it under the same name', async () => {
    const addResult = await ctx.service.addDomains(['example.com'])
    const name = addResult.added[0].name

    const undoResult = await ctx.service.undo()
    expect(undoResult.history.canRedo).toBe(true)
    expect(await ctx.service.listBlockedDomains()).toEqual([])

    const redoResult = await ctx.service.redo()
    expect(redoResult.history.canRedo).toBe(false)
    expect(await ctx.service.listBlockedDomains()).toEqual([{ name, domain: 'example.com' }])
  })

  it('undo of a remove restores the domain under its original name, not a new one', async () => {
    await ctx.service.addDomains(['a.com', 'b.com']) // names 1, 2
    await ctx.service.removeDomains(['1']) // remove a.com

    await ctx.service.undo() // should restore a.com specifically as name "1"
    const list = await ctx.service.listBlockedDomains()
    expect(list.find((e) => e.domain === 'a.com')?.name).toBe('1')
  })

  it('throws NOT_FOUND when there is nothing to undo or redo', async () => {
    await expect(ctx.service.undo()).rejects.toMatchObject({ code: 'NOT_FOUND' })
    await expect(ctx.service.redo()).rejects.toMatchObject({ code: 'NOT_FOUND' })
  })

  it('rejects undo with HISTORY_CONFLICT if the slot was changed outside this app\'s tracking', async () => {
    const addResult = await ctx.service.addDomains(['example.com'])
    const name = addResult.added[0].name
    await ctx.service.removeDomains([name]) // undo now expects to restore name=example.com

    // Simulate external interference: something else takes the freed slot,
    // bypassing this app's history entirely.
    await ctx.registry.setStringValue(BRAVE_URL_BLOCKLIST_PATH, name, 'someone-elses-domain.com')

    await expect(ctx.service.undo()).rejects.toMatchObject({ code: 'HISTORY_CONFLICT' })
    // And the externally-written value must be untouched.
    const list = await ctx.service.listBlockedDomains()
    expect(list.find((e) => e.name === name)?.domain).toBe('someone-elses-domain.com')
  })
})
