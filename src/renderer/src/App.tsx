import { useCallback, useEffect, useState } from 'react'
import type { HistoryStatus } from '@shared/history-types'
import { DomainList } from './features/domains/DomainList'
import { FileImportPanel } from './features/domains/FileImportPanel'
import { HistoryToolbar } from './features/history/HistoryToolbar'
import { TitleBar } from './features/titlebar/TitleBar'
import appIconUrl from './assets/app-icon.png'

const EMPTY_HISTORY_STATUS: HistoryStatus = {
  canUndo: false,
  canRedo: false,
  undoLabel: null,
  redoLabel: null
}

function App(): JSX.Element {
  const [refreshSignal, setRefreshSignal] = useState(0)
  const [historyStatus, setHistoryStatus] = useState<HistoryStatus>(EMPTY_HISTORY_STATUS)
  const [historyError, setHistoryError] = useState<string | null>(null)

  useEffect(() => {
    window.api.history.status().then((result) => {
      if (result.ok) setHistoryStatus(result.data)
    })
  }, [])

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
      <div style={{ flex: 1, overflow: 'auto', padding: 'var(--spacing-4)' }}>
        <h1>Blocked Domains</h1>
        <DomainList refreshSignal={refreshSignal} onMutated={handleMutated} />
        <hr
          style={{ margin: 'var(--spacing-4) 0', border: 'none', borderTop: '1px solid var(--color-border)' }}
        />
        <FileImportPanel onCommitted={handleMutated} />
      </div>
    </div>
  )
}

export default App
