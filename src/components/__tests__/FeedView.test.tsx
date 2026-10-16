import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { FeedView } from '../FeedView';
import { formatDateTime } from '../../lib/format';
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

function filterPanel(): HTMLElement {
    const panel = document.getElementById('feed-filters-panel');
    if (panel === null) throw new Error('filter panel is not rendered');
    return panel;
}

describe('FeedView', () => {
    it('shows an honest N of M line when filters are active', () => {
        mockFeed();
        render(<FeedView />);
        expect(screen.getByText('1 of 2 stories')).toBeInTheDocument();
    });

    it('shows the plain story count when no filters are active', () => {
        state.store = createStore({
            articles: [tech, world],
            filtered: [tech, world],
            query: '',
            filters: { topics: [], sources: [], unreadOnly: false },
        });
        render(<FeedView />);
        expect(screen.getByText('2 stories')).toBeInTheDocument();
    });

    it('collapses the filter panel by default and keeps its chips out of reach', () => {
        mockFeed();
        render(<FeedView />);
        const toggle = screen.getByRole('button', { name: 'Filters · 1' });
        expect(toggle).toHaveAttribute('aria-expanded', 'false');
        expect(toggle).toHaveAttribute('aria-controls', 'feed-filters-panel');
        expect(filterPanel()).toHaveAttribute('hidden');
        expect(screen.queryByRole('group', { name: 'Topics' })).not.toBeInTheDocument();
        expect(screen.queryByRole('group', { name: 'Sources' })).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'Tech' })).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'BBC World' })).not.toBeInTheDocument();
    });

    it('reveals the chips on expand and still filters with them', async () => {
        mockFeed();
        const user = userEvent.setup();
        render(<FeedView />);
        const toggle = screen.getByRole('button', { name: 'Filters · 1' });

        await user.click(toggle);

        expect(toggle).toHaveAttribute('aria-expanded', 'true');
        expect(filterPanel()).not.toHaveAttribute('hidden');
        expect(screen.getByRole('group', { name: 'Topics' })).toBeInTheDocument();
        expect(screen.getByRole('group', { name: 'Sources' })).toBeInTheDocument();

        const topicChip = screen.getByRole('button', { name: 'Tech' });
        expect(topicChip).toHaveAttribute('aria-pressed', 'true');
        await user.click(topicChip);
        expect(state.store['toggleTopic']).toHaveBeenCalledWith('Tech');

        await user.click(screen.getByRole('button', { name: 'BBC World' }));
        expect(state.store['toggleSource']).toHaveBeenCalledWith('bbc-world');

        await user.click(toggle);
        expect(toggle).toHaveAttribute('aria-expanded', 'false');
        expect(screen.queryByRole('button', { name: 'Tech' })).not.toBeInTheDocument();
    });

    it('counts selected topics plus sources in the toggle label', () => {
        state.store = createStore({
            articles: [tech, world],
            filtered: [world],
            query: '',
            filters: { topics: ['Tech', 'World'], sources: ['bbc-world'], unreadOnly: false },
        });
        render(<FeedView />);
        expect(screen.getByRole('button', { name: 'Filters · 3' })).toBeInTheDocument();
    });

    it('shows a bare Filters label when nothing is selected', () => {
        state.store = createStore({
            filters: { topics: [], sources: [], unreadOnly: false },
        });
        render(<FeedView />);
        const toggle = screen.getByRole('button', { name: 'Filters' });
        expect(toggle).toHaveAttribute('aria-expanded', 'false');
    });

    it('reads freshness as just now without a duplicated ago', () => {
        const iso = new Date().toISOString();
        state.store = createStore({
            articles: [tech],
            filtered: [tech],
            lastUpdated: iso,
        });
        render(<FeedView />);

        const line = screen.getByText(/^Last updated/);
        expect(line.textContent).toBe(`Last updated ${formatDateTime(iso)} · just now`);
        const time = screen.getByText(/just now/);
        expect(time.tagName).toBe('TIME');
        expect(time).toHaveAttribute('dateTime', iso);
    });

    it('keeps ago for real durations and leaves the count line honest', () => {
        const iso = new Date(Date.now() - 5 * 60 * 1000).toISOString();
        state.store = createStore({
            articles: [tech, world],
            filtered: [tech],
            query: 'breakthrough',
            filters: { topics: ['Tech'], sources: [], unreadOnly: false },
            lastUpdated: iso,
        });
        render(<FeedView />);

        expect(screen.getByText(/^Last updated/).textContent).toBe(
            `Last updated ${formatDateTime(iso)} · 5m ago`,
        );
        expect(screen.getByText('1 of 2 stories')).toBeInTheDocument();
    });

    it('says so plainly before the first update lands', () => {
        state.store = createStore({ lastUpdated: null });
        render(<FeedView />);
        expect(
            screen.getByText('Never updated — tap refresh to load stories.'),
        ).toBeInTheDocument();
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
        await user.click(screen.getByRole('button', { name: 'Filters · 1' }));
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
