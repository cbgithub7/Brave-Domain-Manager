import { TitleBar } from './features/titlebar/TitleBar'
import appIconUrl from './assets/app-icon.png'

function App(): JSX.Element {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <TitleBar title="Brave Domain Manager" appIcon={appIconUrl} />
      <div style={{ flex: 1, overflow: 'auto', padding: 'var(--spacing-4)' }}>
        <h1>Brave Domain Manager</h1>
        <p>Electron/React rewrite scaffold — domain management UI lands in the next phases.</p>
      </div>
    </div>
  )
}

export default App
