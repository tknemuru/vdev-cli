import { describe, it, expect } from 'vitest';
import { toSlug, isValidSlug } from '../src/core/slug';

describe('toSlug', () => {
  it('converts spaces to hyphens', () => {
    expect(toSlug('hello world')).toBe('hello-world');
  });

  it('converts uppercase to lowercase', () => {
    expect(toSlug('Hello World')).toBe('hello-world');
  });

  it('removes special characters', () => {
    expect(toSlug('hello@world!')).toBe('hello-world');
  });

  it('collapses multiple hyphens', () => {
    expect(toSlug('hello---world')).toBe('hello-world');
  });

  it('removes leading and trailing hyphens', () => {
    expect(toSlug('-hello-world-')).toBe('hello-world');
  });

  it('returns untitled for empty string', () => {
    expect(toSlug('')).toBe('untitled');
  });

  it('truncates to 48 characters', () => {
    const long = 'a'.repeat(60);
    expect(toSlug(long).length).toBeLessThanOrEqual(48);
  });
});

describe('isValidSlug', () => {
  it('validates correct slugs', () => {
    expect(isValidSlug('hello-world')).toBe(true);
    expect(isValidSlug('test123')).toBe(true);
    expect(isValidSlug('2026-01-19-auth')).toBe(true);
  });

  it('rejects invalid slugs', () => {
    expect(isValidSlug('Hello-World')).toBe(false);
    expect(isValidSlug('hello_world')).toBe(false);
    expect(isValidSlug('hello--world')).toBe(false);
    expect(isValidSlug('-hello')).toBe(false);
  });
});
