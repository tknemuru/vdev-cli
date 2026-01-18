import { describe, it, expect } from 'vitest';
import { normalizeLF } from '../src/core/normalize';

describe('normalizeLF', () => {
  it('converts CRLF to LF', () => {
    expect(normalizeLF('hello\r\nworld')).toBe('hello\nworld');
  });

  it('preserves LF', () => {
    expect(normalizeLF('hello\nworld')).toBe('hello\nworld');
  });

  it('handles mixed line endings', () => {
    expect(normalizeLF('a\r\nb\nc\r\nd')).toBe('a\nb\nc\nd');
  });
});
