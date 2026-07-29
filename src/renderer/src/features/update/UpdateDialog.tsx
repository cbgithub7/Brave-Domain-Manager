import { Button } from '../../components/Button'
import { Card, CardBody, CardHead } from '../../components/Card'
import styles from './UpdateDialog.module.css'

interface UpdateDialogProps {
  version: string
  releaseNotes: string | null
  onInstall: () => void
  onDismiss: () => void
}

/** Shown when the update badge is clicked in the 'downloaded' state - release
 *  notes are shown before the user commits to the disruptive restart, as a
 *  confirmation step, not applied silently. */
export function UpdateDialog({ version, releaseNotes, onInstall, onDismiss }: UpdateDialogProps): JSX.Element {
  return (
    <div className={styles.overlay} onClick={onDismiss}>
      <div className={styles.dialog} onClick={(event) => event.stopPropagation()}>
        <Card>
          <CardHead>
            <h3>Update ready — v{version}</h3>
          </CardHead>
          <CardBody>
            <p className={styles.intro}>
              This update has already downloaded in the background. Installing will restart the app.
            </p>
            {releaseNotes && <div className={styles.notes}>{releaseNotes}</div>}
            <div className={styles.actions}>
              <Button onClick={onDismiss}>Later</Button>
              <Button variant="primary" onClick={onInstall}>
                Install &amp; Restart
              </Button>
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  )
}
