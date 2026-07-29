import { useEffect, useState } from 'react'
import type { UpdateStatus } from '@shared/update-types'

const IDLE: UpdateStatus = { state: 'idle' }

export function useUpdateStatus(): UpdateStatus {
  const [status, setStatus] = useState<UpdateStatus>(IDLE)

  useEffect(() => {
    window.api.updates.status().then((result) => {
      if (result.ok) setStatus(result.data)
    })
    return window.api.updates.onStatusChanged(setStatus)
  }, [])

  return status
}
