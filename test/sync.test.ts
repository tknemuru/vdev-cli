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
  getGlobalClaudeDir,
  syncClaudeCommands,
  syncClaudeSubagents,
  directoriesDiffer,
} from '../src/core/claudeMdSync';
import { newPlan } from '../src/commands/new';
import { syncCommand } from '../src/commands/sync';
import { getPlansDir, getTopicDir } from '../src/core/paths';

const TEST_TOPIC_PREFIX = 'test-sync-';
const GLOBAL_CLAUDE_MD_PATH = join(homedir(), '.vdev', 'CLAUDE.md');
const GLOBAL_VDEV_DIR = join(homedir(), '.vdev');
const GLOBAL_CLAUDE_DIR = join(homedir(), '.vdev', '.claude');

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

describe('.claude directory sync', () => {
  const testRepoRoot = join(process.cwd(), 'test-repo-claude-dir');
  let globalClaudeDirExisted = false;
  let originalCommandsContent: Map<string, string> = new Map();
  let originalSubagentsContent: Map<string, string> = new Map();

  function backupGlobalClaudeDir() {
    globalClaudeDirExisted = existsSync(GLOBAL_CLAUDE_DIR);
    if (globalClaudeDirExisted) {
      const commandsDir = join(GLOBAL_CLAUDE_DIR, 'commands');
      const subagentsDir = join(GLOBAL_CLAUDE_DIR, 'subagents');
      if (existsSync(commandsDir)) {
        const files = require('fs').readdirSync(commandsDir);
        for (const file of files) {
          originalCommandsContent.set(file, readFileSync(join(commandsDir, file), 'utf8'));
        }
      }
      if (existsSync(subagentsDir)) {
        const files = require('fs').readdirSync(subagentsDir);
        for (const file of files) {
          originalSubagentsContent.set(file, readFileSync(join(subagentsDir, file), 'utf8'));
        }
      }
    }
  }

  function restoreGlobalClaudeDir() {
    // Clean up test directories
    if (existsSync(join(GLOBAL_CLAUDE_DIR, 'commands'))) {
      rmSync(join(GLOBAL_CLAUDE_DIR, 'commands'), { recursive: true });
    }
    if (existsSync(join(GLOBAL_CLAUDE_DIR, 'subagents'))) {
      rmSync(join(GLOBAL_CLAUDE_DIR, 'subagents'), { recursive: true });
    }

    // Restore original content
    if (originalCommandsContent.size > 0) {
      mkdirSync(join(GLOBAL_CLAUDE_DIR, 'commands'), { recursive: true });
      for (const [file, content] of originalCommandsContent) {
        writeFileSync(join(GLOBAL_CLAUDE_DIR, 'commands', file), content, 'utf8');
      }
    }
    if (originalSubagentsContent.size > 0) {
      mkdirSync(join(GLOBAL_CLAUDE_DIR, 'subagents'), { recursive: true });
      for (const [file, content] of originalSubagentsContent) {
        writeFileSync(join(GLOBAL_CLAUDE_DIR, 'subagents', file), content, 'utf8');
      }
    }
  }

  beforeEach(() => {
    backupGlobal();
    backupGlobalClaudeDir();
    mkdirSync(testRepoRoot, { recursive: true });
  });

  afterEach(() => {
    restoreGlobal();
    restoreGlobalClaudeDir();
    if (existsSync(testRepoRoot)) {
      rmSync(testRepoRoot, { recursive: true });
    }
  });

  it('getGlobalClaudeDir returns correct path', () => {
    const path = getGlobalClaudeDir();
    expect(path).toBe(join(homedir(), '.vdev', '.claude'));
  });

  it('syncClaudeCommands returns sourceMissing when source does not exist', () => {
    // Ensure commands dir does not exist
    if (existsSync(join(GLOBAL_CLAUDE_DIR, 'commands'))) {
      rmSync(join(GLOBAL_CLAUDE_DIR, 'commands'), { recursive: true });
    }
    const result = syncClaudeCommands(testRepoRoot, false);
    expect(result.success).toBe(false);
    expect(result.sourceMissing).toBe(true);
  });

  it('syncClaudeCommands copies directory when source exists', () => {
    // Create source directory with test file
    const srcDir = join(GLOBAL_CLAUDE_DIR, 'commands');
    mkdirSync(srcDir, { recursive: true });
    writeFileSync(join(srcDir, 'test-cmd.md'), '# Test Command\n', 'utf8');

    const result = syncClaudeCommands(testRepoRoot, false);
    expect(result.success).toBe(true);
    expect(result.written).toBe(true);
    expect(existsSync(join(testRepoRoot, '.claude', 'commands', 'test-cmd.md'))).toBe(true);
    expect(readFileSync(join(testRepoRoot, '.claude', 'commands', 'test-cmd.md'), 'utf8')).toBe('# Test Command\n');
  });

  it('syncClaudeSubagents returns sourceMissing when source does not exist', () => {
    // Ensure subagents dir does not exist
    if (existsSync(join(GLOBAL_CLAUDE_DIR, 'subagents'))) {
      rmSync(join(GLOBAL_CLAUDE_DIR, 'subagents'), { recursive: true });
    }
    const result = syncClaudeSubagents(testRepoRoot, false);
    expect(result.success).toBe(false);
    expect(result.sourceMissing).toBe(true);
  });

  it('syncClaudeSubagents copies directory when source exists', () => {
    // Create source directory with test file
    const srcDir = join(GLOBAL_CLAUDE_DIR, 'subagents');
    mkdirSync(srcDir, { recursive: true });
    writeFileSync(join(srcDir, 'test-agent.md'), '# Test Subagent\n', 'utf8');

    const result = syncClaudeSubagents(testRepoRoot, false);
    expect(result.success).toBe(true);
    expect(result.written).toBe(true);
    expect(existsSync(join(testRepoRoot, '.claude', 'subagents', 'test-agent.md'))).toBe(true);
    expect(readFileSync(join(testRepoRoot, '.claude', 'subagents', 'test-agent.md'), 'utf8')).toBe('# Test Subagent\n');
  });

  it('syncClaudeCommands returns hasDiff=true, written=false when diff exists and force=false', () => {
    // Create source directory with new content
    const srcDir = join(GLOBAL_CLAUDE_DIR, 'commands');
    mkdirSync(srcDir, { recursive: true });
    writeFileSync(join(srcDir, 'new-cmd.md'), '# New Command\n', 'utf8');

    // Create existing directory with different content
    const destDir = join(testRepoRoot, '.claude', 'commands');
    mkdirSync(destDir, { recursive: true });
    writeFileSync(join(destDir, 'old-cmd.md'), '# Old Command\n', 'utf8');

    const result = syncClaudeCommands(testRepoRoot, false);
    expect(result.success).toBe(false);
    expect(result.hasDiff).toBe(true);
    expect(result.written).toBe(false);
    // Old file should still exist (not overwritten)
    expect(existsSync(join(destDir, 'old-cmd.md'))).toBe(true);
  });

  it('syncClaudeCommands overwrites when diff exists and force=true', () => {
    // Create source directory with new content
    const srcDir = join(GLOBAL_CLAUDE_DIR, 'commands');
    mkdirSync(srcDir, { recursive: true });
    writeFileSync(join(srcDir, 'new-cmd.md'), '# New Command\n', 'utf8');

    // Create existing directory with different content
    const destDir = join(testRepoRoot, '.claude', 'commands');
    mkdirSync(destDir, { recursive: true });
    writeFileSync(join(destDir, 'old-cmd.md'), '# Old Command\n', 'utf8');

    const result = syncClaudeCommands(testRepoRoot, true);
    expect(result.success).toBe(true);
    expect(result.hasDiff).toBe(true);
    expect(result.written).toBe(true);
    // Old file should be removed
    expect(existsSync(join(destDir, 'old-cmd.md'))).toBe(false);
    // New file should exist
    expect(existsSync(join(destDir, 'new-cmd.md'))).toBe(true);
  });

  it('syncClaudeCommands returns hasDiff=false when content is identical', () => {
    // Create source directory
    const srcDir = join(GLOBAL_CLAUDE_DIR, 'commands');
    mkdirSync(srcDir, { recursive: true });
    writeFileSync(join(srcDir, 'cmd.md'), '# Same Content\n', 'utf8');

    // Create existing directory with same content
    const destDir = join(testRepoRoot, '.claude', 'commands');
    mkdirSync(destDir, { recursive: true });
    writeFileSync(join(destDir, 'cmd.md'), '# Same Content\n', 'utf8');

    const result = syncClaudeCommands(testRepoRoot, false);
    expect(result.success).toBe(true);
    expect(result.hasDiff).toBe(false);
    expect(result.written).toBe(false);
  });
});

