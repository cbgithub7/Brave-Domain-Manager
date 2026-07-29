import { DomainList } from './features/domains/DomainList'
import { TitleBar } from './features/titlebar/TitleBar'
import appIconUrl from './assets/app-icon.png'

function App(): JSX.Element {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <TitleBar title="Brave Domain Manager" appIcon={appIconUrl} />
      <div style={{ flex: 1, overflow: 'auto', padding: 'var(--spacing-4)' }}>
        <h1>Blocked Domains</h1>
        <DomainList />
      </div>
    </div>
  )
}

export default App
