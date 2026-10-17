import { Component } from 'react';
import type { ReactNode } from 'react';

interface ErrorBoundaryProps {
    children: ReactNode;
    fallback?: (error: Error, reset: () => void) => ReactNode;
}

interface ErrorBoundaryState {
    hasError: boolean;
    error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
    constructor(props: ErrorBoundaryProps) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error): ErrorBoundaryState {
        return { hasError: true, error };
    }

    componentDidCatch(): void {
        // Intentionally quiet: the fallback UI carries the user-facing message.
    }

    private handleReset = (): void => {
        this.setState({ hasError: false, error: null });
    };

    render(): ReactNode {
        const { fallback, children } = this.props;
        const { hasError, error } = this.state;

        if (hasError) {
            if (fallback && error) {
                return fallback(error, this.handleReset);
            }
            return (
                <div
                    role="alert"
                    className="rounded-xl border border-[var(--color-card-border)] bg-[var(--color-card-dark)] p-4 text-[var(--color-primary-text)]"
                >
                    <p className="text-sm font-medium">Something went wrong.</p>
                    <button
                        type="button"
                        onClick={this.handleReset}
                        className="mt-3 inline-flex min-h-[44px] items-center rounded-lg border border-[var(--color-card-border)] px-4 text-sm font-medium text-[var(--color-primary-text)]"
                    >
                        Try again
                    </button>
                </div>
            );
        }

        return children;
    }
}

export const ErrorBoundaryComponent = ErrorBoundary;
