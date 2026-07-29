import { randomUUID } from 'node:crypto'
import { spawn } from 'node:child_process'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { AppErrorException } from '../../ipc/wrapHandler'
import { getResourcesDir } from '../../resourcePaths'

export interface RegistryWriteEntry {
  op: 'set' | 'delete'
  name: string
  value?: string
}

export interface RegistryWriteEntryResult {
  name: string
  ok: boolean
  error?: string
}

interface HelperResultFile {
  results?: RegistryWriteEntryResult[]
  fatalError?: string
}

/** Injectable seam for domainService - production wiring defaults to runElevatedRegistryBatch;
 *  tests inject a fake that applies straight to a FakeRegistryClient, no UAC/native binding involved. */
export type ElevationRunner = (
  registryPath: string,
  entries: RegistryWriteEntry[]
) => Promise<RegistryWriteEntryResult[]>

function getHelperExePath(): string {
  return join(getResourcesDir(), 'helpers', 'registry-write-helper.exe')
}

function getHelperScriptPath(): string {
  return join(getResourcesDir(), 'helpers', 'registryWriteHelper.js')
}

function psQuote(value: string): string {
  return `'${value.replace(/'/g, "''")}'`
}

/**
 * Pulled out as a pure function so this exact bug can be regression-tested
 * without spawning a real elevated process: -ArgumentList as an ARRAY is
 * unreliable when combined with -Verb (which forces the ShellExecuteEx/UAC
 * code path instead of plain CreateProcess) - PowerShell does not reliably
 * quote array elements that themselves contain a space, so a spaced install
 * path (e.g. "Brave Domain Manager") can silently get split into multiple
 * separate argv entries, corrupting the command line. Node then crashes on
 * the garbled argv before our own code ever runs, so no result file gets
 * written and no diagnostic reaches us. The fix is to pass -ArgumentList a
 * single pre-quoted string instead of an array.
 */
export function buildElevationPsScript(
  helperExePath: string,
  helperScriptPath: string,
  payloadPath: string,
  resultPath: string
): string {
  const helperArgsString = [helperScriptPath, payloadPath, resultPath].map((value) => `"${value}"`).join(' ')
  return (
    `$p = Start-Process -FilePath ${psQuote(helperExePath)} ` +
    `-ArgumentList ${psQuote(helperArgsString)} -Verb RunAs -Wait -PassThru -WindowStyle Hidden; ` +
    `exit $p.ExitCode`
  )
}

/**
 * Runs a batch of registry writes elevated. Launched via PowerShell's
 * Start-Process -Verb RunAs, which goes through ShellExecute/the AppInfo
 * service - the actual path that shows the UAC consent prompt. A plain
 * child_process.spawn() of the helper exe does NOT elevate on its own: spawn
 * uses CreateProcess, which has no consent UI and just fails outright
 * (confirmed empirically - it throws EACCES) even with requireAdministrator
 * in the target's manifest. The manifest is still embedded as defense in
 * depth / correct metadata, but ShellExecute is what actually does the work.
 *
 * Always batch everything that needs writing into one call: one UAC prompt
 * per user action, never one per domain.
 */
export async function runElevatedRegistryBatch(
  registryPath: string,
  entries: RegistryWriteEntry[]
): Promise<RegistryWriteEntryResult[]> {
  const dir = await mkdtemp(join(tmpdir(), 'bdm-'))
  const payloadPath = join(dir, `payload-${randomUUID()}.json`)
  const resultPath = join(dir, `result-${randomUUID()}.json`)

  try {
    await writeFile(payloadPath, JSON.stringify({ path: registryPath, entries }), 'utf-8')

    const psScript = buildElevationPsScript(getHelperExePath(), getHelperScriptPath(), payloadPath, resultPath)

    let exitCode = 0
    let stderr = ''
    await new Promise<void>((resolve, reject) => {
      const child = spawn('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', psScript], {
        windowsHide: true
      })

      child.stderr?.on('data', (chunk: Buffer) => {
        stderr += chunk.toString()
      })

      child.on('error', reject)
      child.on('exit', (code) => {
        exitCode = code ?? 1
        resolve()
      })
    })

    // The helper (running elevated, via ShellExecute) can't have its stdio
    // redirected back to us - Start-Process rejects -Verb RunAs combined with
    // -RedirectStandard* outright, since ShellExecute doesn't inherit handles
    // across the elevation boundary. So even when the launcher script itself
    // exited non-zero, the helper may still have gotten far enough to write a
    // real fatalError to resultPath before dying - always prefer that over
    // the launcher's own generic exit code.
    const resultFile = await readFile(resultPath, 'utf-8').catch(() => null)
    if (resultFile) {
      const parsed = JSON.parse(resultFile) as HelperResultFile
      if (parsed.fatalError) {
        throw new AppErrorException('ELEVATION_FAILED', parsed.fatalError)
      }
      if (exitCode === 0) {
        return parsed.results ?? []
      }
    }

    if (exitCode !== 0) {
      const message = stderr.trim() || `Elevated helper exited with code ${exitCode}`
      // Windows error 1223 ("The operation was canceled by the user") is what
      // CreateProcess reports when the user dismisses the UAC prompt.
      if (/cancel/i.test(message) || message.includes('1223')) {
        throw new AppErrorException('ELEVATION_CANCELLED', 'The elevation request was cancelled.')
      }
      throw new AppErrorException('ELEVATION_FAILED', message)
    }

    throw new AppErrorException('ELEVATION_FAILED', 'The registry helper did not produce a result.')
  } catch (error) {
    if (error instanceof AppErrorException) throw error
    const message = error instanceof Error ? error.message : String(error)
    if (/cancel/i.test(message) || message.includes('1223')) {
      throw new AppErrorException('ELEVATION_CANCELLED', 'The elevation request was cancelled.')
    }
    throw new AppErrorException('ELEVATION_FAILED', message)
  } finally {
    await rm(dir, { recursive: true, force: true }).catch(() => {})
  }
}
