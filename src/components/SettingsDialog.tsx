import { useEffect, useRef, useState } from 'react';
import type { ReactElement } from 'react';
import { Bell, BellOff, X } from 'lucide-react';
import { useNews } from '../state/newsStore';
import { getFeedSource } from '../services/feedService';
import type { ThemePreference } from '../state/newsReducer';

interface SettingsDialogProps {
    onClose: () => void;
}

const themes: { value: ThemePreference; label: string }[] = [
    { value: 'system', label: 'System' },
    { value: 'light', label: 'Light' },
    { value: 'dark', label: 'Dark' },
];

export function SettingsDialog({ onClose }: SettingsDialogProps): ReactElement {
    const {
        theme,
        setTheme,
        topics,
        sources,
        filters,
        toggleTopic,
        toggleSource,
        notificationsPermission,
        notificationsEnabled,
        enableNotifications,
        disableNotifications,
        quietHoursStart,
        quietHoursEnd,
        setQuietHours,
        resetReadingState,
    } = useNews();
    const dialogRef = useRef<HTMLDivElement>(null);
    const [confirmingReset, setConfirmingReset] = useState(false);
    const [notice, setNotice] = useState('');

    useEffect(() => {
        const dialog = dialogRef.current;
        const previouslyFocused = document.activeElement as HTMLElement | null;
        dialog?.focus();

        const onKeyDown = (event: KeyboardEvent): void => {
            if (event.key === 'Escape') {
                event.preventDefault();
                onClose();
            }
        };
        document.addEventListener('keydown', onKeyDown);
        return () => {
            document.removeEventListener('keydown', onKeyDown);
            previouslyFocused?.focus();
        };
    }, [onClose]);

    const permissionBlocked =
        notificationsPermission === 'denied' || notificationsPermission === 'unsupported';

    const toggleNotifications = (): void => {
        if (notificationsEnabled) {
            disableNotifications();
            return;
        }
        void enableNotifications().then((permission) => {
            if (permission !== 'granted') {
                setNotice(
                    permission === 'denied'
                        ? 'Notifications are blocked. Allow them in your browser settings to enable alerts.'
                        : 'Notifications are not supported on this device.',
                );
            }
        });
    };

    return (
        <div
            className="fixed inset-0 z-40 flex items-end justify-center bg-black/50 sm:items-center sm:p-4"
            onClick={onClose}
            role="presentation"
        >
            <div
                ref={dialogRef}
                role="dialog"
                aria-modal="true"
                aria-label="Settings"
                tabIndex={-1}
                onClick={(event) => {
                    event.stopPropagation();
                }}
                className="max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-[var(--color-card-dark)] p-5 outline-none sm:rounded-3xl"
            >
                <div className="mb-4 flex items-center">
                    <h2 className="text-lg font-bold text-[var(--color-primary-text)]">Settings</h2>
                    <button
                        type="button"
                        aria-label="Close settings"
                        onClick={onClose}
                        className="ml-auto inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl text-[var(--color-secondary-text)] focus-visible:outline-2 focus-visible:outline-[var(--color-accent)]"
                    >
                        <X size={20} aria-hidden="true" />
                    </button>
                </div>

                <section aria-labelledby="settings-notifications" className="border-t border-[var(--color-card-border)] py-4">
                    <h3 id="settings-notifications" className="text-sm font-semibold text-[var(--color-primary-text)]">
                        Notifications
                    </h3>
                    {permissionBlocked ? (
                        <p className="mt-2 text-sm text-[var(--color-secondary-text)]">
                            {notificationsPermission === 'denied'
                                ? 'Notifications are blocked in your browser settings. Re-enable them there to get trending-story alerts.'
                                : 'This device does not support web notifications, so alerts are unavailable.'}
                        </p>
                    ) : (
                        <button
                            type="button"
                            aria-pressed={notificationsEnabled}
                            onClick={toggleNotifications}
                            className="mt-2 inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-[var(--color-card-border)] px-4 text-sm font-medium text-[var(--color-primary-text)] focus-visible:outline-2 focus-visible:outline-[var(--color-accent)]"
                        >
                            {notificationsEnabled ? (
                                <BellOff size={17} aria-hidden="true" />
                            ) : (
                                <Bell size={17} aria-hidden="true" />
                            )}
                            {notificationsEnabled ? 'Disable notifications' : 'Enable notifications'}
                        </button>
                    )}
                    <div aria-live="polite" className="mt-1 min-h-5 text-sm text-[var(--color-secondary-text)]">
                        {notice}
                    </div>
                </section>

                <section aria-labelledby="settings-quiet" className="border-t border-[var(--color-card-border)] py-4">
                    <h3 id="settings-quiet" className="text-sm font-semibold text-[var(--color-primary-text)]">
                        Quiet hours
                    </h3>
                    <p className="mt-1 text-sm text-[var(--color-secondary-text)]">
                        No notification alerts between these times.
                    </p>
                    <div className="mt-2 flex items-center gap-3">
                        <label className="flex min-h-[44px] flex-1 flex-col gap-1 text-xs text-[var(--color-secondary-text)]">
                            Start
                            <input
                                type="time"
                                value={quietHoursStart ?? ''}
                                onChange={(event) => {
                                    const value = event.currentTarget.value;
                                    setQuietHours(value === '' ? null : value, quietHoursEnd);
                                }}
                                className="min-h-[44px] rounded-xl border border-[var(--color-card-border)] bg-transparent px-3 text-sm text-[var(--color-primary-text)] focus-visible:outline-2 focus-visible:outline-[var(--color-accent)]"
                            />
                        </label>
                        <label className="flex min-h-[44px] flex-1 flex-col gap-1 text-xs text-[var(--color-secondary-text)]">
                            End
                            <input
                                type="time"
                                value={quietHoursEnd ?? ''}
                                onChange={(event) => {
                                    const value = event.currentTarget.value;
                                    setQuietHours(quietHoursStart, value === '' ? null : value);
                                }}
                                className="min-h-[44px] rounded-xl border border-[var(--color-card-border)] bg-transparent px-3 text-sm text-[var(--color-primary-text)] focus-visible:outline-2 focus-visible:outline-[var(--color-accent)]"
                            />
                        </label>
                    </div>
                </section>

                <section aria-labelledby="settings-theme" className="border-t border-[var(--color-card-border)] py-4">
                    <h3 id="settings-theme" className="text-sm font-semibold text-[var(--color-primary-text)]">
                        Theme
                    </h3>
                    <div role="group" aria-labelledby="settings-theme" className="mt-2 flex gap-2">
                        {themes.map((option) => (
                            <button
                                key={option.value}
                                type="button"
                                aria-pressed={theme === option.value}
                                onClick={() => {
                                    setTheme(option.value);
                                }}
                                className={`inline-flex min-h-[44px] flex-1 items-center justify-center rounded-xl border px-4 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent)] ${
                                    theme === option.value
                                        ? 'border-transparent bg-[var(--color-accent)] text-white'
                                        : 'border-[var(--color-card-border)] text-[var(--color-secondary-text)]'
                                }`}
                            >
                                {option.label}
                            </button>
                        ))}
                    </div>
                </section>

                <section aria-labelledby="settings-topics" className="border-t border-[var(--color-card-border)] py-4">
                    <h3 id="settings-topics" className="text-sm font-semibold text-[var(--color-primary-text)]">
                        Topics
                    </h3>
                    <div role="group" aria-labelledby="settings-topics" className="mt-2 flex flex-wrap gap-1.5">
                        {topics.map((topic) => {
                            const active = filters.topics.includes(topic);
                            return (
                                <button
                                    key={topic}
                                    type="button"
                                    aria-pressed={active}
                                    onClick={() => {
                                        toggleTopic(topic);
                                    }}
                                    className={`inline-flex min-h-[44px] items-center rounded-full border px-3.5 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent)] ${
                                        active
                                            ? 'border-transparent bg-[var(--color-accent)] text-white'
                                            : 'border-[var(--color-card-border)] text-[var(--color-secondary-text)]'
                                    }`}
                                >
                                    {topic}
                                </button>
                            );
                        })}
                    </div>
                </section>

                <section aria-labelledby="settings-sources" className="border-t border-[var(--color-card-border)] py-4">
                    <h3 id="settings-sources" className="text-sm font-semibold text-[var(--color-primary-text)]">
                        Sources
                    </h3>
                    <div role="group" aria-labelledby="settings-sources" className="mt-2 flex flex-wrap gap-1.5">
                        {sources.map((sourceId) => {
                            const active = filters.sources.includes(sourceId);
                            const name = getFeedSource(sourceId)?.name ?? sourceId;
                            return (
                                <button
                                    key={sourceId}
                                    type="button"
                                    aria-pressed={active}
                                    onClick={() => {
                                        toggleSource(sourceId);
                                    }}
                                    className={`inline-flex min-h-[44px] items-center rounded-full border px-3.5 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent)] ${
                                        active
                                            ? 'border-transparent bg-[var(--color-accent)] text-white'
                                            : 'border-[var(--color-card-border)] text-[var(--color-secondary-text)]'
                                    }`}
                                >
                                    {name}
                                </button>
                            );
                        })}
                    </div>
                </section>

                <section aria-labelledby="settings-reset" className="border-t border-[var(--color-card-border)] py-4">
                    <h3 id="settings-reset" className="text-sm font-semibold text-[var(--color-primary-text)]">
                        Reading state
                    </h3>
                    {confirmingReset ? (
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                            <p className="w-full text-sm text-[var(--color-secondary-text)]">
                                Clear saved stories, read history, and filters?
                            </p>
                            <button
                                type="button"
                                onClick={() => {
                                    resetReadingState();
                                    setConfirmingReset(false);
                                }}
                                className="inline-flex min-h-[44px] items-center rounded-xl bg-red-500 px-4 text-sm font-medium text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-500"
                            >
                                Yes, reset everything
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    setConfirmingReset(false);
                                }}
                                className="inline-flex min-h-[44px] items-center rounded-xl border border-[var(--color-card-border)] px-4 text-sm font-medium text-[var(--color-primary-text)] focus-visible:outline-2 focus-visible:outline-[var(--color-accent)]"
                            >
                                Cancel
                            </button>
                        </div>
                    ) : (
                        <button
                            type="button"
                            onClick={() => {
                                setConfirmingReset(true);
                            }}
                            className="mt-2 inline-flex min-h-[44px] items-center rounded-xl border border-[var(--color-card-border)] px-4 text-sm font-medium text-red-500 focus-visible:outline-2 focus-visible:outline-[var(--color-accent)]"
                        >
                            Reset reading state
                        </button>
                    )}
                </section>
            </div>
        </div>
    );
}
