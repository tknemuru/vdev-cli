import {
  existsSync,
  readFileSync,
  writeFileSync,
  mkdirSync,
  readdirSync,
  statSync,
  rmSync,
  copyFileSync,
} from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import { nowJST } from './time';

const LAST_SYNCED_PATTERN = /^<!-- Last synced: .* -->$/m;

// ai-resources base path
const AI_RESOURCES_BASE_PATH = join(
  homedir(),
  'projects',
  'ai-resources',
  'vibe-coding-partner'
);

export function getAiResourcesBasePath(): string {
  return AI_RESOURCES_BASE_PATH;
}

export function getGlobalClaudeMdPath(): string {
  return join(AI_RESOURCES_BASE_PATH, 'claude', 'CLAUDE.md');
}

export function readGlobalClaudeMd(): string | null {
  const path = getGlobalClaudeMdPath();
  if (!existsSync(path)) {
    return null;
  }
  return readFileSync(path, 'utf8');
}

export function renderRepoClaudeMd(globalBody: string, nowIso: string): string {
  const header = `<!-- AUTO-GENERATED FILE - DO NOT EDIT -->
<!-- Source: ~/projects/ai-resources/vibe-coding-partner/claude/CLAUDE.md -->
<!-- Last synced: ${nowIso} -->

`;
  return header + globalBody;
}

function normalizeForComparison(content: string): string {
  return content.replace(LAST_SYNCED_PATTERN, '<!-- Last synced: NORMALIZED -->');
}

export function differs(current: string | null, generated: string): boolean {
  if (current === null) {
    return true;
  }
  const normalizedCurrent = normalizeForComparison(current);
  const normalizedGenerated = normalizeForComparison(generated);
  return normalizedCurrent !== normalizedGenerated;
}

export function readRepoClaudeMd(repoRoot: string): string | null {
  const path = join(repoRoot, 'CLAUDE.md');
  if (!existsSync(path)) {
    return null;
  }
  return readFileSync(path, 'utf8');
}

export function writeRepoClaudeMd(repoRoot: string, content: string): void {
  const path = join(repoRoot, 'CLAUDE.md');
  writeFileSync(path, content, 'utf8');
}

export interface SyncResult {
  success: boolean;
  written: boolean;
  hasDiff: boolean;
  globalMissing: boolean;
  message: string;
}

export function syncClaudeMd(repoRoot: string, force: boolean): SyncResult {
  const globalBody = readGlobalClaudeMd();

  if (globalBody === null) {
    return {
      success: false,
      written: false,
      hasDiff: false,
      globalMissing: true,
      message:
        'Global CLAUDE.md not found (~/projects/ai-resources/vibe-coding-partner/claude/CLAUDE.md)',
    };
  }

  const nowIso = nowJST();
  const generated = renderRepoClaudeMd(globalBody, nowIso);
  const current = readRepoClaudeMd(repoRoot);
  const hasDiff = differs(current, generated);

  if (!hasDiff) {
    return {
      success: true,
      written: false,
      hasDiff: false,
      globalMissing: false,
      message: 'CLAUDE.md is up to date',
    };
  }

  if (force || current === null) {
    writeRepoClaudeMd(repoRoot, generated);
    return {
      success: true,
      written: true,
      hasDiff: true,
      globalMissing: false,
      message: current === null ? 'CLAUDE.md created' : 'CLAUDE.md updated',
    };
  }

  return {
    success: false,
    written: false,
    hasDiff: true,
    globalMissing: false,
    message: 'CLAUDE.md differs from global rules',
  };
}

// vdev-flow.md sync functions

export function getGlobalVdevFlowPath(): string {
  return join(AI_RESOURCES_BASE_PATH, 'knowledges', 'vdev-flow.md');
}

export function readGlobalVdevFlow(): string | null {
  const path = getGlobalVdevFlowPath();
  if (!existsSync(path)) {
    return null;
  }
  return readFileSync(path, 'utf8');
}

export function renderRepoVdevFlow(globalBody: string, nowIso: string): string {
  const header = `<!-- AUTO-GENERATED FILE - DO NOT EDIT -->
<!-- Source: ~/projects/ai-resources/vibe-coding-partner/knowledges/vdev-flow.md -->
<!-- Last synced: ${nowIso} -->

`;
  return header + globalBody;
}

export function readRepoVdevFlow(repoRoot: string): string | null {
  const path = join(repoRoot, 'vdev-flow.md');
  if (!existsSync(path)) {
    return null;
  }
  return readFileSync(path, 'utf8');
}

export function writeRepoVdevFlow(repoRoot: string, content: string): void {
  const path = join(repoRoot, 'vdev-flow.md');
  writeFileSync(path, content, 'utf8');
}

