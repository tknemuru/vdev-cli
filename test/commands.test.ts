import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, rmSync, existsSync, writeFileSync } from 'fs';
import { join } from 'path';
import { newPlan } from '../src/commands/new';
import { savePlan } from '../src/commands/plan';
import { saveReview } from '../src/commands/review';
import { saveInstruction } from '../src/commands/instruction';
import { startImplementation } from '../src/commands/start';
import { saveImpl } from '../src/commands/impl';
import { saveImplReview } from '../src/commands/impl-review';
import { readMeta } from '../src/core/meta';
import { getPlansDir, getTopicDir } from '../src/core/paths';

const TEST_TOPIC_PREFIX = 'test-cmd-';

function removeTopic(topic: string) {
  const topicDir = getTopicDir(topic);
  if (existsSync(topicDir)) {
    rmSync(topicDir, { recursive: true });
  }
}

describe('new command', () => {
  let createdTopics: string[] = [];

  beforeEach(() => {
    createdTopics = [];
    const plansDir = getPlansDir();
    mkdirSync(plansDir, { recursive: true });
  });

  afterEach(() => {
    for (const topic of createdTopics) {
      removeTopic(topic);
    }
  });

  it('creates a new topic directory', () => {
    const result = newPlan(`${TEST_TOPIC_PREFIX}auth-refresh`);
    createdTopics.push(result.topic);
    expect(result.success).toBe(true);
    expect(result.topic).toMatch(/^\d{4}-\d{2}-\d{2}-test-cmd-auth-refresh$/);
    expect(existsSync(result.path.replace(/\/$/, ''))).toBe(true);
  });

  it('creates meta.json with correct initial state', () => {
    const result = newPlan(`${TEST_TOPIC_PREFIX}feature`);
    createdTopics.push(result.topic);
    const metaResult = readMeta(result.topic);
    expect(metaResult.success).toBe(true);
    if (metaResult.success) {
      expect(metaResult.meta.schemaVersion).toBe(2);
      expect(metaResult.meta.status).toBe('NEEDS_INSTRUCTION');
      expect(metaResult.meta.hashes.planSha256).toBe(null);
      expect(metaResult.meta.hashes.designReviewSha256).toBe(null);
    }
  });

  it('fails when topic already exists', () => {
    const result1 = newPlan(`${TEST_TOPIC_PREFIX}duplicate`);
    createdTopics.push(result1.topic);
    expect(result1.success).toBe(true);

    const result2 = newPlan(`${TEST_TOPIC_PREFIX}duplicate`);
    expect(result2.success).toBe(false);
    expect(result2.message).toBe('topic already exists');
  });
});

describe('instruction command', () => {
  let createdTopics: string[] = [];

  beforeEach(() => {
    createdTopics = [];
    const plansDir = getPlansDir();
    mkdirSync(plansDir, { recursive: true });
  });

  afterEach(() => {
    for (const topic of createdTopics) {
      removeTopic(topic);
    }
  });

  it('saves instruction and updates status to NEEDS_PLAN', () => {
    const { topic } = newPlan(`${TEST_TOPIC_PREFIX}inst`);
    createdTopics.push(topic);
    const result = saveInstruction(topic, '# My Instruction');
    expect(result.success).toBe(true);

    const metaResult = readMeta(topic);
    expect(metaResult.success).toBe(true);
    if (metaResult.success) {
      expect(metaResult.meta.status).toBe('NEEDS_PLAN');
    }
  });
});

