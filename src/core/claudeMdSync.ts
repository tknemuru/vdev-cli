import { existsSync, readFileSync, writeFileSync } from 'fs';
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
