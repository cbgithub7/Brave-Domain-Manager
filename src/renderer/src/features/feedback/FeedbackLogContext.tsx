import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'

export type FeedbackLevel = 'info' | 'success' | 'warn' | 'error'

export interface FeedbackEntry {
  id: string
  level: FeedbackLevel
  message: string
  timestamp: number
}

interface FeedbackLogContextValue {
  entries: FeedbackEntry[]
  push: (level: FeedbackLevel, message: string) => void
  clear: () => void
}

const FeedbackLogContext = createContext<FeedbackLogContextValue | null>(null)

const MAX_ENTRIES = 200

export function FeedbackLogProvider({ children }: { children: ReactNode }): JSX.Element {
  const [entries, setEntries] = useState<FeedbackEntry[]>([])

  const push = useCallback((level: FeedbackLevel, message: string) => {
    setEntries((prev) => {
      const next = [...prev, { id: `${Date.now()}-${Math.random()}`, level, message, timestamp: Date.now() }]
      return next.length > MAX_ENTRIES ? next.slice(next.length - MAX_ENTRIES) : next
    })
  }, [])

  const clear = useCallback(() => setEntries([]), [])

  const value = useMemo(() => ({ entries, push, clear }), [entries, push, clear])

  return <FeedbackLogContext.Provider value={value}>{children}</FeedbackLogContext.Provider>
}

export function useFeedbackLog(): FeedbackLogContextValue {
  const context = useContext(FeedbackLogContext)
  if (!context) throw new Error('useFeedbackLog must be used within a FeedbackLogProvider')
  return context
}
