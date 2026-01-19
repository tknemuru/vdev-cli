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

function createValidMeta(
  topic: string,
  status: string,
  planHash: string | null = null,
  designReviewHash: string | null = null,
  implHash: string | null = null,
  implReviewHash: string | null = null
) {
  return {
    schemaVersion: 2,
    topic,
    title: 'Test',
    status,
    paths: {
      instruction: 'instruction.md',
      plan: 'plan.md',
      designReview: 'design-review.md',
      impl: 'impl.md',
      implReview: 'impl-review.md',
    },
    hashes: {
      planSha256: planHash,
      designReviewSha256: designReviewHash,
      implSha256: implHash,
      implReviewSha256: implReviewHash,
    },
    timestamps: {
      createdAt: '2026-01-19T10:00:00+09:00',
      updatedAt: '2026-01-19T10:00:00+09:00',
    },
  };
}

describe('gate logic v2', () => {
  let testTopic: string;
  let testCounter = 0;

  beforeEach(() => {
    testCounter++;
    testTopic = `${TEST_TOPIC_PREFIX}${Date.now()}-${testCounter}`;
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

    it('returns BROKEN_STATE when schemaVersion is 1', () => {
      createTopic(testTopic);
      writeMeta(testTopic, { ...createValidMeta(testTopic, 'DESIGN_APPROVED'), schemaVersion: 1 });
      const result = checkGate(testTopic);
      expect(result.exitCode).toBe(ExitCode.BROKEN_STATE);
    });
  });

  describe('Priority 2: hash mismatch in DONE/REJECTED', () => {
    it('returns BROKEN_STATE when DONE but hash mismatch', () => {
      const planContent = '# Plan';
      const designReviewContent = 'Status: DESIGN_APPROVED';
      const implContent = '# Impl';
      const implReviewContent = 'Status: DONE';
      createTopic(testTopic);
      writeFile(testTopic, 'instruction.md', '# Instruction');
      writeFile(testTopic, 'plan.md', planContent);
      writeFile(testTopic, 'design-review.md', designReviewContent);
      writeFile(testTopic, 'impl.md', implContent);
      writeFile(testTopic, 'impl-review.md', implReviewContent);
      writeMeta(
        testTopic,
        createValidMeta(
          testTopic,
          'DONE',
          sha256(planContent),
          sha256(designReviewContent),
          sha256(implContent),
          'wrong-hash' // wrong impl-review hash
        )
      );

      const result = checkGate(testTopic);
      expect(result.exitCode).toBe(ExitCode.BROKEN_STATE);
      expect(result.message).toContain('hash mismatch');
    });

    it('returns BROKEN_STATE when REJECTED but hash mismatch', () => {
      const planContent = '# Plan';
      const designReviewContent = 'Status: REJECTED';
      createTopic(testTopic);
      writeFile(testTopic, 'instruction.md', '# Instruction');
      writeFile(testTopic, 'plan.md', planContent);
      writeFile(testTopic, 'design-review.md', designReviewContent);
      writeMeta(
        testTopic,
        createValidMeta(testTopic, 'REJECTED', 'wrong-hash', sha256(designReviewContent), null, null)
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

  describe('Priority 5: design-review.md missing', () => {
    it('returns NEEDS_DESIGN_REVIEW when design-review.md not found', () => {
      createTopic(testTopic);
      writeMeta(testTopic, createValidMeta(testTopic, 'NEEDS_DESIGN_REVIEW'));
      writeFile(testTopic, 'instruction.md', '# Instruction');
      writeFile(testTopic, 'plan.md', '# Plan');

      const result = checkGate(testTopic);
      expect(result.exitCode).toBe(ExitCode.NEEDS_DESIGN_REVIEW);
      expect(result.status).toBe('NEEDS_DESIGN_REVIEW');
    });
  });

  describe('Priority 6: status=REJECTED', () => {
    it('returns REJECTED when status is REJECTED with matching hashes', () => {
      const planContent = '# Plan';
      const designReviewContent = 'Status: REJECTED';
      createTopic(testTopic);
      writeMeta(
        testTopic,
        createValidMeta(testTopic, 'REJECTED', sha256(planContent), sha256(designReviewContent), null, null)
      );
      writeFile(testTopic, 'instruction.md', '# Instruction');
      writeFile(testTopic, 'plan.md', planContent);
      writeFile(testTopic, 'design-review.md', designReviewContent);

      const result = checkGate(testTopic);
      expect(result.exitCode).toBe(ExitCode.REJECTED);
      expect(result.status).toBe('REJECTED');
    });
  });

  describe('Priority 7: status=DESIGN_APPROVED', () => {
    it('returns DESIGN_APPROVED when status is DESIGN_APPROVED', () => {
      const planContent = '# Plan';
      const designReviewContent = 'Status: DESIGN_APPROVED';
      createTopic(testTopic);
      writeMeta(
        testTopic,
        createValidMeta(testTopic, 'DESIGN_APPROVED', sha256(planContent), sha256(designReviewContent))
      );
      writeFile(testTopic, 'instruction.md', '# Instruction');
      writeFile(testTopic, 'plan.md', planContent);
      writeFile(testTopic, 'design-review.md', designReviewContent);

      const result = checkGate(testTopic);
      expect(result.exitCode).toBe(ExitCode.DESIGN_APPROVED);
      expect(result.status).toBe('DESIGN_APPROVED');
      expect(result.message).toBe('ready to implement');
    });
  });

  describe('Priority 8: status=IMPLEMENTING and impl.md missing', () => {
    it('returns NEEDS_IMPL_REPORT when IMPLEMENTING and impl.md missing', () => {
      const planContent = '# Plan';
      const designReviewContent = 'Status: DESIGN_APPROVED';
      createTopic(testTopic);
      writeMeta(
        testTopic,
        createValidMeta(testTopic, 'IMPLEMENTING', sha256(planContent), sha256(designReviewContent))
      );
      writeFile(testTopic, 'instruction.md', '# Instruction');
      writeFile(testTopic, 'plan.md', planContent);
      writeFile(testTopic, 'design-review.md', designReviewContent);

      const result = checkGate(testTopic);
      expect(result.exitCode).toBe(ExitCode.NEEDS_IMPL_REPORT);
      expect(result.status).toBe('NEEDS_IMPL_REPORT');
    });
  });

  describe('Priority 9: status=IMPLEMENTING and impl-review.md missing', () => {
    it('returns NEEDS_IMPL_REVIEW when IMPLEMENTING, impl exists but impl-review missing', () => {
      const planContent = '# Plan';
      const designReviewContent = 'Status: DESIGN_APPROVED';
      const implContent = '# Impl';
      createTopic(testTopic);
      writeMeta(
        testTopic,
        createValidMeta(testTopic, 'IMPLEMENTING', sha256(planContent), sha256(designReviewContent), sha256(implContent))
      );
      writeFile(testTopic, 'instruction.md', '# Instruction');
      writeFile(testTopic, 'plan.md', planContent);
      writeFile(testTopic, 'design-review.md', designReviewContent);
      writeFile(testTopic, 'impl.md', implContent);

      const result = checkGate(testTopic);
      expect(result.exitCode).toBe(ExitCode.NEEDS_IMPL_REVIEW);
      expect(result.status).toBe('NEEDS_IMPL_REVIEW');
    });
  });

  describe('Priority 10: status=NEEDS_IMPL_REVIEW', () => {
    it('returns NEEDS_IMPL_REVIEW when status is NEEDS_IMPL_REVIEW', () => {
      const planContent = '# Plan';
      const designReviewContent = 'Status: DESIGN_APPROVED';
      const implContent = '# Impl';
      createTopic(testTopic);
      writeMeta(
        testTopic,
        createValidMeta(testTopic, 'NEEDS_IMPL_REVIEW', sha256(planContent), sha256(designReviewContent), sha256(implContent))
      );
      writeFile(testTopic, 'instruction.md', '# Instruction');
      writeFile(testTopic, 'plan.md', planContent);
      writeFile(testTopic, 'design-review.md', designReviewContent);
      writeFile(testTopic, 'impl.md', implContent);

      const result = checkGate(testTopic);
      expect(result.exitCode).toBe(ExitCode.NEEDS_IMPL_REVIEW);
      expect(result.status).toBe('NEEDS_IMPL_REVIEW');
    });
  });

  describe('Priority 11: status=DONE with hash match', () => {
    it('returns DONE when status is DONE with matching hashes', () => {
      const planContent = '# Plan';
      const designReviewContent = 'Status: DESIGN_APPROVED';
      const implContent = '# Impl';
      const implReviewContent = 'Status: DONE';
      createTopic(testTopic);
      writeMeta(
        testTopic,
        createValidMeta(
          testTopic,
          'DONE',
          sha256(planContent),
          sha256(designReviewContent),
          sha256(implContent),
          sha256(implReviewContent)
        )
      );
      writeFile(testTopic, 'instruction.md', '# Instruction');
      writeFile(testTopic, 'plan.md', planContent);
      writeFile(testTopic, 'design-review.md', designReviewContent);
      writeFile(testTopic, 'impl.md', implContent);
      writeFile(testTopic, 'impl-review.md', implReviewContent);

      const result = checkGate(testTopic);
      expect(result.exitCode).toBe(ExitCode.DONE);
      expect(result.status).toBe('DONE');
      expect(result.message).toBe('done');
    });
  });

  describe('Priority 12: Other cases', () => {
    it('returns BROKEN_STATE for unexpected state', () => {
      createTopic(testTopic);
      writeMeta(testTopic, createValidMeta(testTopic, 'NEEDS_PLAN')); // No files exist
      writeFile(testTopic, 'instruction.md', '# Instruction');
      writeFile(testTopic, 'plan.md', '# Plan');
      writeFile(testTopic, 'design-review.md', 'Status: DESIGN_APPROVED');
      // Status says NEEDS_PLAN but all files exist - unexpected

      const result = checkGate(testTopic);
      expect(result.exitCode).toBe(ExitCode.BROKEN_STATE);
    });
  });

  describe('plan update invalidation', () => {
    it('plan saved forces status to NEEDS_DESIGN_REVIEW', () => {
      const planContent = '# Modified Plan';
      createTopic(testTopic);
      writeMeta(testTopic, createValidMeta(testTopic, 'NEEDS_DESIGN_REVIEW', sha256(planContent), null));
      writeFile(testTopic, 'instruction.md', '# Instruction');
      writeFile(testTopic, 'plan.md', planContent);

      const result = checkGate(testTopic);
      expect(result.exitCode).toBe(ExitCode.NEEDS_DESIGN_REVIEW);
    });
  });
});