export function syncVdevFlow(repoRoot: string, force: boolean): SyncResult {
  const globalBody = readGlobalVdevFlow();

  if (globalBody === null) {
    return {
      success: false,
      written: false,
      hasDiff: false,
      globalMissing: true,
      message:
        'Global vdev-flow.md not found (~/projects/ai-resources/vibe-coding-partner/knowledges/vdev-flow.md)',
    };
  }

  const nowIso = nowJST();
  const generated = renderRepoVdevFlow(globalBody, nowIso);
  const current = readRepoVdevFlow(repoRoot);
  const hasDiff = differs(current, generated);

  if (!hasDiff) {
    return {
      success: true,
      written: false,
      hasDiff: false,
      globalMissing: false,
      message: 'vdev-flow.md is up to date',
    };
  }

  if (force || current === null) {
    writeRepoVdevFlow(repoRoot, generated);
    return {
      success: true,
      written: true,
      hasDiff: true,
      globalMissing: false,
      message: current === null ? 'vdev-flow.md created' : 'vdev-flow.md updated',
    };
  }

  return {
    success: false,
    written: false,
    hasDiff: true,
    globalMissing: false,
    message: 'vdev-flow.md differs from global rules',
  };
}

// .claude directory sync functions

export function getGlobalClaudeDir(): string {
  return join(AI_RESOURCES_BASE_PATH, 'claude');
}

export interface DirSyncResult {
  success: boolean;
  written: boolean;
  hasDiff: boolean;
  sourceMissing: boolean;
  message: string;
}

export function copyDirRecursive(src: string, dest: string): void {
  if (!existsSync(dest)) {
    mkdirSync(dest, { recursive: true });
  }

  const entries = readdirSync(src);
  for (const entry of entries) {
    const srcPath = join(src, entry);
    const destPath = join(dest, entry);
    const stat = statSync(srcPath);

    if (stat.isDirectory()) {
      copyDirRecursive(srcPath, destPath);
    } else {
      copyFileSync(srcPath, destPath);
    }
  }
}

// Compare two directories recursively to detect differences
export function directoriesDiffer(srcDir: string, destDir: string): boolean {
  // If dest doesn't exist, there's a difference
  if (!existsSync(destDir)) {
    return true;
  }

  const srcEntries = readdirSync(srcDir).sort();
  const destEntries = readdirSync(destDir).sort();

  // Check if file lists differ
  if (srcEntries.length !== destEntries.length) {
    return true;
  }
  for (let i = 0; i < srcEntries.length; i++) {
    if (srcEntries[i] !== destEntries[i]) {
      return true;
    }
  }

  // Check each entry
  for (const entry of srcEntries) {
    const srcPath = join(srcDir, entry);
    const destPath = join(destDir, entry);
    const srcStat = statSync(srcPath);

    if (!existsSync(destPath)) {
      return true;
    }

    const destStat = statSync(destPath);

    if (srcStat.isDirectory() !== destStat.isDirectory()) {
      return true;
    }

    if (srcStat.isDirectory()) {
      if (directoriesDiffer(srcPath, destPath)) {
        return true;
      }
    } else {
      // Compare file contents
      const srcContent = readFileSync(srcPath, 'utf8');
      const destContent = readFileSync(destPath, 'utf8');
      if (srcContent !== destContent) {
        return true;
      }
    }
  }

  return false;
}

export function syncClaudeCommands(repoRoot: string, force: boolean): DirSyncResult {
  const srcDir = join(getGlobalClaudeDir(), 'commands');

  if (!existsSync(srcDir)) {
    return {
      success: false,
      written: false,
      hasDiff: false,
      sourceMissing: true,
      message:
        '~/projects/ai-resources/vibe-coding-partner/claude/commands not found',
    };
  }

  const destDir = join(repoRoot, '.claude', 'commands');
  const destExists = existsSync(destDir);
  const hasDiff = directoriesDiffer(srcDir, destDir);

  // No difference - nothing to do
  if (!hasDiff) {
    return {
      success: true,
      written: false,
      hasDiff: false,
      sourceMissing: false,
      message: '.claude/commands is up to date',
    };
  }

  // Has difference - check if we should write
  if (force || !destExists) {
    // Remove existing directory before copy to ensure clean state
    if (destExists) {
      rmSync(destDir, { recursive: true });
    }
    copyDirRecursive(srcDir, destDir);

    return {
      success: true,
      written: true,
      hasDiff: true,
      sourceMissing: false,
      message: !destExists ? '.claude/commands created' : '.claude/commands updated',
    };
  }

  // Has difference but no force - report diff without writing
  return {
    success: false,
    written: false,
    hasDiff: true,
    sourceMissing: false,
    message: '.claude/commands differs from source',
  };
}

