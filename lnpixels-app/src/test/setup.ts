import '@testing-library/jest-dom'
import { beforeAll, vi } from 'vitest'

// Mock Next.js router
const mockRouter = {
  push: vi.fn(),
  replace: vi.fn(),
  prefetch: vi.fn(),
  back: vi.fn(),
  forward: vi.fn(),
  refresh: vi.fn(),
  pathname: '/',
  query: {},
  asPath: '/',
}

vi.mock('next/router', () => ({
  useRouter: () => mockRouter,
}))

// Mock next/navigation for App Router
vi.mock('next/navigation', () => ({
  useRouter: () => mockRouter,
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}))

// Mock socket.io-client
vi.mock('socket.io-client', () => ({
  io: vi.fn(() => ({
    on: vi.fn(),
    off: vi.fn(),
    emit: vi.fn(),
    disconnect: vi.fn(),
  })),
}))

// Mock zustand stores
vi.mock('zustand', () => ({
  create: vi.fn((fn) => fn(() => ({}), () => ({}))),
}))

// Global test setup
beforeAll(() => {
  // Add any global setup here
})
