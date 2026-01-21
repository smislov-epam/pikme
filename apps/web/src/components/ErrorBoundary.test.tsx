/**
 * Tests for ErrorBoundary component (REQ-107)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ErrorBoundary } from './ErrorBoundary'
import { RouterTestWrapper } from '../test/routerTestUtils'

function renderWithRouter(ui: React.ReactElement) {
  return render(<RouterTestWrapper>{ui}</RouterTestWrapper>)
}

// Component that throws an error
function ThrowError({ shouldThrow }: { shouldThrow: boolean }) {
  if (shouldThrow) {
    throw new Error('Test error message')
  }
  return <div>No error</div>
}

// Suppress console.error during tests since we expect errors
const originalError = console.error
beforeEach(() => {
  console.error = vi.fn()
})

afterEach(() => {
  console.error = originalError
})

describe('ErrorBoundary', () => {
  it('renders children when no error occurs', () => {
    renderWithRouter(
      <ErrorBoundary>
        <div>Child content</div>
      </ErrorBoundary>
    )

    expect(screen.getByText('Child content')).toBeInTheDocument()
  })

  it('renders fallback UI when error occurs', () => {
    renderWithRouter(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    )

    expect(screen.getByText('Something went wrong')).toBeInTheDocument()
    expect(screen.getByText(/We encountered an unexpected error/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Try Again/i })).toBeInTheDocument()
  })

  it('calls onError callback when error is caught', () => {
    const onError = vi.fn()

    renderWithRouter(
      <ErrorBoundary onError={onError}>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    )

    expect(onError).toHaveBeenCalledTimes(1)
    expect(onError).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Test error message' }),
      expect.objectContaining({ componentStack: expect.any(String) })
    )
  })

  it('resets error state when Try Again is clicked', async () => {
    const onReset = vi.fn()

    // Use a ref-like pattern to control throwing behavior
    const state = { shouldThrow: true }

    function ThrowOnDemand() {
      if (state.shouldThrow) {
        throw new Error('Test error message')
      }
      return <div>No error</div>
    }

    renderWithRouter(
      <ErrorBoundary onReset={onReset}>
        <ThrowOnDemand />
      </ErrorBoundary>
    )

    // Error should be shown
    expect(screen.getByText('Something went wrong')).toBeInTheDocument()

    // Fix the error condition before clicking reset
    state.shouldThrow = false

    // Click Try Again
    fireEvent.click(screen.getByRole('button', { name: /Try Again/i }))

    expect(onReset).toHaveBeenCalledTimes(1)

    // Now the child should render without error
    expect(screen.getByText('No error')).toBeInTheDocument()
  })

  it('shows technical details when expanded', () => {
    renderWithRouter(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    )

    // Details should be hidden initially
    expect(screen.queryByText(/Test error message/)).not.toBeVisible()

    // Click to expand details
    fireEvent.click(screen.getByRole('button', { name: /Technical Details/i }))

    // Now the error message should be visible in details
    expect(screen.getByText(/Test error message/)).toBeVisible()
  })

  it('shows Go Home button by default', () => {
    renderWithRouter(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    )

    expect(screen.getByRole('link', { name: /Go Home/i })).toBeInTheDocument()
  })

  it('hides Go Home button when showHomeButton is false', () => {
    renderWithRouter(
      <ErrorBoundary showHomeButton={false}>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    )

    expect(screen.queryByRole('link', { name: /Go Home/i })).not.toBeInTheDocument()
  })

  it('uses custom fallback component when provided', () => {
    const CustomFallback = ({ error, resetErrorBoundary }: { error: Error; resetErrorBoundary: () => void }) => (
      <div>
        <span>Custom error: {error.message}</span>
        <button onClick={resetErrorBoundary}>Custom Reset</button>
      </div>
    )

    renderWithRouter(
      <ErrorBoundary fallback={CustomFallback}>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    )

    expect(screen.getByText('Custom error: Test error message')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Custom Reset/i })).toBeInTheDocument()
  })

  it('logs error to console', () => {
    renderWithRouter(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    )

    expect(console.error).toHaveBeenCalledWith(
      '[ErrorBoundary] Caught error:',
      expect.objectContaining({ message: 'Test error message' })
    )
  })
})
