import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { SettingsDialog } from '../SettingsDialog';
import { createStore } from './helpers';

const state = vi.hoisted(() => ({ store: {} as Record<string, unknown> }));

vi.mock('../../state/newsStore', () => ({
    NewsProvider: ({ children }: { children: ReactNode }) => children,
    useNews: () => state.store,
}));

afterEach(() => {
    cleanup();
});

function mockSettings(overrides: Record<string, unknown> = {}): void {
    state.store = createStore({
        theme: 'system',
        notificationsPermission: 'default',
        notificationsEnabled: false,
        quietHoursStart: null,
        quietHoursEnd: null,
        ...overrides,
    });
}

describe('SettingsDialog', () => {
    it('theme selector wires to setTheme', async () => {
        mockSettings();
        const user = userEvent.setup();
        render(<SettingsDialog onClose={() => undefined} />);
        await user.click(screen.getByRole('button', { name: 'Dark' }));
        expect(state.store['setTheme']).toHaveBeenCalledWith('dark');
    });

    it('quiet hour inputs wire to setQuietHours', async () => {
        mockSettings();
        const user = userEvent.setup();
        render(<SettingsDialog onClose={() => undefined} />);
        const start = screen.getByLabelText('Start');
        await user.clear(start);
        await user.type(start, '22:00');
        expect(state.store['setQuietHours']).toHaveBeenCalled();
    });

    it('enable button wires to enableNotifications', async () => {
        mockSettings();
        const user = userEvent.setup();
        render(<SettingsDialog onClose={() => undefined} />);
        await user.click(screen.getByRole('button', { name: 'Enable notifications' }));
        expect(state.store['enableNotifications']).toHaveBeenCalled();
    });

    it('explains a denied permission instead of offering a dead button', () => {
        mockSettings({ notificationsPermission: 'denied' });
        render(<SettingsDialog onClose={() => undefined} />);
        expect(screen.getByText(/blocked in your browser settings/)).toBeInTheDocument();
        expect(
            screen.queryByRole('button', { name: 'Enable notifications' }),
        ).not.toBeInTheDocument();
    });

    it('reset is behind a confirm and wires to resetReadingState', async () => {
        mockSettings();
        const user = userEvent.setup();
        render(<SettingsDialog onClose={() => undefined} />);
        await user.click(screen.getByRole('button', { name: 'Reset reading state' }));
        expect(state.store['resetReadingState']).not.toHaveBeenCalled();
        await user.click(screen.getByRole('button', { name: 'Yes, reset everything' }));
        expect(state.store['resetReadingState']).toHaveBeenCalled();
    });

    it('closes on Escape', async () => {
        mockSettings();
        const onClose = vi.fn();
        const user = userEvent.setup();
        render(<SettingsDialog onClose={onClose} />);
        await user.keyboard('{Escape}');
        expect(onClose).toHaveBeenCalled();
    });
});
