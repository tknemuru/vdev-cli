import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, rmSync, existsSync, writeFileSync, readFileSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import {
  getGlobalClaudeMdPath,
  getAiResourcesBasePath,
  readGlobalClaudeMd,
  renderRepoClaudeMd,
  differs,
  syncClaudeMd,
  getGlobalClaudeDir,
  syncClaudeCommands,
  syncClaudeSubagents,
  syncKnowledges,
  getKnowledgeManifestPath,
  readKnowledgeManifest,
  getKnowledgesSourceDir,
} from '../src/core/claudeMdSync';
import { newPlan } from '../src/commands/new';
import { syncCommand } from '../src/commands/sync';
import { getPlansDir, getTopicDir } from '../src/core/paths';

const TEST_TOPIC_PREFIX = 'test-sync-';

// ai-resources paths
const AI_RESOURCES_BASE = join(homedir(), 'projects', 'ai-resources', 'vibe-coding-partner');
const AI_RESOURCES_CLAUDE_DIR = join(AI_RESOURCES_BASE, 'claude');
const AI_RESOURCES_KNOWLEDGES_DIR = join(AI_RESOURCES_BASE, 'knowledges');

// Backup state for ai-resources
let aiResourcesExisted = false;
let originalClaudeMd: string | null = null;
let originalVdevFlow: string | null = null;
let originalCommands: Map<string, string> = new Map();
let originalSubagents: Map<string, string> = new Map();
let originalKnowledges: Map<string, string> = new Map();
let originalManifest: string | null = null;

function backupAiResources() {
  aiResourcesExisted = existsSync(AI_RESOURCES_BASE);
  if (aiResourcesExisted) {
    const claudeMdPath = join(AI_RESOURCES_CLAUDE_DIR, 'CLAUDE.md');
    if (existsSync(claudeMdPath)) {
      originalClaudeMd = readFileSync(claudeMdPath, 'utf8');
    }
    const vdevFlowPath = join(AI_RESOURCES_KNOWLEDGES_DIR, 'vdev-flow.md');
    if (existsSync(vdevFlowPath)) {
      originalVdevFlow = readFileSync(vdevFlowPath, 'utf8');
    }
    const manifestPath = join(AI_RESOURCES_CLAUDE_DIR, 'knowledge-manifest.txt');
    if (existsSync(manifestPath)) {
      originalManifest = readFileSync(manifestPath, 'utf8');
    }
    const commandsDir = join(AI_RESOURCES_CLAUDE_DIR, 'commands');
    if (existsSync(commandsDir)) {
      const files = require('fs').readdirSync(commandsDir);
      for (const file of files) {
        const stat = require('fs').statSync(join(commandsDir, file));
        if (stat.isFile()) {
          originalCommands.set(file, readFileSync(join(commandsDir, file), 'utf8'));
        }
      }
    }
    const subagentsDir = join(AI_RESOURCES_CLAUDE_DIR, 'subagents');
    if (existsSync(subagentsDir)) {
      const files = require('fs').readdirSync(subagentsDir);
      for (const file of files) {
        const stat = require('fs').statSync(join(subagentsDir, file));
        if (stat.isFile()) {
          originalSubagents.set(file, readFileSync(join(subagentsDir, file), 'utf8'));
        }
      }
    }
    if (existsSync(AI_RESOURCES_KNOWLEDGES_DIR)) {
      const files = require('fs').readdirSync(AI_RESOURCES_KNOWLEDGES_DIR);
      for (const file of files) {
        const stat = require('fs').statSync(join(AI_RESOURCES_KNOWLEDGES_DIR, file));
        if (stat.isFile()) {
          originalKnowledges.set(file, readFileSync(join(AI_RESOURCES_KNOWLEDGES_DIR, file), 'utf8'));
        }
      }
    }
  }
}

