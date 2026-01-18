import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, writeFileSync, rmSync, existsSync } from 'fs';
import { join } from 'path';
import { checkGate } from '../src/core/gate';
import { ExitCode } from '../src/core/errors';
import { sha256 } from '../src/core/hashes';
import { getPlansDir, getTopicDir, getMetaPath } from '../src/core/paths';

const TEST_TOPIC_PREFIX = 'test-gate-';

function createTopic(topic: string) {
  const topicDir = getTopicDir(topic);
  mkdirSync(topicDir, { recursive: true });
  return topicDir;
}

function removeTopic(topic: string) {
  const topicDir = getTopicDir(topic);
  if (existsSync(topicDir)) {
    rmSync(topicDir, { recursive: true });
  }
}

function writeMeta(topic: string, meta: object) {
  const metaPath = getMetaPath(topic);
  writeFileSync(metaPath, JSON.stringify(meta, null, 2));
}

function writeFile(topic: string, filename: string, content: string) {
  const topicDir = getTopicDir(topic);
  const filePath = join(topicDir, filename);
  writeFileSync(filePath, content);
}

function createValidMeta(topic: string, status: string, planHash = '', reviewHash = '') {
  return {
    schemaVersion: 1,
    topic,
    title: 'Test',
    status,
    paths: {
      instruction: 'instruction.md',
      plan: 'plan.md',
      review: 'review.md',
    },
    hashes: {
      planSha256: planHash,
      reviewSha256: reviewHash,
    },
    timestamps: {
      createdAt: '2026-01-19T10:00:00+09:00',
      updatedAt: '2026-01-19T10:00:00+09:00',
    },
  };
}

