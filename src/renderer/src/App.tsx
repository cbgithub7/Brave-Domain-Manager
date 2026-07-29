import { useCallback, useEffect, useState } from 'react'
import type { HistoryStatus } from '@shared/history-types'
import { BackupPanel } from './features/backup/BackupPanel'
import { DomainList } from './features/domains/DomainList'
import { FileImportPanel } from './features/domains/FileImportPanel'
import { HistoryToolbar } from './features/history/HistoryToolbar'
import { SettingsTab, useSettings } from './features/settings/SettingsTab'
import { TitleBar } from './features/titlebar/TitleBar'
import appIconUrl from './assets/app-icon.png'

const EMPTY_HISTORY_STATUS: HistoryStatus = {
  canUndo: false,
  canRedo: false,
  undoLabel: null,
  redoLabel: null
}

type ActiveTab = 'domains' | 'settings'

function App(): JSX.Element {
  const [activeTab, setActiveTab] = useState<ActiveTab>('domains')
  const [refreshSignal, setRefreshSignal] = useState(0)
  const [historyStatus, setHistoryStatus] = useState<HistoryStatus>(EMPTY_HISTORY_STATUS)
  const [historyError, setHistoryError] = useState<string | null>(null)
  const { settings, updateSettings } = useSettings()

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
    } else {
      setHistoryError(result.error.message)
    }
  }, [])

  const handleRedo = useCallback(async () => {
    const result = await window.api.history.redo()
    if (result.ok) {
      setHistoryStatus(result.data.history)
      setHistoryError(null)
      setRefreshSignal((n) => n + 1)
    } else {
      setHistoryError(result.error.message)
    }
  }, [])

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
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <TitleBar title="Brave Domain Manager" appIcon={appIconUrl} />
      <HistoryToolbar status={historyStatus} onUndo={handleUndo} onRedo={handleRedo} error={historyError} />
      <div style={{ display: 'flex', gap: 'var(--spacing-2)', padding: '0 var(--spacing-4)', borderBottom: '1px solid var(--color-border)' }}>
        <button
          type="button"
          onClick={() => setActiveTab('domains')}
          style={{ fontWeight: activeTab === 'domains' ? 'bold' : 'normal' }}
        >
          Domain Management
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('settings')}
          style={{ fontWeight: activeTab === 'settings' ? 'bold' : 'normal' }}
        >
          Settings
        </button>
      </div>
      <div style={{ flex: 1, overflow: 'auto', padding: 'var(--spacing-4)' }}>
        {activeTab === 'domains' ? (
          <>
            <h1>Blocked Domains</h1>
            <DomainList refreshSignal={refreshSignal} onMutated={handleMutated} />
            <hr
              style={{ margin: 'var(--spacing-4) 0', border: 'none', borderTop: '1px solid var(--color-border)' }}
            />
            <FileImportPanel onCommitted={handleMutated} />
            <hr
              style={{ margin: 'var(--spacing-4) 0', border: 'none', borderTop: '1px solid var(--color-border)' }}
            />
            <BackupPanel onRestored={handleMutated} />
          </>
        ) : settings ? (
          <SettingsTab settings={settings} onChange={updateSettings} />
        ) : (
          <p>Loading settings…</p>
        )}
      </div>
    </div>
  )
}

export default App
