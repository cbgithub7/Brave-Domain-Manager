import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { UpdateStatus } from '../../../src/shared/update-types'
import { UpdateBadge } from '../../../src/renderer/src/features/update/UpdateBadge'
import { useUpdateStatus } from '../../../src/renderer/src/features/update/useUpdateStatus'

function mockApiUpdates(status: UpdateStatus): { onStatusChanged: ReturnType<typeof vi.fn> } {
  const onStatusChanged = vi.fn().mockReturnValue(() => {})
  ;(globalThis as { window: typeof window }).window.api = {
    updates: {
      status: vi.fn().mockResolvedValue({ ok: true, data: status }),
      install: vi.fn(),
      onStatusChanged
    }
  } as never
  return { onStatusChanged }
}

function HookProbe(): JSX.Element {
  const status = useUpdateStatus()
  return <UpdateBadge status={status} onClick={() => {}} />
}

describe('UpdateBadge', () => {
  it('renders nothing at idle', () => {
    mockApiUpdates({ state: 'idle' })
    const { container } = render(<HookProbe />)
    expect(container).toBeEmptyDOMElement()
  })

  it('shows an available indicator once the hook picks up the initial status', async () => {
    mockApiUpdates({ state: 'available', version: '1.2.0', releaseNotes: null })
    render(<HookProbe />)
    await waitFor(() => expect(screen.getByText('Update available')).toBeInTheDocument())
  })

  it('shows download percent while downloading', async () => {
    mockApiUpdates({ state: 'downloading', percent: 42 })
    render(<HookProbe />)
    await waitFor(() => expect(screen.getByText('Downloading update… 42%')).toBeInTheDocument())
  })

  it('is clickable once downloaded, and calls onClick', async () => {
    mockApiUpdates({ state: 'downloaded', version: '1.2.0', releaseNotes: null })
    const onClick = vi.fn()
    function Probe(): JSX.Element {
      const status = useUpdateStatus()
      return <UpdateBadge status={status} onClick={onClick} />
    }
    render(<Probe />)
    const button = await screen.findByRole('button', { name: /Update ready/ })
    const user = userEvent.setup()
    await user.click(button)
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('applies a status pushed later via onStatusChanged', async () => {
    let pushStatus: ((status: UpdateStatus) => void) | undefined
    ;(globalThis as { window: typeof window }).window.api = {
      updates: {
        status: vi.fn().mockResolvedValue({ ok: true, data: { state: 'idle' } }),
        install: vi.fn(),
        onStatusChanged: vi.fn().mockImplementation((cb: (status: UpdateStatus) => void) => {
          pushStatus = cb
          return () => {}
        })
      }
    } as never

    function Probe(): JSX.Element {
      const status = useUpdateStatus()
      return <UpdateBadge status={status} onClick={() => {}} />
    }
    render(<Probe />)
    await waitFor(() => expect(pushStatus).toBeDefined())
    pushStatus?.({ state: 'downloaded', version: '2.0.0', releaseNotes: null })
    await waitFor(() => expect(screen.getByText(/Update ready — v2\.0\.0/)).toBeInTheDocument())
  })
})
