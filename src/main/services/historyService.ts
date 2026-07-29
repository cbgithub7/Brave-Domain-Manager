import type { HistoryStatus } from '@shared/history-types'
import type { RegistryWriteEntry } from './elevation/elevate'

/** Same shape as RegistryWriteEntry - reused directly rather than a parallel type, since a
 *  history mutation IS just a registry write entry that undo/redo replays through the same
 *  elevated batch path. */
export type DomainMutation = RegistryWriteEntry

export interface HistoryAction {
  id: string
  timestamp: number
  label: string
  /** The mutations that were actually applied (redo replays these). */
  apply: DomainMutation[]
  /** The inverse mutations that reverse this action (undo replays these). */
  invert: DomainMutation[]
}

/**
 * Session-scoped undo/redo stack. Deliberately in-memory only (not
 * persisted) - distinct from backup/restore, which is a deliberate
 * long-term snapshot the user creates on purpose. This is what the old app
 * attempted and never finished: it spawned a fresh PowerShell process per
 * action, so any history would have died with that process immediately;
 * here it just lives for the app's session, in the one long-lived main
 * process.
 */
export class HistoryService {
  private undoStack: HistoryAction[] = []
  private redoStack: HistoryAction[] = []

  /** Records a newly-applied action. Any new mutation clears the redo stack - standard editor model. */
  push(action: HistoryAction): void {
    this.undoStack.push(action)
    this.redoStack = []
  }

  peekUndo(): HistoryAction | undefined {
    return this.undoStack[this.undoStack.length - 1]
  }

  peekRedo(): HistoryAction | undefined {
    return this.redoStack[this.redoStack.length - 1]
  }

  /** Call only after the undo action's invert mutations were actually applied successfully. */
  commitUndo(): HistoryAction | undefined {
    const action = this.undoStack.pop()
    if (action) this.redoStack.push(action)
    return action
  }

  /** Call only after the redo action's apply mutations were actually applied successfully. */
  commitRedo(): HistoryAction | undefined {
    const action = this.redoStack.pop()
    if (action) this.undoStack.push(action)
    return action
  }

  status(): HistoryStatus {
    return {
      canUndo: this.undoStack.length > 0,
      canRedo: this.redoStack.length > 0,
      undoLabel: this.peekUndo()?.label ?? null,
      redoLabel: this.peekRedo()?.label ?? null
    }
  }
}
