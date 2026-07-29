export interface HistoryStatus {
  canUndo: boolean
  canRedo: boolean
  undoLabel: string | null
  redoLabel: string | null
}

export interface UndoRedoResult {
  label: string
  history: HistoryStatus
}
