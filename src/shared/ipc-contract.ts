// Channel names and result types shared verbatim by main, preload, and renderer.
// Additional channel groups (domains, history, backup, settings, logs) are added
// in later phases as their services are built.

export const IPC = {
  window: {
    minimize: 'window:minimize',
    maximizeToggle: 'window:maximizeToggle',
    close: 'window:close',
    isMaximized: 'window:isMaximized',
    maximizeChanged: 'window:maximizeChanged'
  },
  domains: {
    list: 'domains:list',
    add: 'domains:add',
    remove: 'domains:remove',
    pickFile: 'domains:pickFile',
    loadFileStaged: 'domains:loadFileStaged'
  },
  history: {
    status: 'history:status',
    undo: 'history:undo',
    redo: 'history:redo'
  }
} as const

export type ErrorCode =
  | 'VALIDATION_ERROR'
  | 'REGISTRY_READ_ERROR'
  | 'REGISTRY_WRITE_ERROR'
  | 'ELEVATION_CANCELLED'
  | 'ELEVATION_FAILED'
  | 'FILE_PARSE_ERROR'
  | 'NOT_FOUND'
  | 'UNKNOWN'

export interface AppError {
  code: ErrorCode
  message: string
  details?: unknown
}

export type IpcResult<T> = { ok: true; data: T } | { ok: false; error: AppError }