function restoreAiResources() {
  // Restore CLAUDE.md
  const claudeMdPath = join(AI_RESOURCES_CLAUDE_DIR, 'CLAUDE.md');
  if (originalClaudeMd !== null) {
    mkdirSync(AI_RESOURCES_CLAUDE_DIR, { recursive: true });
    writeFileSync(claudeMdPath, originalClaudeMd, 'utf8');
  } else if (!aiResourcesExisted && existsSync(claudeMdPath)) {
    rmSync(claudeMdPath);
  }

  // Restore vdev-flow.md
  const vdevFlowPath = join(AI_RESOURCES_KNOWLEDGES_DIR, 'vdev-flow.md');
  if (originalVdevFlow !== null) {
    mkdirSync(AI_RESOURCES_KNOWLEDGES_DIR, { recursive: true });
    writeFileSync(vdevFlowPath, originalVdevFlow, 'utf8');
  }

  // Restore manifest
  const manifestPath = join(AI_RESOURCES_CLAUDE_DIR, 'knowledge-manifest.txt');
  if (originalManifest !== null) {
    writeFileSync(manifestPath, originalManifest, 'utf8');
  } else if (!aiResourcesExisted && existsSync(manifestPath)) {
    rmSync(manifestPath);
  }

  // Restore commands
  const commandsDir = join(AI_RESOURCES_CLAUDE_DIR, 'commands');
  if (originalCommands.size > 0) {
    if (existsSync(commandsDir)) {
      rmSync(commandsDir, { recursive: true });
    }
    mkdirSync(commandsDir, { recursive: true });
    for (const [file, content] of originalCommands) {
      writeFileSync(join(commandsDir, file), content, 'utf8');
    }
  } else if (!aiResourcesExisted && existsSync(commandsDir)) {
    rmSync(commandsDir, { recursive: true });
  }

  // Restore subagents
  const subagentsDir = join(AI_RESOURCES_CLAUDE_DIR, 'subagents');
  if (originalSubagents.size > 0) {
    if (existsSync(subagentsDir)) {
      rmSync(subagentsDir, { recursive: true });
    }
    mkdirSync(subagentsDir, { recursive: true });
    for (const [file, content] of originalSubagents) {
      writeFileSync(join(subagentsDir, file), content, 'utf8');
    }
  } else if (!aiResourcesExisted && existsSync(subagentsDir)) {
    rmSync(subagentsDir, { recursive: true });
  }

  // Restore knowledges
  if (originalKnowledges.size > 0) {
    for (const [file, content] of originalKnowledges) {
      writeFileSync(join(AI_RESOURCES_KNOWLEDGES_DIR, file), content, 'utf8');
    }
  }

  // Reset state
  originalClaudeMd = null;
  originalVdevFlow = null;
  originalManifest = null;
  originalCommands = new Map();
  originalSubagents = new Map();
  originalKnowledges = new Map();
}

function setGlobalClaudeMd(content: string) {
  mkdirSync(AI_RESOURCES_CLAUDE_DIR, { recursive: true });
  writeFileSync(join(AI_RESOURCES_CLAUDE_DIR, 'CLAUDE.md'), content, 'utf8');
}

function removeGlobalClaudeMd() {
  const path = join(AI_RESOURCES_CLAUDE_DIR, 'CLAUDE.md');
  if (existsSync(path)) {
    rmSync(path);
  }
}

function setManifest(content: string) {
  mkdirSync(AI_RESOURCES_CLAUDE_DIR, { recursive: true });
  writeFileSync(join(AI_RESOURCES_CLAUDE_DIR, 'knowledge-manifest.txt'), content, 'utf8');
}

function setKnowledgeFile(filename: string, content: string) {
  mkdirSync(AI_RESOURCES_KNOWLEDGES_DIR, { recursive: true });
  writeFileSync(join(AI_RESOURCES_KNOWLEDGES_DIR, filename), content, 'utf8');
}

function removeTopic(topic: string) {
  const topicDir = getTopicDir(topic);
  if (existsSync(topicDir)) {
    rmSync(topicDir, { recursive: true });
  }
}

