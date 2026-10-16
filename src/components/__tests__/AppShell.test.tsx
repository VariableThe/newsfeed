import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import App from '../../App';
import { createStore } from './helpers';

const state = vi.hoisted(() => ({ store: {} as Record<string, unknown> }));

vi.mock('../../state/newsStore', () => ({
    NewsProvider: ({ children }: { children: ReactNode }) => children,
    useNews: () => state.store,
}));

afterEach(() => {
    cleanup();
});

function mockShell(overrides: Record<string, unknown> = {}): void {
    state.store = createStore({
        deck: [],
        articles: [],
        filtered: [],
        isLoading: false,
        isEmpty: false,
        error: null,
        ...overrides,
    });
}

describe('App shell', () => {
    it('renders a loading state instead of fake content', () => {
        mockShell({ isLoading: true });
        render(<App />);
        expect(screen.getByRole('status', { name: 'Loading stories' })).toBeInTheDocument();
    });

    it('renders an honest error state with a working retry', async () => {
        mockShell({ error: 'all feeds failed' });
        const user = userEvent.setup();
        render(<App />);
        expect(screen.getByRole('alert')).toHaveTextContent('all feeds failed');
        await user.click(screen.getByRole('button', { name: 'Try again' }));
        expect(state.store['refresh']).toHaveBeenCalled();
    });

    it('renders an honest empty state instead of fabricated stories', () => {
        mockShell({ isEmpty: true });
        render(<App />);
        expect(screen.getByText('No stories yet')).toBeInTheDocument();
    });

    it('shows the primary tabs', () => {
        mockShell({ isEmpty: true });
        render(<App />);
        expect(screen.getByRole('navigation', { name: 'Primary' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Deck' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Feed' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Saved' })).toBeInTheDocument();
    });
});
