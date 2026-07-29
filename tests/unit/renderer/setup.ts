import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'
import '@testing-library/jest-dom/vitest'

// globals: false in vitest.config.ts means Testing Library's automatic
// afterEach cleanup (which relies on a global afterEach) never registers -
// without this, each test's rendered DOM piles up in the same document body.
afterEach(() => {
  cleanup()
})
