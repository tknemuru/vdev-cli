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
import { join, dirname } from 'path';
import { nowJST } from './time';

const LAST_SYNCED_PATTERN = /^<!-- Last synced: .* -->$/m;

/**
 * Get the system base path (monorepo system/ directory).
 * The vdev CLI is located at <repo-root>/cli/, so system/ is at ../system/
 * relative to the CLI package root.
 *
 * This function resolves the path based on the CLI's location.
 */
export function getSystemBasePath(): string {
  // __dirname is cli/dist/core/ after compilation
  // Go up to repo root and then to system/
  const cliRoot = join(__dirname, '..', '..'); // cli/
  const repoRoot = join(cliRoot, '..'); // repo root
  return join(repoRoot, 'system');
}

/**
 * Get path to CLAUDE.md source in system/adapters/claude/
 */
export function getGlobalClaudeMdPath(): string {
  return join(getSystemBasePath(), 'adapters', 'claude', 'CLAUDE.md');
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
<!-- Source: system/adapters/claude/CLAUDE.md -->
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
        'CLAUDE.md not found in system/adapters/claude/',
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
    message: 'CLAUDE.md differs from source',
  };
}

// vdev-flow.md sync functions

/**
 * Get path to vdev-flow.md source in system/docs/flow/
 */
export function getGlobalVdevFlowPath(): string {
  return join(getSystemBasePath(), 'docs', 'flow', 'vdev-flow.md');
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
<!-- Source: system/docs/flow/vdev-flow.md -->
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
        'vdev-flow.md not found in system/docs/flow/',
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
    message: 'vdev-flow.md differs from source',
  };
}

// .claude directory sync functions

/**
 * Get path to Claude adapters directory in system/adapters/claude/
 */
export function getGlobalClaudeDir(): string {
  return join(getSystemBasePath(), 'adapters', 'claude');
}

export interface DirSyncResult {
  success: boolean;
  written: boolean;
  hasDiff: boolean;
  sourceMissing: boolean;
  message: string;
}

export function copyDirRecursive(
  src: string,
  dest: string,
  excludePatterns: string[] = []
): void {
  if (!existsSync(dest)) {
    mkdirSync(dest, { recursive: true });
  }

  const entries = readdirSync(src);
  for (const entry of entries) {
    if (excludePatterns.includes(entry)) {
      continue;
    }
    const srcPath = join(src, entry);
    const destPath = join(dest, entry);
    const stat = statSync(srcPath);

    if (stat.isDirectory()) {
      copyDirRecursive(srcPath, destPath, excludePatterns);
    } else {
      copyFileSync(srcPath, destPath);
    }
  }
}

