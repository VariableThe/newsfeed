import type { ReactElement, ReactNode } from 'react';

interface EmptyStateProps {
    icon?: ReactNode;
    title: string;
    description?: string;
    action?: { label: string; onClick: () => void };
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps): ReactElement {
    return (
        <div className="px-6 py-12 text-center">
            {icon ? (
                <div aria-hidden="true" className="mx-auto mb-4 flex h-12 w-12 items-center justify-center text-[var(--color-secondary-text)]">
                    {icon}
                </div>
            ) : null}
            <h3 className="text-lg font-semibold text-[var(--color-primary-text)]">{title}</h3>
            {description ? (
                <p className="mt-2 text-sm text-[var(--color-secondary-text)]">{description}</p>
            ) : null}
            {action ? (
                <div className="mt-5">
                    <button
                        type="button"
                        onClick={action.onClick}
                        className="inline-flex min-h-[44px] items-center rounded-lg bg-[var(--color-accent)] px-5 font-medium text-white"
                    >
                        {action.label}
                    </button>
                </div>
            ) : null}
        </div>
    );
}
