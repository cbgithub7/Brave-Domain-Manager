import { useCallback, useEffect, useRef, useState } from 'react'
import type { HistoryStatus } from '@shared/history-types'
import { BackupPanel } from './features/backup/BackupPanel'
import { DocsTab } from './features/docs/DocsTab'
import { DomainList } from './features/domains/DomainList'
import { FileImportPanel } from './features/domains/FileImportPanel'
import { FeedbackLogProvider, useFeedbackLog } from './features/feedback/FeedbackLogContext'
import { FeedbackLogPanel } from './features/feedback/FeedbackLogPanel'
import { HistoryToolbar } from './features/history/HistoryToolbar'
import { Inspector } from './features/shell/Inspector'
import { Rail, type MainView } from './features/shell/Rail'
import { SettingsTab, useSettings } from './features/settings/SettingsTab'
import { TitleBar } from './features/titlebar/TitleBar'
import { UpdateDialog } from './features/update/UpdateDialog'
import { useUpdateStatus } from './features/update/useUpdateStatus'
import appIconUrl from './assets/app-icon.png'
import styles from './App.module.css'

const EMPTY_HISTORY_STATUS: HistoryStatus = {
  canUndo: false,
  canRedo: false,
  undoLabel: null,
  redoLabel: null
}

function AppContent(): JSX.Element {
  const [activeView, setActiveView] = useState<MainView>('domains')
  const [refreshSignal, setRefreshSignal] = useState(0)
  const [domainCount, setDomainCount] = useState(0)
  const [historyStatus, setHistoryStatus] = useState<HistoryStatus>(EMPTY_HISTORY_STATUS)
  const [historyError, setHistoryError] = useState<string | null>(null)
  const { settings, updateSettings } = useSettings()
  const feedback = useFeedbackLog()
  const updateStatus = useUpdateStatus()
  const [updateDialogOpen, setUpdateDialogOpen] = useState(false)
  const lastUpdateState = useRef(updateStatus.state)

  useEffect(() => {
    if (updateStatus.state === lastUpdateState.current) return
    lastUpdateState.current = updateStatus.state
    if (updateStatus.state === 'available') {
      feedback.push('info', `Update v${updateStatus.version} is available — downloading in the background.`)
    } else if (updateStatus.state === 'downloaded') {
      feedback.push('success', `Update v${updateStatus.version} is ready — click Update in the sidebar to install.`)
    }
  }, [updateStatus, feedback])

  useEffect(() => {
    window.api.history.status().then((result) => {
      if (result.ok) setHistoryStatus(result.data)
    })
  }, [])

  useEffect(() => {
    if (!settings) return
    const root = document.documentElement
    if (settings.theme === 'system') {
      delete root.dataset.theme
    } else {
      root.dataset.theme = settings.theme
    }
    root.style.setProperty('--font-scale', String(settings.fontScale))
  }, [settings])

  const handleMutated = useCallback((status: HistoryStatus) => {
    setHistoryStatus(status)
    setHistoryError(null)
    setRefreshSignal((n) => n + 1)
  }, [])

  const handleUndo = useCallback(async () => {
    const result = await window.api.history.undo()
    if (result.ok) {
      setHistoryStatus(result.data.history)
      setHistoryError(null)
      setRefreshSignal((n) => n + 1)
      feedback.push('success', `Undid: ${result.data.label}`)
    } else {
      setHistoryError(result.error.message)
      feedback.push('error', result.error.message)
    }
  }, [feedback])

  const handleRedo = useCallback(async () => {
    const result = await window.api.history.redo()
    if (result.ok) {
      setHistoryStatus(result.data.history)
      setHistoryError(null)
      setRefreshSignal((n) => n + 1)
      feedback.push('success', `Redid: ${result.data.label}`)
    } else {
      setHistoryError(result.error.message)
      feedback.push('error', result.error.message)
    }
  }, [feedback])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent): void => {
      const target = event.target as HTMLElement | null
      const isEditable =
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target?.isContentEditable

      // Never hijack native undo/redo inside a text field.
      if (isEditable) return

      const key = event.key.toLowerCase()
      if ((event.ctrlKey || event.metaKey) && key === 'z' && !event.shiftKey) {
        event.preventDefault()
        handleUndo()
      } else if (
        (event.ctrlKey || event.metaKey) &&
        (key === 'y' || (key === 'z' && event.shiftKey))
      ) {
        event.preventDefault()
        handleRedo()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleUndo, handleRedo])

  return (
    <div className={styles.shell}>
      <TitleBar title="Brave Domain Manager" appIcon={appIconUrl} />
      <HistoryToolbar status={historyStatus} onUndo={handleUndo} onRedo={handleRedo} error={historyError} />
      <div className={styles.body}>
        <Rail
          active={activeView}
          domainCount={domainCount}
          onSelect={setActiveView}
          updateStatus={updateStatus}
          onUpdateClick={() => setUpdateDialogOpen(true)}
        />
        <div className={styles.main}>
          {activeView === 'domains' && (
            <DomainList refreshSignal={refreshSignal} onMutated={handleMutated} onCountChange={setDomainCount} />
          )}
          {activeView === 'import' && (
            <div className={`${styles.mainScroll} ${styles.viewPadded}`}>
              <FileImportPanel onCommitted={handleMutated} />
            </div>
          )}
          {activeView === 'backup' && (
            <div className={`${styles.mainScroll} ${styles.viewPadded}`}>
              <BackupPanel onRestored={handleMutated} />
            </div>
          )}
          {activeView === 'settings' &&
            (settings ? (
              <div className={`${styles.mainScroll} ${styles.viewPadded}`}>
                <SettingsTab settings={settings} onChange={updateSettings} />
              </div>
            ) : (
              <p className={styles.viewPadded}>Loading settings…</p>
            ))}
          {activeView === 'docs' && (
            <div className={styles.mainScroll}>
              <DocsTab />
            </div>
          )}
        </div>
        {activeView === 'domains' && (
          <Inspector
            domainCount={domainCount}
            historyStatus={historyStatus}
            loggingEnabled={settings?.logging.enabled ?? false}
          />
        )}
      </div>
      <FeedbackLogPanel />

      {updateDialogOpen && updateStatus.state === 'downloaded' && (
        <UpdateDialog
          version={updateStatus.version}
          releaseNotes={updateStatus.releaseNotes}
          onDismiss={() => setUpdateDialogOpen(false)}
          onInstall={() => window.api.updates.install()}
        />
      )}
    </div>
  )
}

function App(): JSX.Element {
  return (
    <FeedbackLogProvider>
      <AppContent />
    </FeedbackLogProvider>
  )
}

export default App
