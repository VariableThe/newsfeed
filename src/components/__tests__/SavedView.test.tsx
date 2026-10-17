import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { SavedView } from '../SavedView';
import { createStore, makeArticle } from './helpers';

const state = vi.hoisted(() => ({ store: {} as Record<string, unknown> }));

vi.mock('../../state/newsStore', () => ({
    NewsProvider: ({ children }: { children: ReactNode }) => children,
    useNews: () => state.store,
}));

afterEach(() => {
    cleanup();
});

const savedArticle = makeArticle({ id: 'n-saved', headline: 'Saved for later story' });

describe('SavedView', () => {
    it('renders saved snapshots and opens them', async () => {
        state.store = createStore({ saved: [savedArticle] });
        const user = userEvent.setup();
        render(<SavedView />);
        expect(screen.getByText('Saved for later story')).toBeInTheDocument();
        await user.click(screen.getByRole('button', { name: 'Saved for later story' }));
        expect(state.store['openArticle']).toHaveBeenCalledWith('n-saved');
    });

    it('unsave removes the snapshot', async () => {
        state.store = createStore({ saved: [savedArticle] });
        const user = userEvent.setup();
        render(<SavedView />);
        await user.click(
            screen.getByRole('button', { name: 'Remove Saved for later story from saved' }),
        );
        expect(state.store['unsaveArticle']).toHaveBeenCalledWith('n-saved');
    });

    it('renders an empty state instead of fake rows', () => {
        state.store = createStore({ saved: [] });
        render(<SavedView />);
        expect(screen.getByText('No saved stories')).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: /Remove/ })).not.toBeInTheDocument();
    });
});
