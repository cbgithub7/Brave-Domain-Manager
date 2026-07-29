// Builds resources/helpers/registry-write-helper.exe: a copy of node.exe
// (plain Node, not Electron - avoids depending on ELECTRON_RUN_AS_NODE
// environment-variable inheritance through the elevated relaunch, which is
// unreliable) with its manifest patched to
// requestedExecutionLevel=requireAdministrator, via app-builder-bin's rcedit
// subcommand - the same tool electron-builder itself uses internally to edit
// Windows exe resources (the standalone `rcedit` npm package is archived, so
// this reuses what's already actively maintained instead of a dead
// dependency).
//
// The manifest alone does NOT make a plain child_process.spawn() elevate -
// CreateProcess (which spawn uses) has no UAC consent UI. Only ShellExecute
// (e.g. PowerShell's Start-Process -Verb RunAs) actually shows the prompt;
// see src/main/services/elevation/elevate.ts. The manifest is still worth
// keeping as defense in depth / correct metadata for the exe.
//
// Copies whichever Node binary is running this script (process.execPath) -
// fine for now since this only runs at build time on a dev/CI machine, not
// on end-user machines. Revisit if build reproducibility across Node
// versions becomes a concern.
import { spawn } from 'node:child_process'
import { copyFileSync, existsSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { appBuilderPath } from 'app-builder-bin'

const root = join(import.meta.dirname, '..')
const nodeBin = process.execPath
const helperDir = join(root, 'resources', 'helpers')
const helperExe = join(helperDir, 'registry-write-helper.exe')

if (!existsSync(nodeBin)) {
  console.error('node binary not found at', nodeBin)
  process.exit(1)
}

mkdirSync(helperDir, { recursive: true })
copyFileSync(nodeBin, helperExe)

const rceditArgs = [
  helperExe,
  '--set-requested-execution-level',
  'requireAdministrator',
  '--set-version-string',
  'FileDescription',
  'Brave Domain Manager Registry Helper',
  '--set-version-string',
  'ProductName',
  'Brave Domain Manager Registry Helper'
]

await new Promise((resolve, reject) => {
  const child = spawn(appBuilderPath, ['rcedit', '--args', JSON.stringify(rceditArgs)], {
    stdio: 'inherit'
  })
  child.on('error', reject)
  child.on('exit', (code) => {
    if (code === 0) resolve()
    else reject(new Error(`app-builder rcedit exited with code ${code}`))
  })
})

console.log('Prepared elevated helper:', helperExe)