describe('plan command', () => {
  let createdTopics: string[] = [];

  beforeEach(() => {
    createdTopics = [];
    const plansDir = getPlansDir();
    mkdirSync(plansDir, { recursive: true });
  });

  afterEach(() => {
    for (const topic of createdTopics) {
      removeTopic(topic);
    }
  });

  it('saves plan and sets status to NEEDS_DESIGN_REVIEW', () => {
    const { topic } = newPlan(`${TEST_TOPIC_PREFIX}plan`);
    createdTopics.push(topic);
    saveInstruction(topic, '# Instruction');
    const result = savePlan(topic, '# My Plan');
    expect(result.success).toBe(true);

    const metaResult = readMeta(topic);
    expect(metaResult.success).toBe(true);
    if (metaResult.success) {
      expect(metaResult.meta.status).toBe('NEEDS_DESIGN_REVIEW');
      expect(metaResult.meta.hashes.planSha256).not.toBe(null);
      expect(metaResult.meta.hashes.designReviewSha256).toBe(null);
    }
  });

  it('fails when instruction.md not found', () => {
    const { topic } = newPlan(`${TEST_TOPIC_PREFIX}plan-no-inst`);
    createdTopics.push(topic);
    const result = savePlan(topic, '# My Plan');
    expect(result.success).toBe(false);
    expect(result.message).toBe('instruction.md not found');
  });

  it('plan update invalidates previous approval', () => {
    const { topic } = newPlan(`${TEST_TOPIC_PREFIX}plan-inv`);
    createdTopics.push(topic);
    saveInstruction(topic, '# Instruction');
    savePlan(topic, '# Initial Plan');
    saveReview(topic, 'Status: DESIGN_APPROVED');

    // Verify DESIGN_APPROVED state
    let metaResult = readMeta(topic);
    expect(metaResult.success).toBe(true);
    if (metaResult.success) {
      expect(metaResult.meta.status).toBe('DESIGN_APPROVED');
    }

    // Update plan - should invalidate
    savePlan(topic, '# Modified Plan');
    metaResult = readMeta(topic);
    expect(metaResult.success).toBe(true);
    if (metaResult.success) {
      expect(metaResult.meta.status).toBe('NEEDS_DESIGN_REVIEW');
    }
  });
});

describe('review command', () => {
  let createdTopics: string[] = [];

  beforeEach(() => {
    createdTopics = [];
    const plansDir = getPlansDir();
    mkdirSync(plansDir, { recursive: true });
  });

  afterEach(() => {
    for (const topic of createdTopics) {
      removeTopic(topic);
    }
  });

  it('extracts DESIGN_APPROVED status', () => {
    const { topic } = newPlan(`${TEST_TOPIC_PREFIX}review-a`);
    createdTopics.push(topic);
    saveInstruction(topic, '# Instruction');
    savePlan(topic, '# Plan');
    const result = saveReview(topic, 'Status: DESIGN_APPROVED\n\nLooks good!');
    expect(result.success).toBe(true);
    expect(result.status).toBe('DESIGN_APPROVED');
  });

  it('extracts REJECTED status', () => {
    const { topic } = newPlan(`${TEST_TOPIC_PREFIX}review-r`);
    createdTopics.push(topic);
    saveInstruction(topic, '# Instruction');
    savePlan(topic, '# Plan');
    const result = saveReview(topic, 'Status: REJECTED\n\nNeeds more work.');
    expect(result.success).toBe(true);
    expect(result.status).toBe('REJECTED');
  });

  it('extracts NEEDS_CHANGES status and transitions to NEEDS_PLAN', () => {
    const { topic } = newPlan(`${TEST_TOPIC_PREFIX}review-n`);
    createdTopics.push(topic);
    saveInstruction(topic, '# Instruction');
    savePlan(topic, '# Plan');
    const result = saveReview(topic, 'Status: NEEDS_CHANGES\n\nPlease fix X.');
    expect(result.success).toBe(true);
    expect(result.status).toBe('NEEDS_PLAN'); // NEEDS_CHANGES -> NEEDS_PLAN
  });

  it('fails when status extraction fails', () => {
    const { topic } = newPlan(`${TEST_TOPIC_PREFIX}review-f`);
    createdTopics.push(topic);
    saveInstruction(topic, '# Instruction');
    savePlan(topic, '# Plan');
    const result = saveReview(topic, 'No status line here');
    expect(result.success).toBe(false);
    expect(result.message).toContain('Status extraction failed');
  });

  it('is case insensitive for status extraction', () => {
    const { topic } = newPlan(`${TEST_TOPIC_PREFIX}review-ci`);
    createdTopics.push(topic);
    saveInstruction(topic, '# Instruction');
    savePlan(topic, '# Plan');
    const result = saveReview(topic, 'Status: design_approved');
    expect(result.success).toBe(true);
    expect(result.status).toBe('DESIGN_APPROVED');
  });

  it('fails when planSha256 is null (plan.md exists but vdev plan not executed)', () => {
    const { topic } = newPlan(`${TEST_TOPIC_PREFIX}review-no-plan-hash`);
    createdTopics.push(topic);
    saveInstruction(topic, '# Instruction');

    // Manually create plan.md (bypassing vdev plan)
    const topicDir = getTopicDir(topic);
    const planPath = join(topicDir, 'plan.md');
    writeFileSync(planPath, '# Manually created plan');

    // plan.md exists but planSha256 is null
    const result = saveReview(topic, 'Status: DESIGN_APPROVED');
    expect(result.success).toBe(false);
    expect(result.message).toContain('planSha256 not set');
  });
});

