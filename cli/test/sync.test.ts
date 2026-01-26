import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, rmSync, existsSync, writeFileSync, readFileSync } from 'fs';
import { join } from 'path';
import {
  getGlobalClaudeMdPath,
  getSystemBasePath,
  readGlobalClaudeMd,
  renderRepoClaudeMd,
  differs,
  syncClaudeMd,
  getGlobalClaudeDir,
  syncClaudeDir,
  syncClaudeCommands,
  syncClaudeSubagents,
  syncKnowledges,
} from '../src/core/claudeMdSync';
import { newPlan } from '../src/commands/new';
import { syncCommand } from '../src/commands/sync';
import { getPlansDir, getTopicDir } from '../src/core/paths';

const TEST_TOPIC_PREFIX = 'test-sync-';

// System paths (monorepo structure)
// __dirname is cli/test/ (in source), cli/dist/test/ (after compile, though vitest uses source)
// getSystemBasePath() returns <repo-root>/system/
const SYSTEM_BASE = getSystemBasePath();
const SYSTEM_ADAPTERS_CLAUDE = join(SYSTEM_BASE, 'adapters', 'claude');
const SYSTEM_DOCS = join(SYSTEM_BASE, 'docs');

// Backup state for system/
let systemExisted = false;
let originalClaudeMd: string | null = null;
let originalVdevFlow: string | null = null;
let originalCommands: Map<string, string> = new Map();
let originalSubagents: Map<string, string> = new Map();
let originalKnowledges: Map<string, { path: string; content: string }[]> = new Map();
let originalClaudeDirFiles: Map<string, string> = new Map();

function backupSystem() {
  systemExisted = existsSync(SYSTEM_BASE);
  if (systemExisted) {
    const claudeMdPath = join(SYSTEM_ADAPTERS_CLAUDE, 'CLAUDE.md');
    if (existsSync(claudeMdPath)) {
      originalClaudeMd = readFileSync(claudeMdPath, 'utf8');
    }
    const vdevFlowPath = join(SYSTEM_DOCS, 'flow', 'vdev-flow.md');
    if (existsSync(vdevFlowPath)) {
      originalVdevFlow = readFileSync(vdevFlowPath, 'utf8');
    }
    const commandsDir = join(SYSTEM_ADAPTERS_CLAUDE, 'commands');
    if (existsSync(commandsDir)) {
      const files = require('fs').readdirSync(commandsDir);
      for (const file of files) {
        const stat = require('fs').statSync(join(commandsDir, file));
        if (stat.isFile()) {
          originalCommands.set(file, readFileSync(join(commandsDir, file), 'utf8'));
        }
      }
    }
    const subagentsDir = join(SYSTEM_ADAPTERS_CLAUDE, 'subagents');
    if (existsSync(subagentsDir)) {
      const files = require('fs').readdirSync(subagentsDir);
      for (const file of files) {
        const stat = require('fs').statSync(join(subagentsDir, file));
        if (stat.isFile()) {
          originalSubagents.set(file, readFileSync(join(subagentsDir, file), 'utf8'));
        }
      }
    }
    // Backup knowledges from system/docs/
    const knowledgeFiles = [
      { source: 'docs/flow/vdev-flow.md', target: 'vdev-flow.md' },
      { source: 'docs/rules/vdev-runtime-rules.md', target: 'vdev-runtime-rules.md' },
      { source: 'docs/formats/claude-output-format.md', target: 'claude-output-format.md' },
    ];
    for (const item of knowledgeFiles) {
      const srcPath = join(SYSTEM_BASE, item.source);
      if (existsSync(srcPath)) {
        const existing = originalKnowledges.get('knowledges') || [];
        existing.push({ path: item.source, content: readFileSync(srcPath, 'utf8') });
        originalKnowledges.set('knowledges', existing);
      }
    }
    // Backup claude dir root files (e.g., reviewer-principles.md)
    if (existsSync(SYSTEM_ADAPTERS_CLAUDE)) {
      const files = require('fs').readdirSync(SYSTEM_ADAPTERS_CLAUDE);
      for (const file of files) {
        const filePath = join(SYSTEM_ADAPTERS_CLAUDE, file);
        const stat = require('fs').statSync(filePath);
        if (stat.isFile() && file !== 'CLAUDE.md') {
          originalClaudeDirFiles.set(file, readFileSync(filePath, 'utf8'));
        }
      }
    }
  }
}