export function syncClaudeSubagents(repoRoot: string, force: boolean): DirSyncResult {
  const srcDir = join(getGlobalClaudeDir(), 'subagents');

  if (!existsSync(srcDir)) {
    return {
      success: false,
      written: false,
      hasDiff: false,
      sourceMissing: true,
      message:
        '~/projects/ai-resources/vibe-coding-partner/claude/subagents not found',
    };
  }

  const destDir = join(repoRoot, '.claude', 'subagents');
  const destExists = existsSync(destDir);
  const hasDiff = directoriesDiffer(srcDir, destDir);

  // No difference - nothing to do
  if (!hasDiff) {
    return {
      success: true,
      written: false,
      hasDiff: false,
      sourceMissing: false,
      message: '.claude/subagents is up to date',
    };
  }

  // Has difference - check if we should write
  if (force || !destExists) {
    // Remove existing directory before copy to ensure clean state
    if (destExists) {
      rmSync(destDir, { recursive: true });
    }
    copyDirRecursive(srcDir, destDir);

    return {
      success: true,
      written: true,
      hasDiff: true,
      sourceMissing: false,
      message: !destExists ? '.claude/subagents created' : '.claude/subagents updated',
    };
  }

  // Has difference but no force - report diff without writing
  return {
    success: false,
    written: false,
    hasDiff: true,
    sourceMissing: false,
    message: '.claude/subagents differs from source',
  };
}

// knowledges sync functions

export function getKnowledgeManifestPath(): string {
  return join(AI_RESOURCES_BASE_PATH, 'claude', 'knowledge-manifest.txt');
}

export function getKnowledgesSourceDir(): string {
  return join(AI_RESOURCES_BASE_PATH, 'knowledges');
}

export interface KnowledgesSyncResult {
  success: boolean;
  written: boolean;
  hasDiff: boolean;
  manifestMissing: boolean;
  missingFiles: string[];
  message: string;
}

export function readKnowledgeManifest(): string[] | null {
  const manifestPath = getKnowledgeManifestPath();
  if (!existsSync(manifestPath)) {
    return null;
  }
  const content = readFileSync(manifestPath, 'utf8');
  const lines = content.split('\n');
  const files: string[] = [];
  for (const line of lines) {
    const trimmed = line.trim();
    // Skip empty lines and comment lines
    if (trimmed === '' || trimmed.startsWith('#')) {
      continue;
    }
    files.push(trimmed);
  }
  return files;
}

export function syncKnowledges(repoRoot: string, force: boolean): KnowledgesSyncResult {
  const manifest = readKnowledgeManifest();

  if (manifest === null) {
    return {
      success: false,
      written: false,
      hasDiff: false,
      manifestMissing: true,
      missingFiles: [],
      message:
        'knowledge-manifest.txt not found (~/projects/ai-resources/vibe-coding-partner/claude/knowledge-manifest.txt)',
    };
  }

  // Check all files in manifest exist in knowledges directory
  const knowledgesDir = getKnowledgesSourceDir();
  const missingFiles: string[] = [];
  for (const file of manifest) {
    const srcPath = join(knowledgesDir, file);
    if (!existsSync(srcPath)) {
      missingFiles.push(file);
    }
  }

  if (missingFiles.length > 0) {
    return {
      success: false,
      written: false,
      hasDiff: false,
      manifestMissing: false,
      missingFiles,
      message: `Missing files in knowledges/: ${missingFiles.join(', ')}`,
    };
  }

  // Check for differences
  const destDir = join(repoRoot, '.claude', 'knowledges');
  const destExists = existsSync(destDir);

  let hasDiff = !destExists;
  if (!hasDiff) {
    // Check if manifest files differ from dest
    for (const file of manifest) {
      const srcPath = join(knowledgesDir, file);
      const destPath = join(destDir, file);
      if (!existsSync(destPath)) {
        hasDiff = true;
        break;
      }
      const srcContent = readFileSync(srcPath, 'utf8');
      const destContent = readFileSync(destPath, 'utf8');
      if (srcContent !== destContent) {
        hasDiff = true;
        break;
      }
    }
    // Also check if dest has extra files not in manifest
    if (!hasDiff) {
      const destFiles = readdirSync(destDir);
      for (const file of destFiles) {
        if (!manifest.includes(file)) {
          hasDiff = true;
          break;
        }
      }
    }
  }

  if (!hasDiff) {
    return {
      success: true,
      written: false,
      hasDiff: false,
      manifestMissing: false,
      missingFiles: [],
      message: '.claude/knowledges is up to date',
    };
  }

  if (force || !destExists) {
    // Remove existing directory before copy to ensure clean state
    if (destExists) {
      rmSync(destDir, { recursive: true });
    }
    mkdirSync(destDir, { recursive: true });

    // Copy only files in manifest
    for (const file of manifest) {
      const srcPath = join(knowledgesDir, file);
      const destPath = join(destDir, file);
      copyFileSync(srcPath, destPath);
    }

    return {
      success: true,
      written: true,
      hasDiff: true,
      manifestMissing: false,
      missingFiles: [],
      message: !destExists
        ? '.claude/knowledges created'
        : '.claude/knowledges updated',
    };
  }

  return {
    success: false,
    written: false,
    hasDiff: true,
    manifestMissing: false,
    missingFiles: [],
    message: '.claude/knowledges differs from source',
  };
}