describe('syncCommand with .claude directories', () => {
  const originalCwd = process.cwd();
  const testRepoRoot = join(process.cwd(), 'test-repo-sync-cmd');

  beforeEach(() => {
    backupGlobal();
    mkdirSync(testRepoRoot, { recursive: true });
    process.chdir(testRepoRoot);
    setGlobalClaudeMd('# Test Rules\n');
  });

  afterEach(() => {
    process.chdir(originalCwd);
    restoreGlobal();
    if (existsSync(testRepoRoot)) {
      rmSync(testRepoRoot, { recursive: true });
    }
    // Clean up .claude dirs if created
    if (existsSync(join(GLOBAL_CLAUDE_DIR, 'commands'))) {
      rmSync(join(GLOBAL_CLAUDE_DIR, 'commands'), { recursive: true });
    }
    if (existsSync(join(GLOBAL_CLAUDE_DIR, 'subagents'))) {
      rmSync(join(GLOBAL_CLAUDE_DIR, 'subagents'), { recursive: true });
    }
  });

  it('syncCommand includes commandsResult and subagentsResult', () => {
    const result = syncCommand(true);
    expect(result.commandsResult).toBeDefined();
    expect(result.subagentsResult).toBeDefined();
    // Both should be sourceMissing since we haven't created them
    expect(result.commandsResult?.sourceMissing).toBe(true);
    expect(result.subagentsResult?.sourceMissing).toBe(true);
    // But overall success should still be true (based on CLAUDE.md)
    expect(result.success).toBe(true);
  });

  it('syncCommand copies .claude directories when they exist', () => {
    // Create source directories
    mkdirSync(join(GLOBAL_CLAUDE_DIR, 'commands'), { recursive: true });
    mkdirSync(join(GLOBAL_CLAUDE_DIR, 'subagents'), { recursive: true });
    writeFileSync(join(GLOBAL_CLAUDE_DIR, 'commands', 'cmd.md'), '# Cmd\n', 'utf8');
    writeFileSync(join(GLOBAL_CLAUDE_DIR, 'subagents', 'agent.md'), '# Agent\n', 'utf8');

    const result = syncCommand(true);
    expect(result.commandsResult?.success).toBe(true);
    expect(result.subagentsResult?.success).toBe(true);
    expect(existsSync(join(testRepoRoot, '.claude', 'commands', 'cmd.md'))).toBe(true);
    expect(existsSync(join(testRepoRoot, '.claude', 'subagents', 'agent.md'))).toBe(true);
  });
});

describe('newPlan with .claude directories', () => {
  let createdTopics: string[] = [];

  beforeEach(() => {
    backupGlobal();
    createdTopics = [];
    const plansDir = getPlansDir();
    mkdirSync(plansDir, { recursive: true });
    setGlobalClaudeMd('# Test Rules\n');
  });

  afterEach(() => {
    restoreGlobal();
    for (const topic of createdTopics) {
      removeTopic(topic);
    }
    // Clean up .claude dirs if created
    if (existsSync(join(GLOBAL_CLAUDE_DIR, 'commands'))) {
      rmSync(join(GLOBAL_CLAUDE_DIR, 'commands'), { recursive: true });
    }
    if (existsSync(join(GLOBAL_CLAUDE_DIR, 'subagents'))) {
      rmSync(join(GLOBAL_CLAUDE_DIR, 'subagents'), { recursive: true });
    }
  });

  it('newPlan includes commandsResult and subagentsResult', () => {
    const result = newPlan(`${TEST_TOPIC_PREFIX}claude-dir`, true);
    createdTopics.push(result.topic);

    expect(result.success).toBe(true);
    expect(result.commandsResult).toBeDefined();
    expect(result.subagentsResult).toBeDefined();
  });
});
