import type { ReactElement, ReactNode } from 'react';

interface IconButtonProps {
    label: string;
    onClick: () => void;
    children: ReactNode;
    variant?: 'ghost' | 'solid' | 'outline';
    className?: string;
    disabled?: boolean;
    ariaPressed?: boolean;
}

const variantClasses: Record<'ghost' | 'solid' | 'outline', string> = {
    ghost: 'border border-transparent text-[var(--color-secondary-text)] hover:text-[var(--color-primary-text)] hover:bg-[var(--color-card-border)]',
    solid: 'bg-[var(--color-accent)] text-white hover:opacity-90',
    outline: 'border border-[var(--color-card-border)] text-[var(--color-primary-text)] hover:border-[var(--color-accent)]',
};

export function IconButton({
    label,
    onClick,
    children,
    variant = 'ghost',
    className = '',
    disabled = false,
    ariaPressed,
}: IconButtonProps): ReactElement {
    return (
        <button
            type="button"
            aria-label={label}
            aria-pressed={ariaPressed}
            onClick={disabled ? undefined : onClick}
            disabled={disabled}
            className={`inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent)] disabled:cursor-not-allowed disabled:opacity-50 ${variantClasses[variant]} ${className}`}
        >
            {children}
        </button>
    );
}