function restoreSystem() {
  // Restore CLAUDE.md
  const claudeMdPath = join(SYSTEM_ADAPTERS_CLAUDE, 'CLAUDE.md');
  if (originalClaudeMd !== null) {
    mkdirSync(SYSTEM_ADAPTERS_CLAUDE, { recursive: true });
    writeFileSync(claudeMdPath, originalClaudeMd, 'utf8');
  }

  // Restore vdev-flow.md
  const vdevFlowPath = join(SYSTEM_DOCS, 'flow', 'vdev-flow.md');
  if (originalVdevFlow !== null) {
    mkdirSync(join(SYSTEM_DOCS, 'flow'), { recursive: true });
    writeFileSync(vdevFlowPath, originalVdevFlow, 'utf8');
  }

  // Restore commands
  const commandsDir = join(SYSTEM_ADAPTERS_CLAUDE, 'commands');
  if (originalCommands.size > 0) {
    if (existsSync(commandsDir)) {
      rmSync(commandsDir, { recursive: true });
    }
    mkdirSync(commandsDir, { recursive: true });
    for (const [file, content] of originalCommands) {
      writeFileSync(join(commandsDir, file), content, 'utf8');
    }
  }

  // Restore subagents
  const subagentsDir = join(SYSTEM_ADAPTERS_CLAUDE, 'subagents');
  if (originalSubagents.size > 0) {
    if (existsSync(subagentsDir)) {
      rmSync(subagentsDir, { recursive: true });
    }
    mkdirSync(subagentsDir, { recursive: true });
    for (const [file, content] of originalSubagents) {
      writeFileSync(join(subagentsDir, file), content, 'utf8');
    }
  }

  // Restore knowledges
  const knowledgeItems = originalKnowledges.get('knowledges') || [];
  for (const item of knowledgeItems) {
    const destPath = join(SYSTEM_BASE, item.path);
    mkdirSync(require('path').dirname(destPath), { recursive: true });
    writeFileSync(destPath, item.content, 'utf8');
  }

  // Restore claude dir root files
  if (originalClaudeDirFiles.size > 0) {
    for (const [file, content] of originalClaudeDirFiles) {
      writeFileSync(join(SYSTEM_ADAPTERS_CLAUDE, file), content, 'utf8');
    }
  }

  // Reset state
  originalClaudeMd = null;
  originalVdevFlow = null;
  originalCommands = new Map();
  originalSubagents = new Map();
  originalKnowledges = new Map();
  originalClaudeDirFiles = new Map();
}

function setGlobalClaudeMd(content: string) {
  mkdirSync(SYSTEM_ADAPTERS_CLAUDE, { recursive: true });
  writeFileSync(join(SYSTEM_ADAPTERS_CLAUDE, 'CLAUDE.md'), content, 'utf8');
}

function removeGlobalClaudeMd() {
  const path = join(SYSTEM_ADAPTERS_CLAUDE, 'CLAUDE.md');
  if (existsSync(path)) {
    rmSync(path);
  }
}

