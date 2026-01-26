import { describe, it, expect } from 'vitest';
import { sha256 } from '../src/core/hashes';

describe('sha256', () => {
  it('computes sha256 hash', () => {
    const hash = sha256('hello');
    expect(hash).toBe('2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824');
  });

  it('returns consistent hashes', () => {
    const hash1 = sha256('test content');
    const hash2 = sha256('test content');
    expect(hash1).toBe(hash2);
  });

  it('returns different hashes for different content', () => {
    const hash1 = sha256('content a');
    const hash2 = sha256('content b');
    expect(hash1).not.toBe(hash2);
  });
});
