import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, writeFileSync, rmSync, existsSync } from 'fs';
import { join } from 'path';
import { findLatestAttempt } from '../src/core/attempt';

const TEST_DIR_PREFIX = '/tmp/test-attempt-';

function createTestDir(): string {
  const dir = `${TEST_DIR_PREFIX}${Date.now()}-${Math.random().toString(36).slice(2)}`;
  mkdirSync(dir, { recursive: true });
  return dir;
}

function removeTestDir(dir: string) {
  if (existsSync(dir)) {
    rmSync(dir, { recursive: true });
  }
}

describe('findLatestAttempt', () => {
  let testDir: string;

  beforeEach(() => {
    testDir = createTestDir();
  });

  afterEach(() => {
    removeTestDir(testDir);
  });

  describe('directory not found', () => {
    it('returns found=false when directory does not exist', () => {
      const nonExistentDir = join(testDir, 'nonexistent');
      const result = findLatestAttempt(nonExistentDir);
      expect(result.found).toBe(false);
      expect(result.path).toBe(null);
      expect(result.attemptNumber).toBe(null);
    });
  });

  describe('empty directory', () => {
    it('returns found=false when directory is empty', () => {
      const result = findLatestAttempt(testDir);
      expect(result.found).toBe(false);
      expect(result.path).toBe(null);
      expect(result.attemptNumber).toBe(null);
    });

    it('returns found=false when directory contains only non-attempt files', () => {
      writeFileSync(join(testDir, 'readme.md'), 'test');
      writeFileSync(join(testDir, 'other.txt'), 'test');
      const result = findLatestAttempt(testDir);
      expect(result.found).toBe(false);
    });
  });

  describe('single attempt', () => {
    it('returns the only attempt file', () => {
      writeFileSync(join(testDir, 'attempt-001.md'), 'test');
      const result = findLatestAttempt(testDir);
      expect(result.found).toBe(true);
      expect(result.path).toBe(join(testDir, 'attempt-001.md'));
      expect(result.attemptNumber).toBe(1);
    });
  });

  describe('multiple attempts with zero-padded numbers', () => {
    it('returns the highest numbered attempt', () => {
      writeFileSync(join(testDir, 'attempt-001.md'), 'first');
      writeFileSync(join(testDir, 'attempt-002.md'), 'second');
      writeFileSync(join(testDir, 'attempt-003.md'), 'third');
      const result = findLatestAttempt(testDir);
      expect(result.found).toBe(true);
      expect(result.path).toBe(join(testDir, 'attempt-003.md'));
      expect(result.attemptNumber).toBe(3);
    });
  });

  describe('mixed zero-padded and non-padded numbers', () => {
    it('correctly sorts by numeric value, not lexicographic', () => {
      // Lexicographic: attempt-10 < attempt-2
      // Numeric: attempt-2 < attempt-10 (correct)
      writeFileSync(join(testDir, 'attempt-2.md'), 'two');
      writeFileSync(join(testDir, 'attempt-10.md'), 'ten');
      const result = findLatestAttempt(testDir);
      expect(result.found).toBe(true);
      expect(result.path).toBe(join(testDir, 'attempt-10.md'));
      expect(result.attemptNumber).toBe(10);
    });

    it('handles mixed padding correctly', () => {
      writeFileSync(join(testDir, 'attempt-001.md'), 'one');
      writeFileSync(join(testDir, 'attempt-02.md'), 'two');
      writeFileSync(join(testDir, 'attempt-3.md'), 'three');
      const result = findLatestAttempt(testDir);
      expect(result.found).toBe(true);
      expect(result.path).toBe(join(testDir, 'attempt-3.md'));
      expect(result.attemptNumber).toBe(3);
    });
  });

  describe('edge cases', () => {
    it('ignores files that do not match attempt pattern', () => {
      writeFileSync(join(testDir, 'attempt-001.md'), 'valid');
      writeFileSync(join(testDir, 'attempt-abc.md'), 'invalid');
      writeFileSync(join(testDir, 'attempt-.md'), 'invalid');
      writeFileSync(join(testDir, 'attempt-001.txt'), 'wrong extension');
      writeFileSync(join(testDir, 'attempt001.md'), 'missing dash');
      const result = findLatestAttempt(testDir);
      expect(result.found).toBe(true);
      expect(result.path).toBe(join(testDir, 'attempt-001.md'));
      expect(result.attemptNumber).toBe(1);
    });

    it('handles large attempt numbers', () => {
      writeFileSync(join(testDir, 'attempt-999.md'), 'large');
      writeFileSync(join(testDir, 'attempt-1000.md'), 'larger');
      const result = findLatestAttempt(testDir);
      expect(result.found).toBe(true);
      expect(result.path).toBe(join(testDir, 'attempt-1000.md'));
      expect(result.attemptNumber).toBe(1000);
    });
  });
});
