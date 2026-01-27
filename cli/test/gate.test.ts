import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, writeFileSync, rmSync, existsSync, readFileSync } from 'fs';
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

function readMetaFile(topic: string): object {
  const metaPath = getMetaPath(topic);
  return JSON.parse(readFileSync(metaPath, 'utf8'));
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

describe('gate logic v3', () => {
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

  describe('Step A: meta.json invalid -> BROKEN_STATE (20)', () => {
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

    it('does NOT update meta.json when BROKEN_STATE', () => {
      createTopic(testTopic);
      writeFile(testTopic, 'meta.json', 'invalid json');
      const originalContent = readFileSync(join(getTopicDir(testTopic), 'meta.json'), 'utf8');

      checkGate(testTopic);

      const afterContent = readFileSync(join(getTopicDir(testTopic), 'meta.json'), 'utf8');
      expect(afterContent).toBe(originalContent);
    });
  });

  describe('Step B: instruction.md missing -> NEEDS_INSTRUCTION (10)', () => {
    it('returns NEEDS_INSTRUCTION when instruction.md not found', () => {
      createTopic(testTopic);
      writeMeta(testTopic, createValidMeta(testTopic, 'NEEDS_INSTRUCTION'));

      const result = checkGate(testTopic);
      expect(result.exitCode).toBe(ExitCode.NEEDS_INSTRUCTION);
      expect(result.status).toBe('NEEDS_INSTRUCTION');
    });
  });

  describe('Step C: plan.md missing -> NEEDS_PLAN (11)', () => {
    it('returns NEEDS_PLAN when plan.md not found', () => {
      createTopic(testTopic);
      writeMeta(testTopic, createValidMeta(testTopic, 'NEEDS_PLAN'));
      writeFile(testTopic, 'instruction.md', '# Instruction');

      const result = checkGate(testTopic);
      expect(result.exitCode).toBe(ExitCode.NEEDS_PLAN);
      expect(result.status).toBe('NEEDS_PLAN');
    });
  });

  describe('Step D: design-review.md missing -> NEEDS_DESIGN_REVIEW (12)', () => {
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

  describe('Step E: design-review.md Status parsing', () => {
    it('returns COMMAND_ERROR (1) when Status line is invalid', () => {
      createTopic(testTopic);
      writeMeta(testTopic, createValidMeta(testTopic, 'DESIGN_APPROVED'));
      writeFile(testTopic, 'instruction.md', '# Instruction');
      writeFile(testTopic, 'plan.md', '# Plan');
      writeFile(testTopic, 'design-review.md', 'Status: INVALID_STATUS');

      const result = checkGate(testTopic);
      expect(result.exitCode).toBe(ExitCode.COMMAND_ERROR);
      expect(result.status).toBe('COMMAND_ERROR');
    });

    it('returns COMMAND_ERROR (1) when Status line is missing', () => {
      createTopic(testTopic);
      writeMeta(testTopic, createValidMeta(testTopic, 'DESIGN_APPROVED'));
      writeFile(testTopic, 'instruction.md', '# Instruction');
      writeFile(testTopic, 'plan.md', '# Plan');
      writeFile(testTopic, 'design-review.md', '# Review without status');

      const result = checkGate(testTopic);
      expect(result.exitCode).toBe(ExitCode.COMMAND_ERROR);
    });

    it('does NOT update meta.json when COMMAND_ERROR on design-review', () => {
      createTopic(testTopic);
      const originalMeta = createValidMeta(testTopic, 'DESIGN_APPROVED');
      writeMeta(testTopic, originalMeta);
      writeFile(testTopic, 'instruction.md', '# Instruction');
      writeFile(testTopic, 'plan.md', '# Plan');
      writeFile(testTopic, 'design-review.md', 'Status: INVALID');

      checkGate(testTopic);

      const afterMeta = readMetaFile(testTopic) as { status: string };
      expect(afterMeta.status).toBe('DESIGN_APPROVED');
    });

    it('returns REJECTED (17) when Status is REJECTED', () => {
      createTopic(testTopic);
      writeMeta(testTopic, createValidMeta(testTopic, 'DESIGN_APPROVED'));
      writeFile(testTopic, 'instruction.md', '# Instruction');
      writeFile(testTopic, 'plan.md', '# Plan');
      writeFile(testTopic, 'design-review.md', 'Status: REJECTED');

      const result = checkGate(testTopic);
      expect(result.exitCode).toBe(ExitCode.REJECTED);
      expect(result.status).toBe('REJECTED');
    });

    it('returns NEEDS_DESIGN_REVIEW (12) when Status is NEEDS_CHANGES (Attempt model)', () => {
      createTopic(testTopic);
      writeMeta(testTopic, createValidMeta(testTopic, 'DESIGN_APPROVED'));
      writeFile(testTopic, 'instruction.md', '# Instruction');
      writeFile(testTopic, 'plan.md', '# Plan');
      writeFile(testTopic, 'design-review.md', 'Status: NEEDS_CHANGES');

      const result = checkGate(testTopic);
      expect(result.exitCode).toBe(ExitCode.NEEDS_DESIGN_REVIEW);
      expect(result.status).toBe('NEEDS_DESIGN_REVIEW');
    });
  });

  describe('Step F: Implementation phase (DESIGN_APPROVED)', () => {
    describe('F1: impl-review.md exists', () => {
      it('returns COMMAND_ERROR (1) when impl-review Status line is invalid', () => {
        createTopic(testTopic);
        writeMeta(testTopic, createValidMeta(testTopic, 'IMPLEMENTING'));
        writeFile(testTopic, 'instruction.md', '# Instruction');
        writeFile(testTopic, 'plan.md', '# Plan');
        writeFile(testTopic, 'design-review.md', 'Status: DESIGN_APPROVED');
        writeFile(testTopic, 'impl.md', '# Impl');
        writeFile(testTopic, 'impl-review.md', 'Status: INVALID');

        const result = checkGate(testTopic);
        expect(result.exitCode).toBe(ExitCode.COMMAND_ERROR);
        expect(result.status).toBe('COMMAND_ERROR');
      });

      it('does NOT update meta.json when COMMAND_ERROR on impl-review', () => {
        createTopic(testTopic);
        const originalMeta = createValidMeta(testTopic, 'IMPLEMENTING');
        writeMeta(testTopic, originalMeta);
        writeFile(testTopic, 'instruction.md', '# Instruction');
        writeFile(testTopic, 'plan.md', '# Plan');
        writeFile(testTopic, 'design-review.md', 'Status: DESIGN_APPROVED');
        writeFile(testTopic, 'impl.md', '# Impl');
        writeFile(testTopic, 'impl-review.md', 'Status: INVALID');

        checkGate(testTopic);

        const afterMeta = readMetaFile(testTopic) as { status: string };
        expect(afterMeta.status).toBe('IMPLEMENTING');
      });

      it('returns DONE (0) when impl-review Status is DONE', () => {
        createTopic(testTopic);
        writeMeta(testTopic, createValidMeta(testTopic, 'IMPLEMENTING'));
        writeFile(testTopic, 'instruction.md', '# Instruction');
        writeFile(testTopic, 'plan.md', '# Plan');
        writeFile(testTopic, 'design-review.md', 'Status: DESIGN_APPROVED');
        writeFile(testTopic, 'impl.md', '# Impl');
        writeFile(testTopic, 'impl-review.md', 'Status: DONE');

        const result = checkGate(testTopic);
        expect(result.exitCode).toBe(ExitCode.DONE);
        expect(result.status).toBe('DONE');
      });

      it('returns IMPLEMENTING (14) when impl-review Status is NEEDS_CHANGES (rollback)', () => {
        createTopic(testTopic);
        writeMeta(testTopic, createValidMeta(testTopic, 'DONE')); // Was DONE
        writeFile(testTopic, 'instruction.md', '# Instruction');
        writeFile(testTopic, 'plan.md', '# Plan');
        writeFile(testTopic, 'design-review.md', 'Status: DESIGN_APPROVED');
        writeFile(testTopic, 'impl.md', '# Impl');
        writeFile(testTopic, 'impl-review.md', 'Status: NEEDS_CHANGES');

        const result = checkGate(testTopic);
        expect(result.exitCode).toBe(ExitCode.IMPLEMENTING);
        expect(result.status).toBe('IMPLEMENTING');
      });
    });

    describe('F2: impl.md exists but no impl-review.md', () => {
      it('returns NEEDS_IMPL_REVIEW (16)', () => {
        createTopic(testTopic);
        writeMeta(testTopic, createValidMeta(testTopic, 'IMPLEMENTING'));
        writeFile(testTopic, 'instruction.md', '# Instruction');
        writeFile(testTopic, 'plan.md', '# Plan');
        writeFile(testTopic, 'design-review.md', 'Status: DESIGN_APPROVED');
        writeFile(testTopic, 'impl.md', '# Impl');

        const result = checkGate(testTopic);
        expect(result.exitCode).toBe(ExitCode.NEEDS_IMPL_REVIEW);
        expect(result.status).toBe('NEEDS_IMPL_REVIEW');
      });
    });

    describe('F3: impl.md does not exist', () => {
      it('returns NEEDS_IMPL_REPORT (15) when meta.status is NEEDS_IMPL_REPORT', () => {
        createTopic(testTopic);
        writeMeta(testTopic, createValidMeta(testTopic, 'NEEDS_IMPL_REPORT'));
        writeFile(testTopic, 'instruction.md', '# Instruction');
        writeFile(testTopic, 'plan.md', '# Plan');
        writeFile(testTopic, 'design-review.md', 'Status: DESIGN_APPROVED');

        const result = checkGate(testTopic);
        expect(result.exitCode).toBe(ExitCode.NEEDS_IMPL_REPORT);
        expect(result.status).toBe('NEEDS_IMPL_REPORT');
      });

      it('returns IMPLEMENTING (14) when meta.status is IMPLEMENTING', () => {
        createTopic(testTopic);
        writeMeta(testTopic, createValidMeta(testTopic, 'IMPLEMENTING'));
        writeFile(testTopic, 'instruction.md', '# Instruction');
        writeFile(testTopic, 'plan.md', '# Plan');
        writeFile(testTopic, 'design-review.md', 'Status: DESIGN_APPROVED');

        const result = checkGate(testTopic);
        expect(result.exitCode).toBe(ExitCode.IMPLEMENTING);
        expect(result.status).toBe('IMPLEMENTING');
      });

      it('returns DESIGN_APPROVED (13) when not in implementation phase', () => {
        createTopic(testTopic);
        writeMeta(testTopic, createValidMeta(testTopic, 'DESIGN_APPROVED'));
        writeFile(testTopic, 'instruction.md', '# Instruction');
        writeFile(testTopic, 'plan.md', '# Plan');
        writeFile(testTopic, 'design-review.md', 'Status: DESIGN_APPROVED');

        const result = checkGate(testTopic);
        expect(result.exitCode).toBe(ExitCode.DESIGN_APPROVED);
        expect(result.status).toBe('DESIGN_APPROVED');
      });
    });
  });

  describe('v3 specific: hash mismatch does NOT cause BROKEN_STATE', () => {
    it('returns DONE even when hash mismatch in DONE state', () => {
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
          'wrong-hash' // intentionally wrong hash
        )
      );

      const result = checkGate(testTopic);
      expect(result.exitCode).toBe(ExitCode.DONE);
      expect(result.status).toBe('DONE');
    });

    it('returns REJECTED even when hash mismatch in REJECTED state', () => {
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
      expect(result.exitCode).toBe(ExitCode.REJECTED);
      expect(result.status).toBe('REJECTED');
    });

    it('returns DONE even when planSha256 is null', () => {
      const designReviewContent = 'Status: DESIGN_APPROVED';
      const implContent = '# Impl';
      const implReviewContent = 'Status: DONE';
      createTopic(testTopic);
      writeFile(testTopic, 'instruction.md', '# Instruction');
      writeFile(testTopic, 'plan.md', '# Plan');
      writeFile(testTopic, 'design-review.md', designReviewContent);
      writeFile(testTopic, 'impl.md', implContent);
      writeFile(testTopic, 'impl-review.md', implReviewContent);
      writeMeta(
        testTopic,
        createValidMeta(
          testTopic,
          'DONE',
          null, // planSha256 is null
          sha256(designReviewContent),
          sha256(implContent),
          sha256(implReviewContent)
        )
      );

      const result = checkGate(testTopic);
      expect(result.exitCode).toBe(ExitCode.DONE);
      expect(result.status).toBe('DONE');
    });
  });

  describe('v3 specific: rollback from DONE', () => {
    it('changes from DONE to IMPLEMENTING when impl-review is changed to NEEDS_CHANGES', () => {
      createTopic(testTopic);
      // Start with DONE state
      writeMeta(testTopic, createValidMeta(testTopic, 'DONE'));
      writeFile(testTopic, 'instruction.md', '# Instruction');
      writeFile(testTopic, 'plan.md', '# Plan');
      writeFile(testTopic, 'design-review.md', 'Status: DESIGN_APPROVED');
      writeFile(testTopic, 'impl.md', '# Impl');
      // Change impl-review to NEEDS_CHANGES
      writeFile(testTopic, 'impl-review.md', 'Status: NEEDS_CHANGES');

      const result = checkGate(testTopic);
      expect(result.exitCode).toBe(ExitCode.IMPLEMENTING);
      expect(result.status).toBe('IMPLEMENTING');

      // Verify meta.json was updated
      const afterMeta = readMetaFile(testTopic) as { status: string };
      expect(afterMeta.status).toBe('IMPLEMENTING');
    });
  });

  describe('v3 specific: reconcile (meta.json sync)', () => {
    it('updates meta.json hashes when state is derived', () => {
      const planContent = '# Plan';
      const designReviewContent = 'Status: DESIGN_APPROVED';
      createTopic(testTopic);
      writeMeta(testTopic, createValidMeta(testTopic, 'NEEDS_DESIGN_REVIEW', null, null, null, null));
      writeFile(testTopic, 'instruction.md', '# Instruction');
      writeFile(testTopic, 'plan.md', planContent);
      writeFile(testTopic, 'design-review.md', designReviewContent);

      checkGate(testTopic);

      const afterMeta = readMetaFile(testTopic) as { hashes: { planSha256: string; designReviewSha256: string } };
      expect(afterMeta.hashes.planSha256).toBe(sha256(planContent));
      expect(afterMeta.hashes.designReviewSha256).toBe(sha256(designReviewContent));
    });

    it('updates meta.json status when state is derived', () => {
      createTopic(testTopic);
      writeMeta(testTopic, createValidMeta(testTopic, 'NEEDS_PLAN'));
      writeFile(testTopic, 'instruction.md', '# Instruction');
      writeFile(testTopic, 'plan.md', '# Plan');
      writeFile(testTopic, 'design-review.md', 'Status: DESIGN_APPROVED');

      checkGate(testTopic);

      const afterMeta = readMetaFile(testTopic) as { status: string };
      expect(afterMeta.status).toBe('DESIGN_APPROVED');
    });

    it('updates timestamps.updatedAt when state is derived', () => {
      createTopic(testTopic);
      const originalMeta = createValidMeta(testTopic, 'NEEDS_PLAN');
      writeMeta(testTopic, originalMeta);
      writeFile(testTopic, 'instruction.md', '# Instruction');
      writeFile(testTopic, 'plan.md', '# Plan');

      checkGate(testTopic);

      const afterMeta = readMetaFile(testTopic) as { timestamps: { updatedAt: string } };
      expect(afterMeta.timestamps.updatedAt).not.toBe('2026-01-19T10:00:00+09:00');
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

  describe('Attempt model: design-review', () => {
    function writeAttempt(topic: string, dir: string, filename: string, content: string) {
      const topicDir = getTopicDir(topic);
      const attemptDir = join(topicDir, dir);
      mkdirSync(attemptDir, { recursive: true });
      writeFileSync(join(attemptDir, filename), content);
    }

    it('reads latest attempt when attempt directory exists', () => {
      createTopic(testTopic);
      writeMeta(testTopic, createValidMeta(testTopic, 'NEEDS_DESIGN_REVIEW'));
      writeFile(testTopic, 'instruction.md', '# Instruction');
      writeFile(testTopic, 'plan.md', '# Plan');
      writeAttempt(testTopic, 'design-review', 'attempt-001.md', 'Status: DESIGN_APPROVED');

      const result = checkGate(testTopic);
      expect(result.exitCode).toBe(ExitCode.DESIGN_APPROVED);
      expect(result.status).toBe('DESIGN_APPROVED');
    });

    it('NEEDS_CHANGES in latest attempt returns NEEDS_DESIGN_REVIEW (12)', () => {
      createTopic(testTopic);
      writeMeta(testTopic, createValidMeta(testTopic, 'NEEDS_DESIGN_REVIEW'));
      writeFile(testTopic, 'instruction.md', '# Instruction');
      writeFile(testTopic, 'plan.md', '# Plan');
      writeAttempt(testTopic, 'design-review', 'attempt-001.md', 'Status: NEEDS_CHANGES');

      const result = checkGate(testTopic);
      expect(result.exitCode).toBe(ExitCode.NEEDS_DESIGN_REVIEW);
      expect(result.status).toBe('NEEDS_DESIGN_REVIEW');
    });

    it('REJECTED in latest attempt returns REJECTED (17)', () => {
      createTopic(testTopic);
      writeMeta(testTopic, createValidMeta(testTopic, 'NEEDS_DESIGN_REVIEW'));
      writeFile(testTopic, 'instruction.md', '# Instruction');
      writeFile(testTopic, 'plan.md', '# Plan');
      writeAttempt(testTopic, 'design-review', 'attempt-001.md', 'Status: REJECTED');

      const result = checkGate(testTopic);
      expect(result.exitCode).toBe(ExitCode.REJECTED);
      expect(result.status).toBe('REJECTED');
    });

    it('invalid Status in latest attempt returns COMMAND_ERROR (1)', () => {
      createTopic(testTopic);
      writeMeta(testTopic, createValidMeta(testTopic, 'NEEDS_DESIGN_REVIEW'));
      writeFile(testTopic, 'instruction.md', '# Instruction');
      writeFile(testTopic, 'plan.md', '# Plan');
      writeAttempt(testTopic, 'design-review', 'attempt-001.md', 'Status: INVALID');

      const result = checkGate(testTopic);
      expect(result.exitCode).toBe(ExitCode.COMMAND_ERROR);
      expect(result.status).toBe('COMMAND_ERROR');
    });
  });

  describe('Attempt model: stack avoidance', () => {
    function writeAttempt(topic: string, dir: string, filename: string, content: string) {
      const topicDir = getTopicDir(topic);
      const attemptDir = join(topicDir, dir);
      mkdirSync(attemptDir, { recursive: true });
      writeFileSync(join(attemptDir, filename), content);
    }

    it('uses latest attempt when multiple attempts exist (stack avoidance)', () => {
      createTopic(testTopic);
      writeMeta(testTopic, createValidMeta(testTopic, 'NEEDS_DESIGN_REVIEW'));
      writeFile(testTopic, 'instruction.md', '# Instruction');
      writeFile(testTopic, 'plan.md', '# Plan');
      // attempt-001 is NEEDS_CHANGES (old, should be ignored)
      writeAttempt(testTopic, 'design-review', 'attempt-001.md', 'Status: NEEDS_CHANGES');
      // attempt-002 is DESIGN_APPROVED (latest, should be used)
      writeAttempt(testTopic, 'design-review', 'attempt-002.md', 'Status: DESIGN_APPROVED');

      const result = checkGate(testTopic);
      expect(result.exitCode).toBe(ExitCode.DESIGN_APPROVED);
      expect(result.status).toBe('DESIGN_APPROVED');
    });

    it('correctly sorts by numeric value not lexicographic', () => {
      createTopic(testTopic);
      writeMeta(testTopic, createValidMeta(testTopic, 'NEEDS_DESIGN_REVIEW'));
      writeFile(testTopic, 'instruction.md', '# Instruction');
      writeFile(testTopic, 'plan.md', '# Plan');
      // Lexicographic: attempt-10 < attempt-2, but numeric: attempt-2 < attempt-10
      writeAttempt(testTopic, 'design-review', 'attempt-2.md', 'Status: NEEDS_CHANGES');
      writeAttempt(testTopic, 'design-review', 'attempt-10.md', 'Status: DESIGN_APPROVED');

      const result = checkGate(testTopic);
      expect(result.exitCode).toBe(ExitCode.DESIGN_APPROVED);
      expect(result.status).toBe('DESIGN_APPROVED');
    });
  });

  describe('Attempt model: impl-review', () => {
    function writeAttempt(topic: string, dir: string, filename: string, content: string) {
      const topicDir = getTopicDir(topic);
      const attemptDir = join(topicDir, dir);
      mkdirSync(attemptDir, { recursive: true });
      writeFileSync(join(attemptDir, filename), content);
    }

    it('NEEDS_CHANGES in latest impl-review attempt returns IMPLEMENTING (14)', () => {
      createTopic(testTopic);
      writeMeta(testTopic, createValidMeta(testTopic, 'IMPLEMENTING'));
      writeFile(testTopic, 'instruction.md', '# Instruction');
      writeFile(testTopic, 'plan.md', '# Plan');
      writeFile(testTopic, 'design-review.md', 'Status: DESIGN_APPROVED');
      writeFile(testTopic, 'impl.md', '# Impl');
      writeAttempt(testTopic, 'impl-review', 'attempt-001.md', 'Status: NEEDS_CHANGES');

      const result = checkGate(testTopic);
      expect(result.exitCode).toBe(ExitCode.IMPLEMENTING);
      expect(result.status).toBe('IMPLEMENTING');
    });

    it('DONE in latest impl-review attempt returns DONE (0)', () => {
      createTopic(testTopic);
      writeMeta(testTopic, createValidMeta(testTopic, 'IMPLEMENTING'));
      writeFile(testTopic, 'instruction.md', '# Instruction');
      writeFile(testTopic, 'plan.md', '# Plan');
      writeFile(testTopic, 'design-review.md', 'Status: DESIGN_APPROVED');
      writeFile(testTopic, 'impl.md', '# Impl');
      writeAttempt(testTopic, 'impl-review', 'attempt-001.md', 'Status: DONE');

      const result = checkGate(testTopic);
      expect(result.exitCode).toBe(ExitCode.DONE);
      expect(result.status).toBe('DONE');
    });

    it('invalid Status in latest impl-review attempt returns COMMAND_ERROR (1)', () => {
      createTopic(testTopic);
      writeMeta(testTopic, createValidMeta(testTopic, 'IMPLEMENTING'));
      writeFile(testTopic, 'instruction.md', '# Instruction');
      writeFile(testTopic, 'plan.md', '# Plan');
      writeFile(testTopic, 'design-review.md', 'Status: DESIGN_APPROVED');
      writeFile(testTopic, 'impl.md', '# Impl');
      writeAttempt(testTopic, 'impl-review', 'attempt-001.md', 'Status: INVALID');

      const result = checkGate(testTopic);
      expect(result.exitCode).toBe(ExitCode.COMMAND_ERROR);
      expect(result.status).toBe('COMMAND_ERROR');
    });

    it('uses latest attempt for impl-review (stack avoidance)', () => {
      createTopic(testTopic);
      writeMeta(testTopic, createValidMeta(testTopic, 'IMPLEMENTING'));
      writeFile(testTopic, 'instruction.md', '# Instruction');
      writeFile(testTopic, 'plan.md', '# Plan');
      writeFile(testTopic, 'design-review.md', 'Status: DESIGN_APPROVED');
      writeFile(testTopic, 'impl.md', '# Impl');
      // attempt-001 is NEEDS_CHANGES
      writeAttempt(testTopic, 'impl-review', 'attempt-001.md', 'Status: NEEDS_CHANGES');
      // attempt-002 is DONE (latest)
      writeAttempt(testTopic, 'impl-review', 'attempt-002.md', 'Status: DONE');

      const result = checkGate(testTopic);
      expect(result.exitCode).toBe(ExitCode.DONE);
      expect(result.status).toBe('DONE');
    });
  });

  describe('Attempt model: backward compatibility', () => {
    function writeAttempt(topic: string, dir: string, filename: string, content: string) {
      const topicDir = getTopicDir(topic);
      const attemptDir = join(topicDir, dir);
      mkdirSync(attemptDir, { recursive: true });
      writeFileSync(join(attemptDir, filename), content);
    }

    it('reads legacy design-review.md when no attempt dir exists', () => {
      createTopic(testTopic);
      writeMeta(testTopic, createValidMeta(testTopic, 'NEEDS_DESIGN_REVIEW'));
      writeFile(testTopic, 'instruction.md', '# Instruction');
      writeFile(testTopic, 'plan.md', '# Plan');
      writeFile(testTopic, 'design-review.md', 'Status: DESIGN_APPROVED');

      const result = checkGate(testTopic);
      expect(result.exitCode).toBe(ExitCode.DESIGN_APPROVED);
    });

    it('reads legacy impl-review.md when no attempt dir exists', () => {
      createTopic(testTopic);
      writeMeta(testTopic, createValidMeta(testTopic, 'IMPLEMENTING'));
      writeFile(testTopic, 'instruction.md', '# Instruction');
      writeFile(testTopic, 'plan.md', '# Plan');
      writeFile(testTopic, 'design-review.md', 'Status: DESIGN_APPROVED');
      writeFile(testTopic, 'impl.md', '# Impl');
      writeFile(testTopic, 'impl-review.md', 'Status: DONE');

      const result = checkGate(testTopic);
      expect(result.exitCode).toBe(ExitCode.DONE);
    });

    it('uses attempt dir when both attempt and legacy file exist', () => {
      createTopic(testTopic);
      writeMeta(testTopic, createValidMeta(testTopic, 'NEEDS_DESIGN_REVIEW'));
      writeFile(testTopic, 'instruction.md', '# Instruction');
      writeFile(testTopic, 'plan.md', '# Plan');
      // Legacy file says REJECTED
      writeFile(testTopic, 'design-review.md', 'Status: REJECTED');
      // Attempt says DESIGN_APPROVED (should take precedence)
      writeAttempt(testTopic, 'design-review', 'attempt-001.md', 'Status: DESIGN_APPROVED');

      const result = checkGate(testTopic);
      expect(result.exitCode).toBe(ExitCode.DESIGN_APPROVED);
    });

    it('falls back to legacy when attempt dir exists but is empty', () => {
      createTopic(testTopic);
      writeMeta(testTopic, createValidMeta(testTopic, 'NEEDS_DESIGN_REVIEW'));
      writeFile(testTopic, 'instruction.md', '# Instruction');
      writeFile(testTopic, 'plan.md', '# Plan');
      writeFile(testTopic, 'design-review.md', 'Status: DESIGN_APPROVED');
      // Create empty attempt dir
      const attemptDir = join(getTopicDir(testTopic), 'design-review');
      mkdirSync(attemptDir, { recursive: true });

      const result = checkGate(testTopic);
      expect(result.exitCode).toBe(ExitCode.DESIGN_APPROVED);
    });
  });
});