describe('start command', () => {
  let createdTopics: string[] = [];

  beforeEach(() => {
    createdTopics = [];
    const plansDir = getPlansDir();
    mkdirSync(plansDir, { recursive: true });
  });

  afterEach(() => {
    for (const topic of createdTopics) {
      removeTopic(topic);
    }
  });

  it('transitions from DESIGN_APPROVED to IMPLEMENTING', () => {
    const { topic } = newPlan(`${TEST_TOPIC_PREFIX}start`);
    createdTopics.push(topic);
    saveInstruction(topic, '# Instruction');
    savePlan(topic, '# Plan');
    saveReview(topic, 'Status: DESIGN_APPROVED');

    const result = startImplementation(topic);
    expect(result.success).toBe(true);

    const metaResult = readMeta(topic);
    expect(metaResult.success).toBe(true);
    if (metaResult.success) {
      expect(metaResult.meta.status).toBe('IMPLEMENTING');
    }
  });

  it('fails when status is not DESIGN_APPROVED', () => {
    const { topic } = newPlan(`${TEST_TOPIC_PREFIX}start-fail`);
    createdTopics.push(topic);
    saveInstruction(topic, '# Instruction');
    savePlan(topic, '# Plan');
    // Don't approve - status is NEEDS_DESIGN_REVIEW

    const result = startImplementation(topic);
    expect(result.success).toBe(false);
    expect(result.message).toContain('Cannot start');
  });
});

describe('impl command', () => {
  let createdTopics: string[] = [];

  beforeEach(() => {
    createdTopics = [];
    const plansDir = getPlansDir();
    mkdirSync(plansDir, { recursive: true });
  });

  afterEach(() => {
    for (const topic of createdTopics) {
      removeTopic(topic);
    }
  });

  it('saves impl and transitions to NEEDS_IMPL_REVIEW', () => {
    const { topic } = newPlan(`${TEST_TOPIC_PREFIX}impl`);
    createdTopics.push(topic);
    saveInstruction(topic, '# Instruction');
    savePlan(topic, '# Plan');
    saveReview(topic, 'Status: DESIGN_APPROVED');
    startImplementation(topic);

    const result = saveImpl(topic, '# Implementation Report');
    expect(result.success).toBe(true);

    const metaResult = readMeta(topic);
    expect(metaResult.success).toBe(true);
    if (metaResult.success) {
      expect(metaResult.meta.status).toBe('NEEDS_IMPL_REVIEW');
      expect(metaResult.meta.hashes.implSha256).not.toBe(null);
    }
  });

  it('fails when status is not IMPLEMENTING', () => {
    const { topic } = newPlan(`${TEST_TOPIC_PREFIX}impl-fail`);
    createdTopics.push(topic);
    saveInstruction(topic, '# Instruction');
    savePlan(topic, '# Plan');
    saveReview(topic, 'Status: DESIGN_APPROVED');
    // Don't start - status is DESIGN_APPROVED

    const result = saveImpl(topic, '# Implementation Report');
    expect(result.success).toBe(false);
    expect(result.message).toContain('Cannot save impl');
  });
});

