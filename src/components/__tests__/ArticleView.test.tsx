import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { ArticleView } from '../ArticleView';
import { createStore, makeArticle } from './helpers';

const state = vi.hoisted(() => ({ store: {} as Record<string, unknown> }));

vi.mock('../../state/newsStore', () => ({
    NewsProvider: ({ children }: { children: ReactNode }) => children,
    useNews: () => state.store,
}));

afterEach(() => {
    cleanup();
});

const excerpt = makeArticle({
    id: 'n-excerpt',
    headline: 'Excerpt story',
    hasFullContent: false,
    sourceUrl: 'https://www.bbc.com/news/world-excerpt',
});

const full = makeArticle({
    id: 'n-full',
    headline: 'Full story',
    hasFullContent: true,
    fullStory: 'The complete article body with every paragraph included.',
    sourceUrl: 'https://www.nytimes.com/section/world/full',
});

describe('ArticleView', () => {
    it('labels an excerpt honestly and links to the full article', () => {
        state.store = createStore({ articles: [excerpt], saved: [] });
        render(<ArticleView id="n-excerpt" onClose={() => undefined} />);
        expect(screen.getByRole('note')).toHaveTextContent('Showing an excerpt');
        const link = screen.getByRole('link', { name: /Read the full article at/ });
        expect(link).toHaveAttribute('href', 'https://www.bbc.com/news/world-excerpt');
        expect(link).toHaveAttribute('target', '_blank');
        expect(link).toHaveAttribute('rel', expect.stringContaining('noopener'));
    });

    it('shows the body without an excerpt note when full content exists', () => {
        state.store = createStore({ articles: [full], saved: [] });
        render(<ArticleView id="n-full" onClose={() => undefined} />);
        expect(screen.queryByRole('note')).not.toBeInTheDocument();
        expect(screen.getByText('The complete article body with every paragraph included.')).toBeInTheDocument();
        expect(screen.getByRole('link', { name: 'Open original' })).toBeInTheDocument();
    });

    it('marks the article read on open', () => {
        state.store = createStore({ articles: [excerpt], saved: [] });
        render(<ArticleView id="n-excerpt" onClose={() => undefined} />);
        expect(state.store['markRead']).toHaveBeenCalledWith('n-excerpt');
    });

    it('falls back to clipboard with an aria-live confirmation when share is missing', async () => {
        state.store = createStore({ articles: [excerpt], saved: [] });
        const user = userEvent.setup();
        const writeText = vi.fn().mockResolvedValue(undefined);
        Object.defineProperty(navigator, 'clipboard', {
            value: { writeText },
            configurable: true,
        });
        render(<ArticleView id="n-excerpt" onClose={() => undefined} />);
        await user.click(screen.getByRole('button', { name: 'Share story' }));
        await waitFor(() => {
            expect(writeText).toHaveBeenCalledWith('https://www.bbc.com/news/world-excerpt');
        });
        expect(screen.getByText('Link copied to clipboard')).toBeInTheDocument();
    });

    it('renders an honest missing-story state for unknown ids', () => {
        state.store = createStore({ articles: [], saved: [] });
        render(<ArticleView id="n-missing" onClose={() => undefined} />);
        expect(screen.getByText('Story not available')).toBeInTheDocument();
    });

    it('closes on Escape', async () => {
        state.store = createStore({ articles: [excerpt], saved: [] });
        const onClose = vi.fn();
        const user = userEvent.setup();
        render(<ArticleView id="n-excerpt" onClose={onClose} />);
        await user.keyboard('{Escape}');
        expect(onClose).toHaveBeenCalled();
    });
});
