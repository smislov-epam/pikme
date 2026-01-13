import 'fake-indexeddb/auto'
import * as matchers from '@testing-library/jest-dom/matchers'
import { expect as vitestExpect } from 'vitest'

// Vitest's `globals: true` can still leave a non-extended `expect` on globalThis.
// Force the extended Vitest expect for RTL + jest-dom matchers.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).expect = vitestExpect
vitestExpect.extend(matchers)