describe('gate logic', () => {
  let testTopic: string;
  let testCounter = 0;

  beforeEach(() => {
    testCounter++;
    testTopic = `${TEST_TOPIC_PREFIX}${Date.now()}-${testCounter}`;
    // Ensure plans directory exists
    const plansDir = getPlansDir();
    mkdirSync(plansDir, { recursive: true });
  });

  afterEach(() => {
    removeTopic(testTopic);
  });

  describe('Priority 1: meta.json invalid', () => {
    it('returns BROKEN_STATE when meta.json not found', () => {
      createTopic(testTopic);
      const result = checkGate(testTopic);
      expect(result.exitCode).toBe(ExitCode.BROKEN_STATE);
      expect(result.status).toBe('BROKEN_STATE');
    });

    it('returns BROKEN_STATE when meta.json is invalid JSON', () => {
      createTopic(testTopic);
      writeFile(testTopic, 'meta.json', 'not json');
      const result = checkGate(testTopic);
      expect(result.exitCode).toBe(ExitCode.BROKEN_STATE);
    });

    it('returns BROKEN_STATE when schemaVersion is wrong', () => {
      createTopic(testTopic);
      writeMeta(testTopic, { ...createValidMeta(testTopic, 'APPROVED'), schemaVersion: 2 });
      const result = checkGate(testTopic);
      expect(result.exitCode).toBe(ExitCode.BROKEN_STATE);
    });
  });

  describe('Priority 2: hash mismatch in APPROVED/REJECTED', () => {
    it('returns BROKEN_STATE when APPROVED but plan hash mismatch', () => {
      const planContent = '# Plan';
      const reviewContent = 'Status: APPROVED';
      createTopic(testTopic);
      writeFile(testTopic, 'instruction.md', '# Instruction');
      writeFile(testTopic, 'plan.md', planContent);
      writeFile(testTopic, 'review.md', reviewContent);
      writeMeta(
        testTopic,
        createValidMeta(testTopic, 'APPROVED', 'wrong-hash', sha256(reviewContent))
      );

      const result = checkGate(testTopic);
      expect(result.exitCode).toBe(ExitCode.BROKEN_STATE);
      expect(result.message).toContain('hash mismatch');
    });

    it('returns BROKEN_STATE when APPROVED but review hash mismatch', () => {
      const planContent = '# Plan';
      const reviewContent = 'Status: APPROVED';
      createTopic(testTopic);
      writeFile(testTopic, 'instruction.md', '# Instruction');
      writeFile(testTopic, 'plan.md', planContent);
      writeFile(testTopic, 'review.md', reviewContent);
      writeMeta(testTopic, createValidMeta(testTopic, 'APPROVED', sha256(planContent), 'wrong-hash'));

      const result = checkGate(testTopic);
      expect(result.exitCode).toBe(ExitCode.BROKEN_STATE);
    });

    it('returns BROKEN_STATE when REJECTED but hash mismatch', () => {
      const planContent = '# Plan';
      const reviewContent = 'Status: REJECTED';
      createTopic(testTopic);
      writeFile(testTopic, 'instruction.md', '# Instruction');
      writeFile(testTopic, 'plan.md', planContent);
      writeFile(testTopic, 'review.md', reviewContent);
      writeMeta(
        testTopic,
        createValidMeta(testTopic, 'REJECTED', 'wrong-hash', sha256(reviewContent))
      );

      const result = checkGate(testTopic);
      expect(result.exitCode).toBe(ExitCode.BROKEN_STATE);
    });
  });

  describe('Priority 3: instruction.md missing', () => {
    it('returns NEEDS_INSTRUCTION when instruction.md not found', () => {
      createTopic(testTopic);
      writeMeta(testTopic, createValidMeta(testTopic, 'NEEDS_INSTRUCTION'));

      const result = checkGate(testTopic);
      expect(result.exitCode).toBe(ExitCode.NEEDS_INSTRUCTION);
      expect(result.status).toBe('NEEDS_INSTRUCTION');
    });
  });

  describe('Priority 4: plan.md missing', () => {
    it('returns NEEDS_PLAN when plan.md not found', () => {
      createTopic(testTopic);
      writeMeta(testTopic, createValidMeta(testTopic, 'NEEDS_PLAN'));
      writeFile(testTopic, 'instruction.md', '# Instruction');

      const result = checkGate(testTopic);
      expect(result.exitCode).toBe(ExitCode.NEEDS_PLAN);
      expect(result.status).toBe('NEEDS_PLAN');
    });
  });

  describe('Priority 5: review.md missing', () => {
    it('returns NEEDS_REVIEW when review.md not found', () => {
      createTopic(testTopic);
      writeMeta(testTopic, createValidMeta(testTopic, 'NEEDS_REVIEW'));
      writeFile(testTopic, 'instruction.md', '# Instruction');
      writeFile(testTopic, 'plan.md', '# Plan');

      const result = checkGate(testTopic);
      expect(result.exitCode).toBe(ExitCode.NEEDS_REVIEW);
      expect(result.status).toBe('NEEDS_REVIEW');
    });
  });

  describe('Priority 6: status=NEEDS_CHANGES', () => {
    it('returns NEEDS_CHANGES when status is NEEDS_CHANGES', () => {
      createTopic(testTopic);
      writeMeta(testTopic, createValidMeta(testTopic, 'NEEDS_CHANGES'));
      writeFile(testTopic, 'instruction.md', '# Instruction');
      writeFile(testTopic, 'plan.md', '# Plan');
      writeFile(testTopic, 'review.md', 'Status: NEEDS_CHANGES');

      const result = checkGate(testTopic);
      expect(result.exitCode).toBe(ExitCode.NEEDS_CHANGES);
      expect(result.status).toBe('NEEDS_CHANGES');
    });
  });

  describe('Priority 7: status=REJECTED', () => {
    it('returns REJECTED when status is REJECTED with matching hashes', () => {
      const planContent = '# Plan';
      const reviewContent = 'Status: REJECTED';
      createTopic(testTopic);
      writeMeta(
        testTopic,
        createValidMeta(testTopic, 'REJECTED', sha256(planContent), sha256(reviewContent))
      );
      writeFile(testTopic, 'instruction.md', '# Instruction');
      writeFile(testTopic, 'plan.md', planContent);
      writeFile(testTopic, 'review.md', reviewContent);

      const result = checkGate(testTopic);
      expect(result.exitCode).toBe(ExitCode.REJECTED);
      expect(result.status).toBe('REJECTED');
    });
  });

  describe('Priority 8: status=APPROVED with hash match', () => {
    it('returns APPROVED when status is APPROVED with matching hashes', () => {
      const planContent = '# Plan';
      const reviewContent = 'Status: APPROVED';
      createTopic(testTopic);
      writeMeta(
        testTopic,
        createValidMeta(testTopic, 'APPROVED', sha256(planContent), sha256(reviewContent))
      );
      writeFile(testTopic, 'instruction.md', '# Instruction');
      writeFile(testTopic, 'plan.md', planContent);
      writeFile(testTopic, 'review.md', reviewContent);

      const result = checkGate(testTopic);
      expect(result.exitCode).toBe(ExitCode.APPROVED);
      expect(result.status).toBe('APPROVED');
      expect(result.message).toBe('ready to implement');
    });
  });

  describe('plan update invalidation', () => {
    it('plan saved forces status to NEEDS_CHANGES', () => {
      const planContent = '# Modified Plan';
      const reviewContent = 'Status: APPROVED';
      createTopic(testTopic);

      // Simulate state after plan command: status is NEEDS_CHANGES, review hash cleared
      writeMeta(testTopic, createValidMeta(testTopic, 'NEEDS_CHANGES', sha256(planContent), ''));
      writeFile(testTopic, 'instruction.md', '# Instruction');
      writeFile(testTopic, 'plan.md', planContent);
      writeFile(testTopic, 'review.md', reviewContent);

      const result = checkGate(testTopic);
      expect(result.exitCode).toBe(ExitCode.NEEDS_CHANGES);
    });
  });
});
