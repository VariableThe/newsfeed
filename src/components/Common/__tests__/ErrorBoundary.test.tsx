import { describe, it, expect, afterEach } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ErrorBoundary } from '../ErrorBoundary'

afterEach(() => {
    cleanup()
})

function ThrowingChild(): never {
    throw new Error('render error')
}

describe('ErrorBoundary', () => {
    it('catches a throwing child during render', () => {
        render(
            <ErrorBoundary>
                <ThrowingChild />
            </ErrorBoundary>,
        )
        expect(screen.getByRole('alert')).toBeInTheDocument()
    })

    it('renders children when no error', () => {
        render(<ErrorBoundary>normal content</ErrorBoundary>)
        expect(screen.getByText('normal content')).toBeInTheDocument()
    })

    it('fallback receives error and reset function', () => {
        let seenMessage: string | null = null
        let seenReset: unknown = null
        render(
            <ErrorBoundary
                fallback={(err, reset) => {
                    seenMessage = err.message
                    seenReset = reset
                    return <div>handled</div>
                }}
            >
                <ThrowingChild />
            </ErrorBoundary>,
        )
        expect(screen.getByText('handled')).toBeInTheDocument()
        expect(seenMessage).toBe('render error')
        expect(typeof seenReset).toBe('function')
    })

    it('fallback resets state and renders children', async () => {
        const user = userEvent.setup()
        let shouldThrow = true
        const FlakyChild = (): string => {
            if (shouldThrow) {
                throw new Error('boom')
            }
            return 'content after reset'
        }
        render(
            <ErrorBoundary
                fallback={(error, reset) => (
                    <div>
                        <p>Error: {error.message}</p>
                        <button type="button" onClick={() => { shouldThrow = false; reset() }}>
                            Try again
                        </button>
                    </div>
                )}
            >
                <FlakyChild />
            </ErrorBoundary>,
        )
        await user.click(screen.getByRole('button', { name: /try again/i }))
        expect(screen.getByText('content after reset')).toBeInTheDocument()
    })
})
