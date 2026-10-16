import { describe, it, expect, vi } from 'vitest'
import { render } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { IconButton } from '../IconButton'

describe('IconButton', () => {
    it('has accessible name', () => {
        const { container } = render(
            <IconButton label="Test" onClick={() => undefined}>
                Test
            </IconButton>,
        )
        const button = container.querySelector('button')
        expect(button).toBeInTheDocument()
        expect(button?.getAttribute('aria-label')).toBe('Test')
    })

    it('calls onClick when enabled', async () => {
        const handler = vi.fn()
        const { container } = render(
            <IconButton label="Test" onClick={handler}>
                Test
            </IconButton>,
        )
        const button = container.querySelector('button')
        if (!button) throw new Error('button missing')
        await userEvent.click(button)
        expect(handler).toHaveBeenCalledTimes(1)
    })

    it('disabled blocks onClick', async () => {
        const handler = vi.fn()
        const { container } = render(
            <IconButton label="Test" onClick={handler} disabled>
                Test
            </IconButton>,
        )
        const button = container.querySelector('button')
        if (!button) throw new Error('button missing')
        await userEvent.click(button)
        expect(handler).not.toHaveBeenCalled()
    })

    it('supports aria-pressed', () => {
        const { container } = render(
            <IconButton label="Test" onClick={() => undefined} ariaPressed>
                Test
            </IconButton>,
        )
        const button = container.querySelector('button')
        expect(button?.getAttribute('aria-pressed')).toBe('true')
    })
})
