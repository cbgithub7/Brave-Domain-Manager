import type { UpdateStatus } from '@shared/update-types'
import { Pill } from '../../components/Pill'
import { UpdateBadge } from '../update/UpdateBadge'
import styles from './Rail.module.css'

export type MainView = 'domains' | 'import' | 'backup' | 'settings' | 'docs'

interface RailProps {
  active: MainView
  domainCount: number
  onSelect: (view: MainView) => void
  updateStatus: UpdateStatus
  onUpdateClick: () => void
}

export function Rail({ active, domainCount, onSelect, updateStatus, onUpdateClick }: RailProps): JSX.Element {
  const item = (view: MainView, label: string): JSX.Element => (
    <button
      type="button"
      className={[styles.item, active === view ? styles.active : ''].filter(Boolean).join(' ')}
      onClick={() => onSelect(view)}
    >
      {label}
      {view === 'domains' && <Pill tone={active === view ? 'neutral' : 'muted'}>{domainCount}</Pill>}
    </button>
  )

  return (
    <nav className={styles.rail} aria-label="Main navigation">
      <div className={styles.kicker}>Blocklist</div>
      {item('domains', 'Domains')}

      <hr className={styles.divider} />
      <div className={styles.kicker}>Actions</div>
      {item('import', 'Add from file')}
      {item('backup', 'Backup & Restore')}

      <hr className={styles.divider} />
      <div className={styles.kicker}>App</div>
      {item('settings', 'Settings')}
      {item('docs', 'Documentation')}

      <UpdateBadge status={updateStatus} onClick={onUpdateClick} />
    </nav>
  )
}