function setKnowledgeFile(filename: string, content: string) {
  // Map target filename to source path
  const mapping: Record<string, string> = {
    'vdev-flow.md': 'docs/flow/vdev-flow.md',
    'vdev-runtime-rules.md': 'docs/rules/vdev-runtime-rules.md',
    'claude-output-format.md': 'docs/formats/claude-output-format.md',
  };
  const sourcePath = mapping[filename];
  if (sourcePath) {
    const fullPath = join(SYSTEM_BASE, sourcePath);
    mkdirSync(require('path').dirname(fullPath), { recursive: true });
    writeFileSync(fullPath, content, 'utf8');
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
    backupSystem();
  });

  afterEach(() => {
    restoreSystem();
  });

  it('getSystemBasePath returns correct path', () => {
    const path = getSystemBasePath();
    // Should end with 'system' and exist in monorepo
    expect(path.endsWith('system')).toBe(true);
    expect(existsSync(path)).toBe(true);
  });

  it('getGlobalClaudeMdPath returns correct path', () => {
    const path = getGlobalClaudeMdPath();
    expect(path).toBe(join(SYSTEM_BASE, 'adapters', 'claude', 'CLAUDE.md'));
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
    expect(result).toContain('<!-- Source: system/adapters/claude/CLAUDE.md -->');
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
    backupSystem();
    mkdirSync(testRepoRoot, { recursive: true });
  });

  afterEach(() => {
    restoreSystem();
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
    backupSystem();
    createdTopics = [];
    const plansDir = getPlansDir();
    mkdirSync(plansDir, { recursive: true });
  });

  afterEach(() => {
    restoreSystem();
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

  beforeEach(() => {
    backupSystem();
    mkdirSync(testRepoRoot, { recursive: true });
  });

  afterEach(() => {
    restoreSystem();
    if (existsSync(testRepoRoot)) {
      rmSync(testRepoRoot, { recursive: true });
    }
  });

  it('getGlobalClaudeDir returns correct path', () => {
    const path = getGlobalClaudeDir();
    expect(path).toBe(join(SYSTEM_BASE, 'adapters', 'claude'));
  });

  // syncClaudeDir tests (new unified function)

  it('syncClaudeDir returns sourceMissing when source does not exist', () => {
    // Temporarily remove the claude dir
    const claudeDir = SYSTEM_ADAPTERS_CLAUDE;
    const tempBackup = claudeDir + '.bak';
    if (existsSync(claudeDir)) {
      require('fs').renameSync(claudeDir, tempBackup);
    }
    try {
      const result = syncClaudeDir(testRepoRoot, false);
      expect(result.success).toBe(false);
      expect(result.sourceMissing).toBe(true);
    } finally {
      // Restore
      if (existsSync(tempBackup)) {
        require('fs').renameSync(tempBackup, claudeDir);
      }
    }
  });

  it('syncClaudeDir copies entire directory excluding CLAUDE.md', () => {
    // Create source directory with multiple files/dirs
    mkdirSync(SYSTEM_ADAPTERS_CLAUDE, { recursive: true });
    writeFileSync(join(SYSTEM_ADAPTERS_CLAUDE, 'CLAUDE.md'), '# Should be excluded\n', 'utf8');
    writeFileSync(
      join(SYSTEM_ADAPTERS_CLAUDE, 'test-file.md'),
      '# Test File\n',
      'utf8'
    );
    mkdirSync(join(SYSTEM_ADAPTERS_CLAUDE, 'commands'), { recursive: true });
    writeFileSync(
      join(SYSTEM_ADAPTERS_CLAUDE, 'commands', 'test-cmd.md'),
      '# Test Command\n',
      'utf8'
    );
    mkdirSync(join(SYSTEM_ADAPTERS_CLAUDE, 'subagents'), { recursive: true });
    writeFileSync(
      join(SYSTEM_ADAPTERS_CLAUDE, 'subagents', 'test-agent.md'),
      '# Test Agent\n',
      'utf8'
    );

    const result = syncClaudeDir(testRepoRoot, false);
    expect(result.success).toBe(true);
    expect(result.written).toBe(true);

    // CLAUDE.md should NOT be in .claude/
    expect(existsSync(join(testRepoRoot, '.claude', 'CLAUDE.md'))).toBe(false);

    // Other files should be synced
    expect(existsSync(join(testRepoRoot, '.claude', 'test-file.md'))).toBe(true);
    expect(readFileSync(join(testRepoRoot, '.claude', 'test-file.md'), 'utf8')).toBe(
      '# Test File\n'
    );
    expect(existsSync(join(testRepoRoot, '.claude', 'commands', 'test-cmd.md'))).toBe(true);
    expect(existsSync(join(testRepoRoot, '.claude', 'subagents', 'test-agent.md'))).toBe(true);
  });

  it('syncClaudeDir syncs future files without code change', () => {
    // Create source directory with a "future" file
    mkdirSync(SYSTEM_ADAPTERS_CLAUDE, { recursive: true });
    writeFileSync(join(SYSTEM_ADAPTERS_CLAUDE, 'CLAUDE.md'), '# Excluded\n', 'utf8');
    writeFileSync(join(SYSTEM_ADAPTERS_CLAUDE, 'future-feature.md'), '# Future Feature\n', 'utf8');
    mkdirSync(join(SYSTEM_ADAPTERS_CLAUDE, 'new-dir'), { recursive: true });
    writeFileSync(join(SYSTEM_ADAPTERS_CLAUDE, 'new-dir', 'nested.md'), '# Nested\n', 'utf8');

    const result = syncClaudeDir(testRepoRoot, false);
    expect(result.success).toBe(true);
    expect(result.written).toBe(true);

    // Future files should be synced automatically
    expect(existsSync(join(testRepoRoot, '.claude', 'future-feature.md'))).toBe(true);
    expect(existsSync(join(testRepoRoot, '.claude', 'new-dir', 'nested.md'))).toBe(true);
  });

  it('syncClaudeDir returns hasDiff=true, written=false when diff exists and force=false', () => {
    // Create source directory with minimal content
    mkdirSync(SYSTEM_ADAPTERS_CLAUDE, { recursive: true });
    writeFileSync(join(SYSTEM_ADAPTERS_CLAUDE, 'file.md'), '# New Content\n', 'utf8');

    // Create existing directory with different content
    const destDir = join(testRepoRoot, '.claude');
    mkdirSync(destDir, { recursive: true });
    writeFileSync(join(destDir, 'old-file.md'), '# Old Content\n', 'utf8');

    const result = syncClaudeDir(testRepoRoot, false);
    expect(result.success).toBe(false);
    expect(result.hasDiff).toBe(true);
    expect(result.written).toBe(false);
  });

  it('syncClaudeDir overwrites when diff exists and force=true', () => {
    // Create source directory with minimal content
    mkdirSync(SYSTEM_ADAPTERS_CLAUDE, { recursive: true });
    writeFileSync(join(SYSTEM_ADAPTERS_CLAUDE, 'file.md'), '# New Content\n', 'utf8');

    // Create existing directory with different content
    const destDir = join(testRepoRoot, '.claude');
    mkdirSync(destDir, { recursive: true });
    writeFileSync(join(destDir, 'old-file.md'), '# Old Content\n', 'utf8');

    const result = syncClaudeDir(testRepoRoot, true);
    expect(result.success).toBe(true);
    expect(result.hasDiff).toBe(true);
    expect(result.written).toBe(true);
    // Old file should be removed
    expect(existsSync(join(destDir, 'old-file.md'))).toBe(false);
    // New file should exist
    expect(existsSync(join(destDir, 'file.md'))).toBe(true);
  });

  it('syncClaudeDir returns hasDiff=false when content is identical', () => {
    // Clear and recreate source directory with only our test file
    // First backup and remove existing content
    const tempBackup = SYSTEM_ADAPTERS_CLAUDE + '.bak-identical-test';
    if (existsSync(SYSTEM_ADAPTERS_CLAUDE)) {
      require('fs').renameSync(SYSTEM_ADAPTERS_CLAUDE, tempBackup);
    }
    try {
      mkdirSync(SYSTEM_ADAPTERS_CLAUDE, { recursive: true });
      writeFileSync(join(SYSTEM_ADAPTERS_CLAUDE, 'file.md'), '# Same Content\n', 'utf8');

      // Create existing directory with same content
      const destDir = join(testRepoRoot, '.claude');
      mkdirSync(destDir, { recursive: true });
      writeFileSync(join(destDir, 'file.md'), '# Same Content\n', 'utf8');

      const result = syncClaudeDir(testRepoRoot, false);
      expect(result.success).toBe(true);
      expect(result.hasDiff).toBe(false);
      expect(result.written).toBe(false);
    } finally {
      // Restore original content
      if (existsSync(SYSTEM_ADAPTERS_CLAUDE)) {
        rmSync(SYSTEM_ADAPTERS_CLAUDE, { recursive: true });
      }
      if (existsSync(tempBackup)) {
        require('fs').renameSync(tempBackup, SYSTEM_ADAPTERS_CLAUDE);
      }
    }
  });

  // Legacy syncClaudeCommands/syncClaudeSubagents tests (kept for backward compatibility)

  it('syncClaudeCommands returns sourceMissing when source does not exist', () => {
    // Ensure commands dir does not exist
    const commandsDir = join(SYSTEM_ADAPTERS_CLAUDE, 'commands');
    if (existsSync(commandsDir)) {
      rmSync(commandsDir, { recursive: true });
    }
    const result = syncClaudeCommands(testRepoRoot, false);
    expect(result.success).toBe(false);
    expect(result.sourceMissing).toBe(true);
  });

  it('syncClaudeCommands copies directory when source exists', () => {
    // Create source directory with test file
    const srcDir = join(SYSTEM_ADAPTERS_CLAUDE, 'commands');
    mkdirSync(srcDir, { recursive: true });
    writeFileSync(join(srcDir, 'test-cmd.md'), '# Test Command\n', 'utf8');

    const result = syncClaudeCommands(testRepoRoot, false);
    expect(result.success).toBe(true);
    expect(result.written).toBe(true);
    expect(existsSync(join(testRepoRoot, '.claude', 'commands', 'test-cmd.md'))).toBe(true);
    expect(readFileSync(join(testRepoRoot, '.claude', 'commands', 'test-cmd.md'), 'utf8')).toBe(
      '# Test Command\n'
    );
  });

  it('syncClaudeSubagents returns sourceMissing when source does not exist', () => {
    // Ensure subagents dir does not exist
    const subagentsDir = join(SYSTEM_ADAPTERS_CLAUDE, 'subagents');
    if (existsSync(subagentsDir)) {
      rmSync(subagentsDir, { recursive: true });
    }
    const result = syncClaudeSubagents(testRepoRoot, false);
    expect(result.success).toBe(false);
    expect(result.sourceMissing).toBe(true);
  });

  it('syncClaudeSubagents copies directory when source exists', () => {
    // Create source directory with test file
    const srcDir = join(SYSTEM_ADAPTERS_CLAUDE, 'subagents');
    mkdirSync(srcDir, { recursive: true });
    writeFileSync(join(srcDir, 'test-agent.md'), '# Test Subagent\n', 'utf8');

    const result = syncClaudeSubagents(testRepoRoot, false);
    expect(result.success).toBe(true);
    expect(result.written).toBe(true);
    expect(existsSync(join(testRepoRoot, '.claude', 'subagents', 'test-agent.md'))).toBe(true);
    expect(readFileSync(join(testRepoRoot, '.claude', 'subagents', 'test-agent.md'), 'utf8')).toBe(
      '# Test Subagent\n'
    );
  });

  it('syncClaudeCommands returns hasDiff=true, written=false when diff exists and force=false', () => {
    // Create source directory with new content
    const srcDir = join(SYSTEM_ADAPTERS_CLAUDE, 'commands');
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
    const srcDir = join(SYSTEM_ADAPTERS_CLAUDE, 'commands');
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
    // Create source directory with only test file
    const srcDir = join(SYSTEM_ADAPTERS_CLAUDE, 'commands');
    if (existsSync(srcDir)) {
      rmSync(srcDir, { recursive: true });
    }
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

describe('knowledges sync', () => {
  const testRepoRoot = join(process.cwd(), 'test-repo-knowledges');

  beforeEach(() => {
    backupSystem();
    mkdirSync(testRepoRoot, { recursive: true });
  });

  afterEach(() => {
    restoreSystem();
    if (existsSync(testRepoRoot)) {
      rmSync(testRepoRoot, { recursive: true });
    }
  });

  it('syncKnowledges returns missingFiles when allowlist file not in system/docs/', () => {
    // Remove one of the required files
    const vdevFlowPath = join(SYSTEM_BASE, 'docs', 'flow', 'vdev-flow.md');
    if (existsSync(vdevFlowPath)) {
      rmSync(vdevFlowPath);
    }

    const result = syncKnowledges(testRepoRoot, false);
    expect(result.success).toBe(false);
    expect(result.missingFiles.length).toBeGreaterThan(0);
  });

  it('syncKnowledges copies only allowlist files', () => {
    // Ensure allowlist files exist
    setKnowledgeFile('vdev-flow.md', '# vdev Flow\n');
    setKnowledgeFile('vdev-runtime-rules.md', '# Runtime Rules\n');
    setKnowledgeFile('claude-output-format.md', '# Output Format\n');

    const result = syncKnowledges(testRepoRoot, false);
    expect(result.success).toBe(true);
    expect(result.written).toBe(true);

    const destDir = join(testRepoRoot, '.claude', 'knowledges');
    expect(existsSync(join(destDir, 'vdev-flow.md'))).toBe(true);
    expect(existsSync(join(destDir, 'vdev-runtime-rules.md'))).toBe(true);
    expect(existsSync(join(destDir, 'claude-output-format.md'))).toBe(true);
  });

  it('syncKnowledges returns hasDiff=false when content is identical', () => {
    // Set up source files
    setKnowledgeFile('vdev-flow.md', '# Content\n');
    setKnowledgeFile('vdev-runtime-rules.md', '# Rules\n');
    setKnowledgeFile('claude-output-format.md', '# Format\n');

    // Create existing directory with same content
    const destDir = join(testRepoRoot, '.claude', 'knowledges');
    mkdirSync(destDir, { recursive: true });
    writeFileSync(join(destDir, 'vdev-flow.md'), '# Content\n', 'utf8');
    writeFileSync(join(destDir, 'vdev-runtime-rules.md'), '# Rules\n', 'utf8');
    writeFileSync(join(destDir, 'claude-output-format.md'), '# Format\n', 'utf8');

    const result = syncKnowledges(testRepoRoot, false);
    expect(result.success).toBe(true);
    expect(result.hasDiff).toBe(false);
    expect(result.written).toBe(false);
  });

  it('syncKnowledges detects diff when dest has extra files', () => {
    // Set up source files
    setKnowledgeFile('vdev-flow.md', '# Content\n');
    setKnowledgeFile('vdev-runtime-rules.md', '# Rules\n');
    setKnowledgeFile('claude-output-format.md', '# Format\n');

    // Create existing directory with extra file
    const destDir = join(testRepoRoot, '.claude', 'knowledges');
    mkdirSync(destDir, { recursive: true });
    writeFileSync(join(destDir, 'vdev-flow.md'), '# Content\n', 'utf8');
    writeFileSync(join(destDir, 'vdev-runtime-rules.md'), '# Rules\n', 'utf8');
    writeFileSync(join(destDir, 'claude-output-format.md'), '# Format\n', 'utf8');
    writeFileSync(join(destDir, 'extra.md'), '# Extra\n', 'utf8');

    const result = syncKnowledges(testRepoRoot, false);
    expect(result.success).toBe(false);
    expect(result.hasDiff).toBe(true);
    expect(result.written).toBe(false);
  });

  it('syncKnowledges removes extra files when force=true', () => {
    // Set up source files
    setKnowledgeFile('vdev-flow.md', '# Content\n');
    setKnowledgeFile('vdev-runtime-rules.md', '# Rules\n');
    setKnowledgeFile('claude-output-format.md', '# Format\n');

    // Create existing directory with extra file
    const destDir = join(testRepoRoot, '.claude', 'knowledges');
    mkdirSync(destDir, { recursive: true });
    writeFileSync(join(destDir, 'vdev-flow.md'), '# Content\n', 'utf8');
    writeFileSync(join(destDir, 'vdev-runtime-rules.md'), '# Rules\n', 'utf8');
    writeFileSync(join(destDir, 'claude-output-format.md'), '# Format\n', 'utf8');
    writeFileSync(join(destDir, 'extra.md'), '# Extra\n', 'utf8');

    const result = syncKnowledges(testRepoRoot, true);
    expect(result.success).toBe(true);
    expect(result.written).toBe(true);
    expect(existsSync(join(destDir, 'vdev-flow.md'))).toBe(true);
    expect(existsSync(join(destDir, 'extra.md'))).toBe(false);
  });
});

describe('syncCommand with .claude directories', () => {
  const originalCwd = process.cwd();
  const testRepoRoot = join(process.cwd(), 'test-repo-sync-cmd');

  beforeEach(() => {
    backupSystem();
    mkdirSync(testRepoRoot, { recursive: true });
    process.chdir(testRepoRoot);
    setGlobalClaudeMd('# Test Rules\n');
  });

  afterEach(() => {
    process.chdir(originalCwd);
    restoreSystem();
    if (existsSync(testRepoRoot)) {
      rmSync(testRepoRoot, { recursive: true });
    }
  });

  it('syncCommand includes claudeDirResult and knowledgesResult', () => {
    const result = syncCommand(true);
    expect(result.claudeDirResult).toBeDefined();
    expect(result.knowledgesResult).toBeDefined();
    // Overall success should still be true (based on CLAUDE.md)
    expect(result.success).toBe(true);
  });

  it('syncCommand copies .claude directory when it exists', () => {
    // Create source directories
    mkdirSync(join(SYSTEM_ADAPTERS_CLAUDE, 'commands'), { recursive: true });
    mkdirSync(join(SYSTEM_ADAPTERS_CLAUDE, 'subagents'), { recursive: true });
    writeFileSync(join(SYSTEM_ADAPTERS_CLAUDE, 'commands', 'cmd.md'), '# Cmd\n', 'utf8');
    writeFileSync(join(SYSTEM_ADAPTERS_CLAUDE, 'subagents', 'agent.md'), '# Agent\n', 'utf8');
    writeFileSync(join(SYSTEM_ADAPTERS_CLAUDE, 'test-file.md'), '# Test\n', 'utf8');

    // Create knowledges
    setKnowledgeFile('vdev-flow.md', '# Knowledge\n');
    setKnowledgeFile('vdev-runtime-rules.md', '# Rules\n');
    setKnowledgeFile('claude-output-format.md', '# Format\n');

    const result = syncCommand(true);
    expect(result.claudeDirResult?.success).toBe(true);
    expect(result.knowledgesResult?.success).toBe(true);
    expect(existsSync(join(testRepoRoot, '.claude', 'commands', 'cmd.md'))).toBe(true);
    expect(existsSync(join(testRepoRoot, '.claude', 'subagents', 'agent.md'))).toBe(true);
    expect(existsSync(join(testRepoRoot, '.claude', 'test-file.md'))).toBe(true);
    expect(existsSync(join(testRepoRoot, '.claude', 'knowledges', 'vdev-flow.md'))).toBe(true);
    // CLAUDE.md should NOT be in .claude/
    expect(existsSync(join(testRepoRoot, '.claude', 'CLAUDE.md'))).toBe(false);
  });
});

describe('newPlan with .claude directories', () => {
  let createdTopics: string[] = [];

  beforeEach(() => {
    backupSystem();
    createdTopics = [];
    const plansDir = getPlansDir();
    mkdirSync(plansDir, { recursive: true });
    setGlobalClaudeMd('# Test Rules\n');
  });

  afterEach(() => {
    restoreSystem();
    for (const topic of createdTopics) {
      removeTopic(topic);
    }
  });

  it('newPlan includes claudeDirResult and knowledgesResult', () => {
    const result = newPlan(`${TEST_TOPIC_PREFIX}claude-dir`, true);
    createdTopics.push(result.topic);

    expect(result.success).toBe(true);
    expect(result.claudeDirResult).toBeDefined();
    expect(result.knowledgesResult).toBeDefined();
  });
});
