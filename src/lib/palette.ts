const PALETTE = [
    '#3b82f6',
    '#ef4444',
    '#10b981',
    '#f59e0b',
    '#8b5cf6',
    '#ec4899',
    '#14b8a6',
    '#f97316',
    '#6366f1',
    '#84cc16',
];

export function sourceColor(sourceId: string): string {
    let hash = 0;
    for (let i = 0; i < sourceId.length; i++) {
        hash = (hash * 31 + sourceId.charCodeAt(i)) >>> 0;
    }
    return PALETTE[hash % PALETTE.length];
}

export function sourceInitials(source: string): string {
    return source
        .split(/\s+/)
        .filter(Boolean)
        .map(word => word[0])
        .join('')
        .slice(0, 2)
        .toUpperCase();
}
