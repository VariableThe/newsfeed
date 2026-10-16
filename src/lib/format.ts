const MONTHS = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
];

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const DATE_RANGE_DAYS = 7 * DAY;

function toDate(value: string): Date | null {
    if (typeof value !== 'string' || value.trim() === '') return null;
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function shortDate(date: Date, referenceYear: number): string {
    const label = `${date.getDate()} ${MONTHS[date.getMonth()]}`;
    return date.getFullYear() === referenceYear ? label : `${label} ${date.getFullYear()}`;
}

function dropTrailingZero(value: string): string {
    return value.endsWith('.0') ? value.slice(0, -2) : value;
}

export function formatRelativeTime(iso: string, now?: Date): string {
    const date = toDate(iso);
    if (!date) return '';

    const referenceDate = now ?? new Date();
    const reference = Number.isNaN(referenceDate.getTime()) ? new Date() : referenceDate;
    const elapsed = Math.max(0, reference.getTime() - date.getTime());

    if (elapsed < MINUTE) return 'now';
    if (elapsed < HOUR) return `${Math.floor(elapsed / MINUTE)}m`;
    if (elapsed < DAY) return `${Math.floor(elapsed / HOUR)}h`;
    if (elapsed <= DATE_RANGE_DAYS) return `${Math.floor(elapsed / DAY)}d`;
    return shortDate(date, reference.getFullYear());
}

export function formatDateTime(iso: string): string {
    const date = toDate(iso);
    if (!date) return '';

    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const day = WEEKDAYS[date.getDay()];
    return `${day}, ${date.getDate()} ${MONTHS[date.getMonth()]} · ${hours}:${minutes}`;
}

export function formatCount(n: number): string {
    if (!Number.isFinite(n)) return '0';

    const magnitude = Math.abs(n);
    if (magnitude < 1000) return String(n);
    if (magnitude < 999_950) return `${dropTrailingZero((n / 1000).toFixed(1))}k`;
    return `${dropTrailingZero((n / 1_000_000).toFixed(1))}M`;
}

export function hostFromUrl(url: string): string {
    if (typeof url !== 'string' || url.trim() === '') return '';
    try {
        return new URL(url.trim()).hostname.replace(/^www\./i, '');
    } catch {
        return '';
    }
}

export function truncate(text: string, max: number): string {
    if (typeof text !== 'string') return '';

    const collapsed = text.replace(/\s+/g, ' ').trim();
    if (collapsed === '') return '';

    const characters = Array.from(collapsed);
    const limit = Number.isFinite(max) ? Math.max(1, Math.floor(max)) : characters.length;
    if (characters.length <= limit) return collapsed;

    return `${characters.slice(0, limit).join('')}…`;
}
