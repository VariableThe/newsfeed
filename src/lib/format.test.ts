import { describe, it, expect } from 'vitest'
import { formatRelativeTime, formatDateTime, formatCount, hostFromUrl, truncate } from './format'

describe('formatRelativeTime', () => {
    const reference = new Date(2025, 0, 15, 12, 0, 0) // Jan 15 2025, 12:00

    it('returns now for dates within 59s of reference', () => {
        const iso = new Date(reference.getTime() - 30 * 1000).toISOString()
        expect(formatRelativeTime(iso, reference)).toBe('now')
    })

    it('returns minutes between 1-59m', () => {
        const iso = new Date(reference.getTime() - 45 * 60 * 1000).toISOString()
        expect(formatRelativeTime(iso, reference)).toBe('45m')
    })

    it('returns minutes at exactly 60s', () => {
        const iso = new Date(reference.getTime() - 60 * 1000).toISOString()
        expect(formatRelativeTime(iso, reference)).toBe('1m')
    })

    it('returns hours between 1-23h', () => {
        const iso = new Date(reference.getTime() - 5 * 60 * 60 * 1000).toISOString()
        expect(formatRelativeTime(iso, reference)).toBe('5h')
    })

    it('returns days at exactly 7d', () => {
        const iso = new Date(reference.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()
        expect(formatRelativeTime(iso, reference)).toBe('7d')
    })

    it('returns days between 1-6d', () => {
        const iso = new Date(reference.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString()
        expect(formatRelativeTime(iso, reference)).toBe('3d')
    })

    it('returns days at exactly 7d', () => {
        const iso = new Date(reference.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()
        expect(formatRelativeTime(iso, reference)).toBe('7d')
    })

    it('cross-year date formatting includes year', () => {
        const iso = new Date(2024, 11, 25, 10, 30).toISOString() // Dec 25 2024
        expect(formatRelativeTime(iso, reference)).toMatch(/\d+ \w+ \d{4}/)
    })

    it('returns empty string for invalid input', () => {
        expect(formatRelativeTime('not-a-date')).toBe('')
        expect(formatRelativeTime('')).toBe('')
    })
})

describe('formatDateTime', () => {
    it('returns locale-stable explicit form', () => {
        const result = formatDateTime('2025-01-06T10:15:00')
        expect(result).toBe('Mon, 6 Jan · 10:15')
    })

    it('returns empty string for invalid input', () => {
        expect(formatDateTime('not-a-date')).toBe('')
        expect(formatDateTime('')).toBe('')
    })
})

describe('formatCount', () => {
    it('formats small numbers as-is', () => {
        expect(formatCount(999)).toBe('999')
    })

    it('formats thousands with k suffix', () => {
        expect(formatCount(1234)).toBe('1.2k')
    })

    it('formats boundary 1000', () => {
        expect(formatCount(1000)).toBe('1k')
    })

    it('formats large numbers with M suffix', () => {
        expect(formatCount(1_000_000)).toBe('1M')
    })

    it('handles zero', () => {
        expect(formatCount(0)).toBe('0')
    })

    it('handles non-finite', () => {
        expect(formatCount(NaN)).toBe('0')
        expect(formatCount(Infinity)).toBe('0')
    })
})

describe('hostFromUrl', () => {
    it('extracts host without www', () => {
        expect(hostFromUrl('https://www.example.com/path')).toBe('example.com')
    })

    it('extracts host with port', () => {
        expect(hostFromUrl('https://example.com:8080/path')).toBe('example.com')
    })

    it('returns empty for invalid URL', () => {
        expect(hostFromUrl('not-a-url')).toBe('')
    })

    it('returns empty for empty string', () => {
        expect(hostFromUrl('')).toBe('')
    })
})

describe('truncate', () => {
    it('returns empty for empty string', () => {
        expect(truncate('', 10)).toBe('')
    })

    it('returns text when within max length', () => {
        expect(truncate('hello', 10)).toBe('hello')
    })

    it('collapses whitespace', () => {
        expect(truncate('hello   world', 20)).toBe('hello world')
    })

    it('adds ellipsis when longer than max', () => {
        expect(truncate('hello world', 5)).toBe('hello…')
    })

    it('never splits surrogate pair', () => {
        const surrogate = '😠'
        expect(truncate(surrogate, 1)).toBe('😠')
    })

    it('truncates exactly at max length', () => {
        expect(truncate('abcdef', 3)).toBe('abc…')
    })

    it('handles single char', () => {
        expect(truncate('a', 1)).toBe('a')
    })

    it('truncates to the minimum of 1 character', () => {
        expect(truncate('hello', 0)).toBe('h…')
    })
})