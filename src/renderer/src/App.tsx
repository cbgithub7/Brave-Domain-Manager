import { useState } from 'react'
import { DomainList } from './features/domains/DomainList'
import { FileImportPanel } from './features/domains/FileImportPanel'
import { TitleBar } from './features/titlebar/TitleBar'
import appIconUrl from './assets/app-icon.png'

function App(): JSX.Element {
  const [refreshSignal, setRefreshSignal] = useState(0)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <TitleBar title="Brave Domain Manager" appIcon={appIconUrl} />
      <div style={{ flex: 1, overflow: 'auto', padding: 'var(--spacing-4)' }}>
        <h1>Blocked Domains</h1>
        <DomainList refreshSignal={refreshSignal} />
        <hr style={{ margin: 'var(--spacing-4) 0', border: 'none', borderTop: '1px solid var(--color-border)' }} />
        <FileImportPanel onCommitted={() => setRefreshSignal((n) => n + 1)} />
      </div>
    </div>
  )
}

export default App