describe('claudeMdSync core functions', () => {
  beforeEach(() => {
    backupAiResources();
  });

  afterEach(() => {
    restoreAiResources();
  });

  it('getAiResourcesBasePath returns correct path', () => {
    const path = getAiResourcesBasePath();
    expect(path).toBe(join(homedir(), 'projects', 'ai-resources', 'vibe-coding-partner'));
  });

  it('getGlobalClaudeMdPath returns correct path', () => {
    const path = getGlobalClaudeMdPath();
    expect(path).toBe(
      join(homedir(), 'projects', 'ai-resources', 'vibe-coding-partner', 'claude', 'CLAUDE.md')
    );
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
    expect(result).toContain(
      '<!-- Source: ~/projects/ai-resources/vibe-coding-partner/claude/CLAUDE.md -->'
    );
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
    backupAiResources();
    mkdirSync(testRepoRoot, { recursive: true });
  });

  afterEach(() => {
    restoreAiResources();
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
    backupAiResources();
    createdTopics = [];
    const plansDir = getPlansDir();
    mkdirSync(plansDir, { recursive: true });
  });

  afterEach(() => {
    restoreAiResources();
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
  const GLOBAL_CLAUDE_DIR = join(AI_RESOURCES_CLAUDE_DIR);

  beforeEach(() => {
    backupAiResources();
    mkdirSync(testRepoRoot, { recursive: true });
  });

  afterEach(() => {
    restoreAiResources();
    if (existsSync(testRepoRoot)) {
      rmSync(testRepoRoot, { recursive: true });
    }
  });

  it('getGlobalClaudeDir returns correct path', () => {
    const path = getGlobalClaudeDir();
    expect(path).toBe(join(homedir(), 'projects', 'ai-resources', 'vibe-coding-partner', 'claude'));
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
    expect(readFileSync(join(testRepoRoot, '.claude', 'commands', 'test-cmd.md'), 'utf8')).toBe(
      '# Test Command\n'
    );
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
    expect(readFileSync(join(testRepoRoot, '.claude', 'subagents', 'test-agent.md'), 'utf8')).toBe(
      '# Test Subagent\n'
    );
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
    // Create source directory with only test file
    const srcDir = join(GLOBAL_CLAUDE_DIR, 'commands');
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
    backupAiResources();
    mkdirSync(testRepoRoot, { recursive: true });
  });

  afterEach(() => {
    restoreAiResources();
    if (existsSync(testRepoRoot)) {
      rmSync(testRepoRoot, { recursive: true });
    }
  });

  it('getKnowledgeManifestPath returns correct path', () => {
    const path = getKnowledgeManifestPath();
    expect(path).toBe(
      join(
        homedir(),
        'projects',
        'ai-resources',
        'vibe-coding-partner',
        'claude',
        'knowledge-manifest.txt'
      )
    );
  });

  it('getKnowledgesSourceDir returns correct path', () => {
    const path = getKnowledgesSourceDir();
    expect(path).toBe(
      join(homedir(), 'projects', 'ai-resources', 'vibe-coding-partner', 'knowledges')
    );
  });

  it('readKnowledgeManifest returns null when manifest does not exist', () => {
    const manifestPath = getKnowledgeManifestPath();
    if (existsSync(manifestPath)) {
      rmSync(manifestPath);
    }
    const result = readKnowledgeManifest();
    expect(result).toBe(null);
  });

  it('readKnowledgeManifest parses manifest correctly', () => {
    setManifest('file1.md\nfile2.md\n\n# comment\nfile3.md\n');
    const result = readKnowledgeManifest();
    expect(result).toEqual(['file1.md', 'file2.md', 'file3.md']);
  });

  it('syncKnowledges returns manifestMissing when manifest does not exist', () => {
    const manifestPath = getKnowledgeManifestPath();
    if (existsSync(manifestPath)) {
      rmSync(manifestPath);
    }
    const result = syncKnowledges(testRepoRoot, false);
    expect(result.success).toBe(false);
    expect(result.manifestMissing).toBe(true);
  });

  it('syncKnowledges returns missingFiles when manifest file not in knowledges/', () => {
    setManifest('existing.md\nmissing.md\n');
    setKnowledgeFile('existing.md', '# Existing\n');
    // missing.md is not created

    const result = syncKnowledges(testRepoRoot, false);
    expect(result.success).toBe(false);
    expect(result.missingFiles).toContain('missing.md');
  });

  it('syncKnowledges copies only allowlist files', () => {
    setManifest('allowed1.md\nallowed2.md\n');
    setKnowledgeFile('allowed1.md', '# Allowed 1\n');
    setKnowledgeFile('allowed2.md', '# Allowed 2\n');
    setKnowledgeFile('not-allowed.md', '# Not Allowed\n');

    const result = syncKnowledges(testRepoRoot, false);
    expect(result.success).toBe(true);
    expect(result.written).toBe(true);

    const destDir = join(testRepoRoot, '.claude', 'knowledges');
    expect(existsSync(join(destDir, 'allowed1.md'))).toBe(true);
    expect(existsSync(join(destDir, 'allowed2.md'))).toBe(true);
    expect(existsSync(join(destDir, 'not-allowed.md'))).toBe(false);
  });

  it('syncKnowledges returns hasDiff=false when content is identical', () => {
    setManifest('file.md\n');
    setKnowledgeFile('file.md', '# Content\n');

    // Create existing directory with same content
    const destDir = join(testRepoRoot, '.claude', 'knowledges');
    mkdirSync(destDir, { recursive: true });
    writeFileSync(join(destDir, 'file.md'), '# Content\n', 'utf8');

    const result = syncKnowledges(testRepoRoot, false);
    expect(result.success).toBe(true);
    expect(result.hasDiff).toBe(false);
    expect(result.written).toBe(false);
  });

  it('syncKnowledges detects diff when dest has extra files', () => {
    setManifest('file.md\n');
    setKnowledgeFile('file.md', '# Content\n');

    // Create existing directory with extra file
    const destDir = join(testRepoRoot, '.claude', 'knowledges');
    mkdirSync(destDir, { recursive: true });
    writeFileSync(join(destDir, 'file.md'), '# Content\n', 'utf8');
    writeFileSync(join(destDir, 'extra.md'), '# Extra\n', 'utf8');

    const result = syncKnowledges(testRepoRoot, false);
    expect(result.success).toBe(false);
    expect(result.hasDiff).toBe(true);
    expect(result.written).toBe(false);
  });

  it('syncKnowledges removes extra files when force=true', () => {
    setManifest('file.md\n');
    setKnowledgeFile('file.md', '# Content\n');

    // Create existing directory with extra file
    const destDir = join(testRepoRoot, '.claude', 'knowledges');
    mkdirSync(destDir, { recursive: true });
    writeFileSync(join(destDir, 'file.md'), '# Content\n', 'utf8');
    writeFileSync(join(destDir, 'extra.md'), '# Extra\n', 'utf8');

    const result = syncKnowledges(testRepoRoot, true);
    expect(result.success).toBe(true);
    expect(result.written).toBe(true);
    expect(existsSync(join(destDir, 'file.md'))).toBe(true);
    expect(existsSync(join(destDir, 'extra.md'))).toBe(false);
  });
});

describe('syncCommand with .claude directories', () => {
  const originalCwd = process.cwd();
  const testRepoRoot = join(process.cwd(), 'test-repo-sync-cmd');
  const GLOBAL_CLAUDE_DIR = AI_RESOURCES_CLAUDE_DIR;

  beforeEach(() => {
    backupAiResources();
    mkdirSync(testRepoRoot, { recursive: true });
    process.chdir(testRepoRoot);
    setGlobalClaudeMd('# Test Rules\n');
  });

  afterEach(() => {
    process.chdir(originalCwd);
    restoreAiResources();
    if (existsSync(testRepoRoot)) {
      rmSync(testRepoRoot, { recursive: true });
    }
  });

  it('syncCommand includes commandsResult, subagentsResult, and knowledgesResult', () => {
    const result = syncCommand(true);
    expect(result.commandsResult).toBeDefined();
    expect(result.subagentsResult).toBeDefined();
    expect(result.knowledgesResult).toBeDefined();
    // Overall success should still be true (based on CLAUDE.md)
    expect(result.success).toBe(true);
  });

  it('syncCommand copies .claude directories when they exist', () => {
    // Create source directories
    mkdirSync(join(GLOBAL_CLAUDE_DIR, 'commands'), { recursive: true });
    mkdirSync(join(GLOBAL_CLAUDE_DIR, 'subagents'), { recursive: true });
    writeFileSync(join(GLOBAL_CLAUDE_DIR, 'commands', 'cmd.md'), '# Cmd\n', 'utf8');
    writeFileSync(join(GLOBAL_CLAUDE_DIR, 'subagents', 'agent.md'), '# Agent\n', 'utf8');

    // Create manifest and knowledges
    setManifest('knowledge.md\n');
    setKnowledgeFile('knowledge.md', '# Knowledge\n');

    const result = syncCommand(true);
    expect(result.commandsResult?.success).toBe(true);
    expect(result.subagentsResult?.success).toBe(true);
    expect(result.knowledgesResult?.success).toBe(true);
    expect(existsSync(join(testRepoRoot, '.claude', 'commands', 'cmd.md'))).toBe(true);
    expect(existsSync(join(testRepoRoot, '.claude', 'subagents', 'agent.md'))).toBe(true);
    expect(existsSync(join(testRepoRoot, '.claude', 'knowledges', 'knowledge.md'))).toBe(true);
  });
});

describe('newPlan with .claude directories', () => {
  let createdTopics: string[] = [];

  beforeEach(() => {
    backupAiResources();
    createdTopics = [];
    const plansDir = getPlansDir();
    mkdirSync(plansDir, { recursive: true });
    setGlobalClaudeMd('# Test Rules\n');
  });

  afterEach(() => {
    restoreAiResources();
    for (const topic of createdTopics) {
      removeTopic(topic);
    }
  });

  it('newPlan includes commandsResult, subagentsResult, and knowledgesResult', () => {
    const result = newPlan(`${TEST_TOPIC_PREFIX}claude-dir`, true);
    createdTopics.push(result.topic);

    expect(result.success).toBe(true);
    expect(result.commandsResult).toBeDefined();
    expect(result.subagentsResult).toBeDefined();
    expect(result.knowledgesResult).toBeDefined();
  });
});