describe('impl-review command', () => {
  let createdTopics: string[] = [];

  beforeEach(() => {
    createdTopics = [];
    const plansDir = getPlansDir();
    mkdirSync(plansDir, { recursive: true });
  });

  afterEach(() => {
    for (const topic of createdTopics) {
      removeTopic(topic);
    }
  });

  it('extracts DONE status and transitions to DONE', () => {
    const { topic } = newPlan(`${TEST_TOPIC_PREFIX}impl-review-d`);
    createdTopics.push(topic);
    saveInstruction(topic, '# Instruction');
    savePlan(topic, '# Plan');
    saveReview(topic, 'Status: DESIGN_APPROVED');
    startImplementation(topic);
    saveImpl(topic, '# Implementation Report');

    const result = saveImplReview(topic, 'Status: DONE\n\nShip it!');
    expect(result.success).toBe(true);
    expect(result.status).toBe('DONE');
  });

  it('extracts NEEDS_CHANGES status and transitions to IMPLEMENTING', () => {
    const { topic } = newPlan(`${TEST_TOPIC_PREFIX}impl-review-nc`);
    createdTopics.push(topic);
    saveInstruction(topic, '# Instruction');
    savePlan(topic, '# Plan');
    saveReview(topic, 'Status: DESIGN_APPROVED');
    startImplementation(topic);
    saveImpl(topic, '# Implementation Report');

    const result = saveImplReview(topic, 'Status: NEEDS_CHANGES\n\nFix bugs.');
    expect(result.success).toBe(true);
    expect(result.status).toBe('IMPLEMENTING');
  });

  it('fails when impl.md not found', () => {
    const { topic } = newPlan(`${TEST_TOPIC_PREFIX}impl-review-fail`);
    createdTopics.push(topic);
    saveInstruction(topic, '# Instruction');
    savePlan(topic, '# Plan');
    saveReview(topic, 'Status: DESIGN_APPROVED');
    startImplementation(topic);
    // Don't save impl

    const result = saveImplReview(topic, 'Status: DONE');
    expect(result.success).toBe(false);
    expect(result.message).toBe('impl.md not found');
  });

  it('fails when status extraction fails', () => {
    const { topic } = newPlan(`${TEST_TOPIC_PREFIX}impl-review-sf`);
    createdTopics.push(topic);
    saveInstruction(topic, '# Instruction');
    savePlan(topic, '# Plan');
    saveReview(topic, 'Status: DESIGN_APPROVED');
    startImplementation(topic);
    saveImpl(topic, '# Implementation Report');

    const result = saveImplReview(topic, 'No status line');
    expect(result.success).toBe(false);
    expect(result.message).toContain('Status extraction failed');
  });

  it('fails when implSha256 is null (impl.md exists but vdev impl not executed)', () => {
    const { topic } = newPlan(`${TEST_TOPIC_PREFIX}impl-review-no-impl-hash`);
    createdTopics.push(topic);
    saveInstruction(topic, '# Instruction');
    savePlan(topic, '# Plan');
    saveReview(topic, 'Status: DESIGN_APPROVED');
    startImplementation(topic);

    // Manually create impl.md (bypassing vdev impl)
    const topicDir = getTopicDir(topic);
    const implPath = join(topicDir, 'impl.md');
    writeFileSync(implPath, '# Manually created impl');

    // impl.md exists but implSha256 is null
    const result = saveImplReview(topic, 'Status: DONE');
    expect(result.success).toBe(false);
    expect(result.message).toContain('implSha256 not set');
  });
});

describe('full workflow e2e', () => {
  let createdTopics: string[] = [];

  beforeEach(() => {
    createdTopics = [];
    const plansDir = getPlansDir();
    mkdirSync(plansDir, { recursive: true });
  });

  afterEach(() => {
    for (const topic of createdTopics) {
      removeTopic(topic);
    }
  });

  it('completes full workflow from new to DONE', () => {
    // Step 1: new
    const { topic } = newPlan(`${TEST_TOPIC_PREFIX}e2e`);
    createdTopics.push(topic);

    // Step 2: instruction
    saveInstruction(topic, '# Instruction');
    let meta = readMeta(topic);
    expect(meta.success && meta.meta.status).toBe('NEEDS_PLAN');

    // Step 3: plan
    savePlan(topic, '# Plan');
    meta = readMeta(topic);
    expect(meta.success && meta.meta.status).toBe('NEEDS_DESIGN_REVIEW');

    // Step 4: review (DESIGN_APPROVED)
    saveReview(topic, 'Status: DESIGN_APPROVED');
    meta = readMeta(topic);
    expect(meta.success && meta.meta.status).toBe('DESIGN_APPROVED');

    // Step 5: start
    startImplementation(topic);
    meta = readMeta(topic);
    expect(meta.success && meta.meta.status).toBe('IMPLEMENTING');

    // Step 6: impl
    saveImpl(topic, '# Implementation Report');
    meta = readMeta(topic);
    expect(meta.success && meta.meta.status).toBe('NEEDS_IMPL_REVIEW');

    // Step 7: impl-review (DONE)
    saveImplReview(topic, 'Status: DONE');
    meta = readMeta(topic);
    expect(meta.success && meta.meta.status).toBe('DONE');
  });
});
