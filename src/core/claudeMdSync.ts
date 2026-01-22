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

export function getGlobalClaudeMdPath(): string {
  return join(homedir(), '.vdev', 'CLAUDE.md');
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
<!-- Source: ~/.vdev/CLAUDE.md -->
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
      message: 'Global CLAUDE.md not found (~/.vdev/CLAUDE.md)',
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
  return join(homedir(), '.vdev', 'vdev-flow.md');
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
<!-- Source: ~/.vdev/vdev-flow.md -->
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
      message: 'Global vdev-flow.md not found (~/.vdev/vdev-flow.md)',
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
  return join(homedir(), '.vdev', '.claude');
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
      message: '~/.vdev/.claude/commands not found',
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
      message: '~/.vdev/.claude/subagents not found',
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
