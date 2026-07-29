import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { DomainList } from '../../../src/renderer/src/features/domains/DomainList'
import { FeedbackLogProvider } from '../../../src/renderer/src/features/feedback/FeedbackLogContext'

function renderDomainList(): ReturnType<typeof render> {
  return render(
    <FeedbackLogProvider>
      <DomainList />
    </FeedbackLogProvider>
  )
}

describe('DomainList', () => {
  beforeEach(() => {
    // window.api is provided by the preload bridge at runtime; mock it here
    // the same way the plan's testing strategy calls for (mock window.api
    // against the shared ipc-contract types, no real Electron involved).
    ;(globalThis as { window: typeof window }).window.api = {
      domains: {
        list: vi.fn().mockResolvedValue({ ok: true, data: [{ name: '1', domain: 'example.com' }] }),
        add: vi.fn().mockResolvedValue({
          ok: true,
          data: {
            added: [{ name: '2', domain: 'new-domain.com' }],
            skipped: [],
            history: { canUndo: true, canRedo: false, undoLabel: 'Add new-domain.com', redoLabel: null }
          }
        }),
        remove: vi.fn().mockResolvedValue({
          ok: true,
          data: { removed: ['1'], failed: [], history: { canUndo: true, canRedo: false, undoLabel: null, redoLabel: null } }
        }),
        pickFile: vi.fn(),
        loadFileStaged: vi.fn()
      }
      // Unused by this component but part of the shared Api shape.
    } as never
  })

  it('renders the fetched domain list', async () => {
    renderDomainList()
    await waitFor(() => expect(screen.getByText('example.com')).toBeInTheDocument())
  })

  it('calls domains.add with the entered domain and refetches on success', async () => {
    const user = userEvent.setup()
    renderDomainList()
    await waitFor(() => expect(screen.getByText('example.com')).toBeInTheDocument())

    await user.type(screen.getByPlaceholderText('example.com'), 'new-domain.com')
    await user.click(screen.getByRole('button', { name: 'Add domain' }))

    await waitFor(() => expect(window.api.domains.add).toHaveBeenCalledWith(['new-domain.com']))
    expect(window.api.domains.list).toHaveBeenCalledTimes(2) // initial load + refresh after add
  })

  it('shows the registry-read error message when the list call fails', async () => {
    ;(window.api.domains.list as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: false,
      error: { code: 'REGISTRY_READ_ERROR', message: 'boom' }
    })
    renderDomainList()
    await waitFor(() => expect(screen.getByText('boom')).toBeInTheDocument())
  })
})