// Compare two directories recursively to detect differences
export function directoriesDiffer(
  srcDir: string,
  destDir: string,
  excludePatterns: string[] = []
): boolean {
  // If dest doesn't exist, there's a difference
  if (!existsSync(destDir)) {
    return true;
  }

  const srcEntries = readdirSync(srcDir)
    .filter((e) => !excludePatterns.includes(e))
    .sort();
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
      if (directoriesDiffer(srcPath, destPath, excludePatterns)) {
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

// Get exclude patterns from manifest (defaults to ['CLAUDE.md'] if manifest missing/invalid)
function getExcludePatterns(): string[] {
  const result = getClaudeDirExclude();
  return result.exclude;
}

export function syncClaudeDir(repoRoot: string, force: boolean): DirSyncResult {
  const srcDir = getGlobalClaudeDir();

  if (!existsSync(srcDir)) {
    return {
      success: false,
      written: false,
      hasDiff: false,
      sourceMissing: true,
      message:
        'system/adapters/claude not found',
    };
  }

  const excludePatterns = getExcludePatterns();
  const destDir = join(repoRoot, '.claude');
  const destExists = existsSync(destDir);
  const hasDiff = directoriesDiffer(srcDir, destDir, excludePatterns);

  // No difference - nothing to do
  if (!hasDiff) {
    return {
      success: true,
      written: false,
      hasDiff: false,
      sourceMissing: false,
      message: '.claude is up to date',
    };
  }

  // Has difference - check if we should write
  if (force || !destExists) {
    // Remove existing directory before copy to ensure clean state
    if (destExists) {
      rmSync(destDir, { recursive: true });
    }
    copyDirRecursive(srcDir, destDir, excludePatterns);

    return {
      success: true,
      written: true,
      hasDiff: true,
      sourceMissing: false,
      message: !destExists ? '.claude created' : '.claude updated',
    };
  }

  // Has difference but no force - report diff without writing
  return {
    success: false,
    written: false,
    hasDiff: true,
    sourceMissing: false,
    message: '.claude differs from source',
  };
}

// Legacy functions kept for backward compatibility (deprecated)
// Use syncClaudeDir() instead

export function syncClaudeCommands(repoRoot: string, force: boolean): DirSyncResult {
  const srcDir = join(getGlobalClaudeDir(), 'commands');

  if (!existsSync(srcDir)) {
    return {
      success: false,
      written: false,
      hasDiff: false,
      sourceMissing: true,
      message:
        'system/adapters/claude/commands not found',
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
        'system/adapters/claude/subagents not found',
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

import { getKnowledgesAllowlist, getClaudeDirExclude, KnowledgesAllowlistItem } from './manifest';

export interface KnowledgesSyncResult {
  success: boolean;
  written: boolean;
  hasDiff: boolean;
  manifestMissing: boolean;
  manifestParseError: boolean;
  missingFiles: string[];
  message: string;
}

export function syncKnowledges(repoRoot: string, force: boolean): KnowledgesSyncResult {
  const systemBase = getSystemBasePath();

  // Get allowlist from manifest
  const allowlistResult = getKnowledgesAllowlist();

  // Parse error: fail the sync (must not silently treat as empty)
  if (allowlistResult.error) {
    return {
      success: false,
      written: false,
      hasDiff: false,
      manifestMissing: false,
      manifestParseError: true,
      missingFiles: [],
      message: allowlistResult.error,
    };
  }

  const allowlist = allowlistResult.allowlist;

  // Empty allowlist (file not found or key missing) with warning
  // This is acceptable for backward compatibility
  if (allowlist.length === 0) {
    // If there's a warning, log it but continue with empty sync
    const destDir = join(repoRoot, '.claude', 'knowledges');
    const destExists = existsSync(destDir);

    // If dest exists and has files, we need to clean it up
    if (destExists && force) {
      const destFiles = readdirSync(destDir);
      if (destFiles.length > 0) {
        rmSync(destDir, { recursive: true });
        mkdirSync(destDir, { recursive: true });
        return {
          success: true,
          written: true,
          hasDiff: true,
          manifestMissing: allowlistResult.warning?.includes('not found') ?? false,
          manifestParseError: false,
          missingFiles: [],
          message: allowlistResult.warning
            ? `.claude/knowledges cleared (${allowlistResult.warning})`
            : '.claude/knowledges cleared (empty allowlist)',
        };
      }
    }

    return {
      success: true,
      written: false,
      hasDiff: false,
      manifestMissing: allowlistResult.warning?.includes('not found') ?? false,
      manifestParseError: false,
      missingFiles: [],
      message: allowlistResult.warning
        ? `.claude/knowledges skipped (${allowlistResult.warning})`
        : '.claude/knowledges skipped (empty allowlist)',
    };
  }

  // Check all files in allowlist exist
  const missingFiles: string[] = [];
  for (const item of allowlist) {
    const srcPath = join(systemBase, item.source);
    if (!existsSync(srcPath)) {
      missingFiles.push(item.source);
    }
  }

  if (missingFiles.length > 0) {
    return {
      success: false,
      written: false,
      hasDiff: false,
      manifestMissing: false,
      manifestParseError: false,
      missingFiles,
      message: `Missing files in system/: ${missingFiles.join(', ')}`,
    };
  }

  // Check for differences
  const destDir = join(repoRoot, '.claude', 'knowledges');
  const destExists = existsSync(destDir);

  let hasDiff = !destExists;
  if (!hasDiff) {
    // Check if allowlist files differ from dest
    for (const item of allowlist) {
      const srcPath = join(systemBase, item.source);
      const destPath = join(destDir, item.target);
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
    // Also check if dest has extra files not in allowlist
    if (!hasDiff) {
      const allowedTargets = allowlist.map((i: KnowledgesAllowlistItem) => i.target);
      const destFiles = readdirSync(destDir);
      for (const file of destFiles) {
        if (!allowedTargets.includes(file)) {
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
      manifestParseError: false,
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

    // Copy only files in allowlist
    for (const item of allowlist) {
      const srcPath = join(systemBase, item.source);
      const destPath = join(destDir, item.target);
      copyFileSync(srcPath, destPath);
    }

    return {
      success: true,
      written: true,
      hasDiff: true,
      manifestMissing: false,
      manifestParseError: false,
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
    manifestParseError: false,
    missingFiles: [],
    message: '.claude/knowledges differs from source',
  };
}

// Deprecated: these functions are no longer used
// Kept for backward compatibility but will return success with no-op

export function getKnowledgeManifestPath(): string {
  // No longer used - manifest is now in system/registry/claude.manifest.yaml
  return join(getSystemBasePath(), 'registry', 'claude.manifest.yaml');
}

export function getKnowledgesSourceDir(): string {
  // No longer used - knowledges are now in system/docs/
  return join(getSystemBasePath(), 'docs');
}

export function readKnowledgeManifest(): string[] | null {
  // No longer used - return null to trigger migration path
  return null;
}

// Legacy export for backward compatibility
export function getAiResourcesBasePath(): string {
  // Deprecated: now returns system base path
  return getSystemBasePath();
}
