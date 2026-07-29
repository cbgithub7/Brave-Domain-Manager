import { describe, expect, it } from 'vitest'
import { HistoryService, type HistoryAction } from '../../src/main/services/historyService'

function makeAction(label: string): HistoryAction {
  return {
    id: label,
    timestamp: 0,
    label,
    apply: [{ op: 'set', name: '1', value: label }],
    invert: [{ op: 'delete', name: '1' }]
  }
}

describe('HistoryService', () => {
  it('starts with nothing to undo or redo', () => {
    const history = new HistoryService()
    expect(history.status()).toEqual({ canUndo: false, canRedo: false, undoLabel: null, redoLabel: null })
  })

  it('makes a pushed action undoable', () => {
    const history = new HistoryService()
    history.push(makeAction('Add a'))
    expect(history.status()).toEqual({ canUndo: true, canRedo: false, undoLabel: 'Add a', redoLabel: null })
  })

  it('moves an action from undo to redo on commitUndo', () => {
    const history = new HistoryService()
    history.push(makeAction('Add a'))
    const undone = history.commitUndo()
    expect(undone?.label).toBe('Add a')
    expect(history.status()).toEqual({ canUndo: false, canRedo: true, undoLabel: null, redoLabel: 'Add a' })
  })

  it('moves an action back from redo to undo on commitRedo', () => {
    const history = new HistoryService()
    history.push(makeAction('Add a'))
    history.commitUndo()
    const redone = history.commitRedo()
    expect(redone?.label).toBe('Add a')
    expect(history.status()).toEqual({ canUndo: true, canRedo: false, undoLabel: 'Add a', redoLabel: null })
  })

  it('processes undo/redo strictly in LIFO order (most recent action first)', () => {
    const history = new HistoryService()
    history.push(makeAction('first'))
    history.push(makeAction('second'))
    expect(history.commitUndo()?.label).toBe('second')
    expect(history.commitUndo()?.label).toBe('first')
    expect(history.status().canUndo).toBe(false)
  })

  it('clears the redo stack when a new action is pushed - the invariant that prevents stale redos from colliding with reused registry slots', () => {
    const history = new HistoryService()
    history.push(makeAction('first'))
    history.commitUndo()
    expect(history.status().canRedo).toBe(true)

    history.push(makeAction('second'))
    expect(history.status()).toEqual({ canUndo: true, canRedo: false, undoLabel: 'second', redoLabel: null })
  })

  it('commitUndo/commitRedo return undefined when the respective stack is empty', () => {
    const history = new HistoryService()
    expect(history.commitUndo()).toBeUndefined()
    expect(history.commitRedo()).toBeUndefined()
  })
})
