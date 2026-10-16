import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { FeedView } from '../FeedView';
import { createStore, makeArticle } from './helpers';

const state = vi.hoisted(() => ({ store: {} as Record<string, unknown> }));

vi.mock('../../state/newsStore', () => ({
    NewsProvider: ({ children }: { children: ReactNode }) => children,
    useNews: () => state.store,
}));

afterEach(() => {
    cleanup();
});

const tech = makeArticle({
    id: 'n-tech',
    headline: 'Tech breakthrough story',
    source: 'New York Times Technology',
    sourceId: 'nyt-technology',
    sourceUrl: 'https://www.nytimes.com/section/technology/breakthrough',
    tags: ['Tech'],
});

const world = makeArticle({
    id: 'n-world',
    headline: 'World summit story',
    tags: ['World'],
});

function mockFeed(): void {
    state.store = createStore({
        articles: [tech, world],
        filtered: [tech],
        query: 'breakthrough',
        filters: { topics: ['Tech'], sources: [], unreadOnly: false },
        lastUpdated: '2026-10-16T10:00:00.000Z',
        feedHealth: [
            { sourceId: 'bbc-world', name: 'BBC World', status: 'success', count: 12 },
            { sourceId: 'nyt-technology', name: 'NYT Tech', status: 'error', count: 0, error: 'upstream timeout failure' },
        ],
    });
}

describe('FeedView', () => {
    it('shows an honest N of M line when filters are active', () => {
        mockFeed();
        render(<FeedView />);
        expect(screen.getByText('1 of 2 stories')).toBeInTheDocument();
    });

    it('search input is bound to setQuery', async () => {
        mockFeed();
        const user = userEvent.setup();
        render(<FeedView />);
        const input = screen.getByRole('searchbox', { name: 'Search stories' });
        expect(input).toHaveValue('breakthrough');
        await user.clear(input);
        await user.type(input, 'summit');
        expect(state.store['setQuery']).toHaveBeenCalled();
    });

    it('topic chips toggle the filter', async () => {
        mockFeed();
        const user = userEvent.setup();
        render(<FeedView />);
        await user.click(screen.getByRole('button', { name: 'Tech' }));
        expect(state.store['toggleTopic']).toHaveBeenCalledWith('Tech');
    });

    it('clear filters button is available when filters are active', async () => {
        mockFeed();
        const user = userEvent.setup();
        render(<FeedView />);
        await user.click(screen.getByRole('button', { name: 'Clear filters' }));
        expect(state.store['clearFilters']).toHaveBeenCalled();
    });

    it('save toggle calls toggleSaved', async () => {
        mockFeed();
        const user = userEvent.setup();
        render(<FeedView />);
        await user.click(screen.getByRole('button', { name: `Save ${tech.headline}` }));
        expect(state.store['toggleSaved']).toHaveBeenCalledWith('n-tech');
    });

    it('failed feeds show a retry wired to refreshFeed', async () => {
        mockFeed();
        const user = userEvent.setup();
        render(<FeedView />);
        expect(screen.getByText('Feeds needing attention')).toBeInTheDocument();
        await user.click(screen.getByRole('button', { name: 'Retry' }));
        expect(state.store['refreshFeed']).toHaveBeenCalledWith('nyt-technology');
    });
});
