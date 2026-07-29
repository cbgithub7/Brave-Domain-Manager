import { readFile } from 'node:fs/promises'
import { extname } from 'node:path'
import { AppErrorException } from '../ipc/wrapHandler'

/** Parses a domain list file into raw strings (not yet validated) - one domain per line/row/array entry. */
export async function parseDomainsFromFile(filePath: string): Promise<string[]> {
  const ext = extname(filePath).toLowerCase()
  let raw: string
  try {
    raw = await readFile(filePath, 'utf-8')
  } catch (error) {
    throw new AppErrorException(
      'FILE_PARSE_ERROR',
      `Could not read ${filePath}: ${error instanceof Error ? error.message : String(error)}`
    )
  }

  if (ext === '.txt') {
    return raw
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
  }

  if (ext === '.csv') {
    return raw
      .split(/\r?\n/)
      .map((line) => line.split(',')[0]?.trim() ?? '')
      .filter(Boolean)
  }

  if (ext === '.json') {
    let parsed: unknown
    try {
      parsed = JSON.parse(raw)
    } catch {
      throw new AppErrorException('FILE_PARSE_ERROR', `${filePath} is not valid JSON.`)
    }
    if (!Array.isArray(parsed) || !parsed.every((item) => typeof item === 'string')) {
      throw new AppErrorException(
        'FILE_PARSE_ERROR',
        `${filePath} must contain a JSON array of domain strings.`
      )
    }
    return parsed
  }

  throw new AppErrorException(
    'FILE_PARSE_ERROR',
    `Unsupported file format "${ext || '(none)'}". Use .txt, .csv, or .json.`
  )
}
