import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, rmSync, existsSync } from 'fs';
import { newPlan } from '../src/commands/new';
import { savePlan } from '../src/commands/plan';
import { saveReview } from '../src/commands/review';
import { saveInstruction } from '../src/commands/instruction';
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
      expect(metaResult.meta.status).toBe('NEEDS_INSTRUCTION');
      expect(metaResult.meta.hashes.planSha256).toBe('');
      expect(metaResult.meta.hashes.reviewSha256).toBe('');
    }
  });

  it('fails when topic already exists', () => {
    const result1 = newPlan(`${TEST_TOPIC_PREFIX}duplicate`);
    createdTopics.push(result1.topic);
    expect(result1.success).toBe(true);

    // Create a second one with the same name on the same day
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

  it('saves plan and sets status to NEEDS_CHANGES', () => {
    const { topic } = newPlan(`${TEST_TOPIC_PREFIX}plan`);
    createdTopics.push(topic);
    saveInstruction(topic, '# Instruction');
    const result = savePlan(topic, '# My Plan');
    expect(result.success).toBe(true);

    const metaResult = readMeta(topic);
    expect(metaResult.success).toBe(true);
    if (metaResult.success) {
      expect(metaResult.meta.status).toBe('NEEDS_CHANGES');
      expect(metaResult.meta.hashes.planSha256).not.toBe('');
      expect(metaResult.meta.hashes.reviewSha256).toBe('');
    }
  });

  it('plan update invalidates previous approval', () => {
    const { topic } = newPlan(`${TEST_TOPIC_PREFIX}plan-inv`);
    createdTopics.push(topic);
    saveInstruction(topic, '# Instruction');
    savePlan(topic, '# Initial Plan');
    saveReview(topic, 'Status: APPROVED');

    // Verify APPROVED state
    let metaResult = readMeta(topic);
    expect(metaResult.success).toBe(true);
    if (metaResult.success) {
      expect(metaResult.meta.status).toBe('APPROVED');
    }

    // Update plan - should invalidate
    savePlan(topic, '# Modified Plan');
    metaResult = readMeta(topic);
    expect(metaResult.success).toBe(true);
    if (metaResult.success) {
      expect(metaResult.meta.status).toBe('NEEDS_CHANGES');
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

  it('extracts APPROVED status', () => {
    const { topic } = newPlan(`${TEST_TOPIC_PREFIX}review-a`);
    createdTopics.push(topic);
    saveInstruction(topic, '# Instruction');
    savePlan(topic, '# Plan');
    const result = saveReview(topic, 'Status: APPROVED\n\nLooks good!');
    expect(result.success).toBe(true);
    expect(result.status).toBe('APPROVED');
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

  it('extracts NEEDS_CHANGES status', () => {
    const { topic } = newPlan(`${TEST_TOPIC_PREFIX}review-n`);
    createdTopics.push(topic);
    saveInstruction(topic, '# Instruction');
    savePlan(topic, '# Plan');
    const result = saveReview(topic, 'Status: NEEDS_CHANGES\n\nPlease fix X.');
    expect(result.success).toBe(true);
    expect(result.status).toBe('NEEDS_CHANGES');
  });

  it('falls back to NEEDS_CHANGES when status extraction fails', () => {
    const { topic } = newPlan(`${TEST_TOPIC_PREFIX}review-f`);
    createdTopics.push(topic);
    saveInstruction(topic, '# Instruction');
    savePlan(topic, '# Plan');
    const result = saveReview(topic, 'No status line here');
    expect(result.success).toBe(true);
    expect(result.status).toBe('NEEDS_CHANGES');
    expect(result.message).toContain('status extraction failed');
  });

  it('is case insensitive for status extraction', () => {
    const { topic } = newPlan(`${TEST_TOPIC_PREFIX}review-ci`);
    createdTopics.push(topic);
    saveInstruction(topic, '# Instruction');
    savePlan(topic, '# Plan');
    const result = saveReview(topic, 'Status: approved');
    expect(result.success).toBe(true);
    expect(result.status).toBe('APPROVED');
  });
});
