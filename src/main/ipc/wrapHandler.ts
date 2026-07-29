import type { AppError, ErrorCode, IpcResult } from '@shared/ipc-contract'

/** Throw this from any service/handler; wrapHandler turns it into structured IpcResult data. */
export class AppErrorException extends Error {
  code: ErrorCode
  details?: unknown

  constructor(code: ErrorCode, message: string, details?: unknown) {
    super(message)
    this.code = code
    this.details = details
  }
}

/**
 * Wraps an ipcMain.handle callback so any throw - AppErrorException or not -
 * becomes { ok: false, error } instead of an uncaught rejection. This is the
 * structural fix for the old app's crash-on-invalid-domain bug: handlers
 * never need their own try/catch, so nothing can escape uncaught by omission.
 */
export function wrapHandler<Args extends unknown[], T>(
  fn: (...args: Args) => Promise<T>
): (...args: Args) => Promise<IpcResult<T>> {
  return async (...args: Args) => {
    try {
      const data = await fn(...args)
      return { ok: true, data }
    } catch (error) {
      const appError: AppError =
        error instanceof AppErrorException
          ? { code: error.code, message: error.message, details: error.details }
          : { code: 'UNKNOWN', message: error instanceof Error ? error.message : String(error) }
      return { ok: false, error: appError }
    }
  }
}
