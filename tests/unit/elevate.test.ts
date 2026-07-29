import { describe, expect, it } from 'vitest'
import { buildElevationPsScript } from '../../src/main/services/elevation/elevate'

describe('buildElevationPsScript', () => {
  it('never uses an array-form -ArgumentList (breaks silently on a spaced path with -Verb RunAs)', () => {
    const script = buildElevationPsScript(
      'D:/Applications/Brave Domain Manager/resources/helpers/registry-write-helper.exe',
      'D:/Applications/Brave Domain Manager/resources/helpers/registryWriteHelper.js',
      'C:/temp/payload.json',
      'C:/temp/result.json'
    )
    expect(script).not.toContain('-ArgumentList @(')
  })

  it('passes a single pre-quoted string containing all three double-quoted paths', () => {
    const script = buildElevationPsScript(
      'D:/Applications/Brave Domain Manager/resources/helpers/registry-write-helper.exe',
      'D:/Applications/Brave Domain Manager/resources/helpers/registryWriteHelper.js',
      'C:/temp/payload.json',
      'C:/temp/result.json'
    )
    expect(script).toContain(
      `-ArgumentList '"D:/Applications/Brave Domain Manager/resources/helpers/registryWriteHelper.js" "C:/temp/payload.json" "C:/temp/result.json"'`
    )
  })

  it('quotes the helper exe path for -FilePath', () => {
    const script = buildElevationPsScript(
      'D:/Applications/Brave Domain Manager/resources/helpers/registry-write-helper.exe',
      'script.js',
      'payload.json',
      'result.json'
    )
    expect(script).toContain(
      `-FilePath 'D:/Applications/Brave Domain Manager/resources/helpers/registry-write-helper.exe'`
    )
  })

  it('exits with the elevated process exit code', () => {
    const script = buildElevationPsScript('helper.exe', 'script.js', 'payload.json', 'result.json')
    expect(script.endsWith('exit $p.ExitCode')).toBe(true)
  })
})
