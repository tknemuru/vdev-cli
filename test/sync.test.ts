import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdirSync, rmSync, existsSync, writeFileSync, readFileSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import {
  getGlobalClaudeMdPath,
  readGlobalClaudeMd,
  renderRepoClaudeMd,
  differs,
  readRepoClaudeMd,
  writeRepoClaudeMd,
  syncClaudeMd,
} from '../src/core/claudeMdSync';
import { newPlan } from '../src/commands/new';
import { getPlansDir, getTopicDir } from '../src/core/paths';

const TEST_TOPIC_PREFIX = 'test-sync-';
const GLOBAL_CLAUDE_MD_PATH = join(homedir(), '.vdev', 'CLAUDE.md');
const GLOBAL_VDEV_DIR = join(homedir(), '.vdev');

let originalGlobalContent: string | null = null;
let globalExisted = false;

function backupGlobal() {
  globalExisted = existsSync(GLOBAL_CLAUDE_MD_PATH);
  if (globalExisted) {
    originalGlobalContent = readFileSync(GLOBAL_CLAUDE_MD_PATH, 'utf8');
  }
}

function restoreGlobal() {
  if (globalExisted && originalGlobalContent !== null) {
    writeFileSync(GLOBAL_CLAUDE_MD_PATH, originalGlobalContent, 'utf8');
  } else if (!globalExisted && existsSync(GLOBAL_CLAUDE_MD_PATH)) {
    rmSync(GLOBAL_CLAUDE_MD_PATH);
  }
}

function setGlobalClaudeMd(content: string) {
  mkdirSync(GLOBAL_VDEV_DIR, { recursive: true });
  writeFileSync(GLOBAL_CLAUDE_MD_PATH, content, 'utf8');
}

function removeGlobalClaudeMd() {
  if (existsSync(GLOBAL_CLAUDE_MD_PATH)) {
    rmSync(GLOBAL_CLAUDE_MD_PATH);
  }
}

function removeTopic(topic: string) {
  const topicDir = getTopicDir(topic);
  if (existsSync(topicDir)) {
    rmSync(topicDir, { recursive: true });
  }
}

describe('claudeMdSync core functions', () => {
  beforeEach(() => {
    backupGlobal();
  });

  afterEach(() => {
    restoreGlobal();
  });

  it('getGlobalClaudeMdPath returns correct path', () => {
    const path = getGlobalClaudeMdPath();
    expect(path).toBe(join(homedir(), '.vdev', 'CLAUDE.md'));
  });

  it('readGlobalClaudeMd returns null when file does not exist', () => {
    removeGlobalClaudeMd();
    const content = readGlobalClaudeMd();
    expect(content).toBe(null);
  });

  it('readGlobalClaudeMd returns content when file exists', () => {
    setGlobalClaudeMd('# Test Content\n');
    const content = readGlobalClaudeMd();
    expect(content).toBe('# Test Content\n');
  });

  it('renderRepoClaudeMd generates correct header', () => {
    const globalBody = '# My Rules\n\nSome content.\n';
    const nowIso = '2026-01-20T10:00:00+09:00';
    const result = renderRepoClaudeMd(globalBody, nowIso);

    expect(result).toContain('<!-- AUTO-GENERATED FILE - DO NOT EDIT -->');
    expect(result).toContain('<!-- Source: ~/.vdev/CLAUDE.md -->');
    expect(result).toContain('<!-- Last synced: 2026-01-20T10:00:00+09:00 -->');
    expect(result).toContain('# My Rules');
    expect(result).toContain('Some content.');
  });

  it('differs returns true when current is null', () => {
    const generated = renderRepoClaudeMd('# Content\n', '2026-01-20T10:00:00+09:00');
    expect(differs(null, generated)).toBe(true);
  });

  it('differs returns false when content is identical', () => {
    const globalBody = '# Content\n';
    const generated = renderRepoClaudeMd(globalBody, '2026-01-20T10:00:00+09:00');
    expect(differs(generated, generated)).toBe(false);
  });

  it('differs returns false when only Last synced differs', () => {
    const globalBody = '# Content\n';
    const old = renderRepoClaudeMd(globalBody, '2026-01-19T10:00:00+09:00');
    const current = renderRepoClaudeMd(globalBody, '2026-01-20T12:00:00+09:00');
    expect(differs(old, current)).toBe(false);
  });

  it('differs returns true when body content differs', () => {
    const old = renderRepoClaudeMd('# Old Content\n', '2026-01-20T10:00:00+09:00');
    const current = renderRepoClaudeMd('# New Content\n', '2026-01-20T10:00:00+09:00');
    expect(differs(old, current)).toBe(true);
  });
});

