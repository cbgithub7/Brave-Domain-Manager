import type { UpdateStatus } from '@shared/update-types'
import styles from './UpdateBadge.module.css'

interface UpdateBadgeProps {
  status: UpdateStatus
  onClick: () => void
}

/** Hidden entirely at idle/checking/not-available/error - only ever visible
 *  once there's actually something for the user to act on or watch progress. */
export function UpdateBadge({ status, onClick }: UpdateBadgeProps): JSX.Element | null {
  if (status.state === 'downloaded') {
    return (
      <div className={styles.footer}>
        <button type="button" className={`${styles.badge} ${styles.ready}`} onClick={onClick}>
          <span className={styles.dot} />
          Update ready — v{status.version}
        </button>
      </div>
    )
  }

  if (status.state === 'available' || status.state === 'downloading') {
    const label =
      status.state === 'downloading' ? `Downloading update… ${status.percent}%` : 'Update available'
    return (
      <div className={styles.footer}>
        <div className={styles.badge}>
          <span className={styles.dot} />
          {label}
        </div>
      </div>
    )
  }

  return null
}
