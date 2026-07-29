import { join } from 'node:path'
import { app } from 'electron'

/**
 * Resolves the app's resources/ directory correctly in both dev (project
 * root, via app.getAppPath()) and packaged (process.resourcesPath, since
 * extraResources copies files there, outside app.asar - the helper exe
 * can't execute from inside an asar archive anyway) contexts.
 */
export function getResourcesDir(): string {
  return app.isPackaged ? process.resourcesPath : join(app.getAppPath(), 'resources')
}
