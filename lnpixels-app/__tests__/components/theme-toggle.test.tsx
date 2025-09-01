import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { ThemeToggle } from '@/components/theme-toggle'

// Mock localStorage
const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
}
Object.defineProperty(window, 'localStorage', { value: mockLocalStorage })

// Mock matchMedia
const mockMatchMedia = vi.fn()
Object.defineProperty(window, 'matchMedia', { value: mockMatchMedia })

describe('ThemeToggle', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset document classes
    document.documentElement.className = ''
    // Default to light mode
    mockMatchMedia.mockReturnValue({ matches: false })
    mockLocalStorage.getItem.mockReturnValue(null)
  })

  it('should render with sun icon initially when not mounted', () => {
    render(<ThemeToggle />)

    const button = screen.getByRole('button')
    expect(button).toBeInTheDocument()

    // Should show sun icon initially
    const sunIcon = screen.getByTestId('sun-icon') || document.querySelector('.lucide-sun')
    expect(sunIcon).toBeInTheDocument()
  })

  it('should initialize with light theme by default', async () => {
    render(<ThemeToggle />)

    await waitFor(() => {
      expect(mockLocalStorage.getItem).toHaveBeenCalledWith('theme')
      expect(mockMatchMedia).toHaveBeenCalledWith('(prefers-color-scheme: dark)')
    })

    // Should not have dark class initially
    expect(document.documentElement.classList.contains('dark')).toBe(false)
  })

  it('should initialize with dark theme when localStorage has dark', async () => {
    mockLocalStorage.getItem.mockReturnValue('dark')

    render(<ThemeToggle />)

    await waitFor(() => {
      expect(document.documentElement.classList.contains('dark')).toBe(true)
    })
  })

  it('should initialize with dark theme when system prefers dark and no localStorage', async () => {
    mockLocalStorage.getItem.mockReturnValue(null)
    mockMatchMedia.mockReturnValue({ matches: true })

    render(<ThemeToggle />)

    await waitFor(() => {
      expect(document.documentElement.classList.contains('dark')).toBe(true)
    })
  })

  it('should toggle from light to dark theme', async () => {
    render(<ThemeToggle />)

    // Wait for component to mount
    await waitFor(() => {
      expect(mockLocalStorage.getItem).toHaveBeenCalledWith('theme')
    })

    const button = screen.getByRole('button')

    // Click to toggle to dark
    fireEvent.click(button)

    await waitFor(() => {
      expect(document.documentElement.classList.contains('dark')).toBe(true)
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('theme', 'dark')
    })
  })

  it('should toggle from dark to light theme', async () => {
    mockLocalStorage.getItem.mockReturnValue('dark')

    render(<ThemeToggle />)

    // Wait for component to mount with dark theme
    await waitFor(() => {
      expect(document.documentElement.classList.contains('dark')).toBe(true)
    })

    const button = screen.getByRole('button')

    // Click to toggle to light
    fireEvent.click(button)

    await waitFor(() => {
      expect(document.documentElement.classList.contains('dark')).toBe(false)
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('theme', 'light')
    })
  })

  it('should have proper accessibility attributes', async () => {
    render(<ThemeToggle />)

    const button = screen.getByRole('button')
    const screenReaderText = screen.getByText('Toggle theme')

    expect(button).toBeInTheDocument()
    expect(screenReaderText).toBeInTheDocument()
    expect(screenReaderText).toHaveClass('sr-only')
  })

  it('should show both sun and moon icons', async () => {
    render(<ThemeToggle />)

    // Wait for component to mount
    await waitFor(() => {
      expect(mockLocalStorage.getItem).toHaveBeenCalledWith('theme')
    })

    // Both icons should be present (one visible, one hidden based on theme)
    const sunIcon = document.querySelector('.lucide-sun')
    const moonIcon = document.querySelector('.lucide-moon')

    expect(sunIcon).toBeInTheDocument()
    expect(moonIcon).toBeInTheDocument()
  })

  it('should handle rapid clicks correctly', async () => {
    render(<ThemeToggle />)

    // Wait for component to mount
    await waitFor(() => {
      expect(mockLocalStorage.getItem).toHaveBeenCalledWith('theme')
    })

    const button = screen.getByRole('button')

    // Rapid clicks
    fireEvent.click(button)
    fireEvent.click(button)
    fireEvent.click(button)

    // Should end up in the correct state (odd number of clicks = opposite of initial)
    await waitFor(() => {
      expect(mockLocalStorage.setItem).toHaveBeenCalledTimes(3)
    })
  })
})
