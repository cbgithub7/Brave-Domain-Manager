// Runs elevated, via registry-write-helper.exe (a manifest-patched copy of
// electron.exe) launched with ELECTRON_RUN_AS_NODE=1. Deliberately plain
// CommonJS, not part of the TS/Vite build: this file (and the exe wrapping
// it) is a standalone artifact, not app UI code.
//
// Reads a batch payload from argv[2] (a JSON file path: { path, entries }),
// applies each entry against the registry, and writes per-entry results to
// argv[3] - never assume a whole batch either fully succeeded or fully
// failed, since undo/redo correctness depends on knowing exactly which
// entries actually applied.
const fs = require('fs')
const regedit = require('regedit-rs')

async function main() {
  const [payloadPath, resultPath] = process.argv.slice(2)
  if (!payloadPath || !resultPath) {
    console.error('usage: registryWriteHelper.js <payloadPath> <resultPath>')
    process.exit(1)
  }

  const payload = JSON.parse(fs.readFileSync(payloadPath, 'utf-8'))
  const { path: regPath, entries } = payload

  await regedit.createKey(regPath)

  const results = []
  for (const entry of entries) {
    try {
      if (entry.op === 'set') {
        await regedit.putValue({ [regPath]: { [entry.name]: new regedit.RegSzValue(entry.value) } })
      } else if (entry.op === 'delete') {
        await regedit.deleteValue({ [regPath]: [entry.name] })
      } else {
        throw new Error(`Unknown op: ${entry.op}`)
      }
      results.push({ name: entry.name, ok: true })
    } catch (err) {
      results.push({ name: entry.name, ok: false, error: err && err.message ? err.message : String(err) })
    }
  }

  fs.writeFileSync(resultPath, JSON.stringify({ results }))
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    try {
      const resultPath = process.argv[3]
      if (resultPath) {
        fs.writeFileSync(
          resultPath,
          JSON.stringify({ results: [], fatalError: err && err.message ? err.message : String(err) })
        )
      }
    } catch {
      // best-effort; the parent will time out / see a missing result file
    }
    process.exit(1)
  })