describe('syncClaudeMd', () => {
  const testRepoRoot = join(process.cwd(), 'test-repo-sync');

  beforeEach(() => {
    backupGlobal();
    mkdirSync(testRepoRoot, { recursive: true });
  });

  afterEach(() => {
    restoreGlobal();
    if (existsSync(testRepoRoot)) {
      rmSync(testRepoRoot, { recursive: true });
    }
  });

  it('returns globalMissing when global CLAUDE.md does not exist', () => {
    removeGlobalClaudeMd();
    const result = syncClaudeMd(testRepoRoot, false);
    expect(result.success).toBe(false);
    expect(result.globalMissing).toBe(true);
  });

  it('creates CLAUDE.md when repo has none', () => {
    setGlobalClaudeMd('# Test Rules\n');
    const result = syncClaudeMd(testRepoRoot, false);
    expect(result.success).toBe(true);
    expect(result.written).toBe(true);
    expect(existsSync(join(testRepoRoot, 'CLAUDE.md'))).toBe(true);
  });

  it('returns hasDiff=true, written=false when diff exists and force=false', () => {
    setGlobalClaudeMd('# New Rules\n');
    writeFileSync(join(testRepoRoot, 'CLAUDE.md'), '# Old Content\n', 'utf8');
    const result = syncClaudeMd(testRepoRoot, false);
    expect(result.success).toBe(false);
    expect(result.hasDiff).toBe(true);
    expect(result.written).toBe(false);
  });

  it('overwrites when diff exists and force=true', () => {
    setGlobalClaudeMd('# New Rules\n');
    writeFileSync(join(testRepoRoot, 'CLAUDE.md'), '# Old Content\n', 'utf8');
    const result = syncClaudeMd(testRepoRoot, true);
    expect(result.success).toBe(true);
    expect(result.hasDiff).toBe(true);
    expect(result.written).toBe(true);
    const content = readFileSync(join(testRepoRoot, 'CLAUDE.md'), 'utf8');
    expect(content).toContain('# New Rules');
  });

  it('returns success with no write when content matches (Last synced only differs)', () => {
    const globalBody = '# Same Rules\n';
    setGlobalClaudeMd(globalBody);
    const existing = renderRepoClaudeMd(globalBody, '2020-01-01T00:00:00+09:00');
    writeFileSync(join(testRepoRoot, 'CLAUDE.md'), existing, 'utf8');

    const result = syncClaudeMd(testRepoRoot, false);
    expect(result.success).toBe(true);
    expect(result.hasDiff).toBe(false);
    expect(result.written).toBe(false);
  });
});

describe('newPlan with sync', () => {
  let createdTopics: string[] = [];

  beforeEach(() => {
    backupGlobal();
    createdTopics = [];
    const plansDir = getPlansDir();
    mkdirSync(plansDir, { recursive: true });
  });

  afterEach(() => {
    restoreGlobal();
    for (const topic of createdTopics) {
      removeTopic(topic);
    }
  });

  it('creates topic even when sync fails (globalMissing)', () => {
    removeGlobalClaudeMd();
    const result = newPlan(`${TEST_TOPIC_PREFIX}no-global`);
    createdTopics.push(result.topic);

    expect(result.success).toBe(true);
    expect(existsSync(result.path.replace(/\/$/, ''))).toBe(true);
    expect(result.syncResult).toBeDefined();
    expect(result.syncResult?.globalMissing).toBe(true);
    expect(result.syncResult?.success).toBe(false);
  });

  it('creates topic and syncs CLAUDE.md when global exists', () => {
    setGlobalClaudeMd('# Global Rules\n');
    const result = newPlan(`${TEST_TOPIC_PREFIX}with-global`, true);
    createdTopics.push(result.topic);

    expect(result.success).toBe(true);
    expect(result.syncResult).toBeDefined();
    expect(result.syncResult?.success).toBe(true);
  });
});
