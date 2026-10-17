import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { DeckView } from '../DeckView';
import { createStore, makeArticle } from './helpers';

const state = vi.hoisted(() => ({ store: {} as Record<string, unknown> }));

vi.mock('../../state/newsStore', () => ({
    NewsProvider: ({ children }: { children: ReactNode }) => children,
    useNews: () => state.store,
}));

afterEach(() => {
    cleanup();
});

const first = makeArticle({ id: 'n-aaa', headline: 'First story headline' });
const second = makeArticle({ id: 'n-bbb', headline: 'Second story headline' });

function mockDeck(): void {
    state.store = createStore({
        deck: [first, second],
        articles: [first, second],
        saved: [],
        trendingIds: new Set(['n-aaa']),
    });
}

describe('DeckView', () => {
    it('renders the top article with its source and relative time', () => {
        mockDeck();
        render(<DeckView />);
        expect(screen.getByText('First story headline')).toBeInTheDocument();
        expect(screen.getByText('BBC World')).toBeInTheDocument();
        expect(screen.getByText(/min read/)).toBeInTheDocument();
    });

    it('shows a trending badge only for trending ids', () => {
        mockDeck();
        render(<DeckView />);
        expect(screen.getByText('Trending')).toBeInTheDocument();
    });

    it('skip calls markRead with the current article id', async () => {
        mockDeck();
        const user = userEvent.setup();
        render(<DeckView />);
        await user.click(screen.getByRole('button', { name: 'Skip story' }));
        expect(state.store['markRead']).toHaveBeenCalledWith('n-aaa');
    });

    it('save calls toggleSaved with the current article id', async () => {
        mockDeck();
        const user = userEvent.setup();
        render(<DeckView />);
        await user.click(screen.getByRole('button', { name: 'Save story' }));
        expect(state.store['toggleSaved']).toHaveBeenCalledWith('n-aaa');
    });

    it('open navigates to the article view', async () => {
        mockDeck();
        const user = userEvent.setup();
        render(<DeckView />);
        await user.click(screen.getByRole('button', { name: 'Open article' }));
        expect(state.store['openArticle']).toHaveBeenCalledWith('n-aaa');
    });

    it('window-level ArrowLeft/ArrowRight keydowns skip and save the front article', () => {
        mockDeck();
        render(<DeckView />);
        window.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }));
        expect(state.store['markRead']).toHaveBeenCalledWith('n-aaa');
        window.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
        expect(state.store['toggleSaved']).toHaveBeenCalledWith('n-aaa');
    });

    it('window-level ArrowUp and Enter keydowns open the front article', () => {
        mockDeck();
        render(<DeckView />);
        window.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }));
        expect(state.store['openArticle']).toHaveBeenCalledWith('n-aaa');
    });

    it('keyboard handler is inert while a dialog is open', () => {
        mockDeck();
        render(
            <>
                <div role="dialog" aria-label="overlay" />
                <DeckView />
            </>,
        );
        window.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }));
        window.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
        window.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
        expect(state.store['markRead']).not.toHaveBeenCalled();
        expect(state.store['toggleSaved']).not.toHaveBeenCalled();
        expect(state.store['openArticle']).not.toHaveBeenCalled();
    });

    it('keyboard handler is inert when focus is inside a text input', () => {
        mockDeck();
        render(
            <>
                <input aria-label="deck search" />
                <DeckView />
            </>,
        );
        const input = screen.getByRole('textbox', { name: 'deck search' });
        input.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }));
        expect(state.store['markRead']).not.toHaveBeenCalled();
    });

    it('keyboard handler is inert when the deck is empty', () => {
        state.store = createStore({ deck: [], articles: [] });
        render(<DeckView />);
        window.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }));
        expect(state.store['markRead']).not.toHaveBeenCalled();
    });

    it('renders an honest empty state when the deck is empty', () => {
        state.store = createStore({ deck: [], articles: [] });
        render(<DeckView />);
        expect(screen.getByText("You're all caught up")).toBeInTheDocument();
    });

    it('renders a loading status while stories load', () => {
        state.store = createStore({ deck: [], isLoading: true });
        render(<DeckView />);
        expect(screen.getByRole('status', { name: 'Loading stories' })).toBeInTheDocument();
    });
});
