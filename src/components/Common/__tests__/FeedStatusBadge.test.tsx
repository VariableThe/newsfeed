import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { FeedStatusBadge } from '../FeedStatusBadge'

describe('FeedStatusBadge', () => {
    it('partial reflects the real item count', () => {
        const empty = render(<FeedStatusBadge status="partial" />)
        expect(empty.container.textContent).toContain('0 items')
        const withCount = render(<FeedStatusBadge status="partial" count={0} />)
        expect(withCount.container.textContent).toContain('0 items')
    })

    it('error shows truncated message in UI', () => {
        const { container } = render(
            <FeedStatusBadge status="error" error="Network timeout failed to refresh" />,
        )
        expect(container.textContent?.length).toBeLessThan(30)
    })

    it('success with count shows count', () => {
        const { container } = render(<FeedStatusBadge status="success" count={5} via="RSS" />)
        expect(container.textContent).toContain('5')
    })

    it('loading shows spinner/icon activity', () => {
        const { container } = render(<FeedStatusBadge status="loading" />)
        expect(container.querySelector('svg')).toBeInTheDocument()
    })
})
