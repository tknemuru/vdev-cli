import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import * as yaml from 'js-yaml';
import { getSystemBasePath } from './claudeMdSync';

export interface ManifestEntry {
  source: string;
  dest: string;
  description?: string;
  exclude?: string[];
}

export interface KnowledgesAllowlistItem {
  source: string;
  target: string;
}

export interface KnowledgesEntry {
  dest: string;
  allowlist: KnowledgesAllowlistItem[];
  description?: string;
}

export interface ClaudeManifest {
  version: string;
  main?: ManifestEntry;
  flow?: ManifestEntry;
  claude_dir?: ManifestEntry;
  knowledges?: KnowledgesEntry;
}

export type ManifestError = 'FILE_NOT_FOUND' | 'PARSE_ERROR';

export interface ManifestReadResult {
  manifest: ClaudeManifest | null;
  error: ManifestError | null;
  errorMessage?: string;
}

export interface KnowledgesAllowlistResult {
  allowlist: KnowledgesAllowlistItem[];
  warning?: string;
  error?: string;
}

export function getManifestPath(): string {
  return join(getSystemBasePath(), 'registry', 'claude.manifest.yaml');
}

export function readClaudeManifest(): ManifestReadResult {
  const manifestPath = getManifestPath();

  // Case 1: File does not exist
  if (!existsSync(manifestPath)) {
    return {
      manifest: null,
      error: 'FILE_NOT_FOUND',
      errorMessage: `Manifest file not found: ${manifestPath}`,
    };
  }

  try {
    const content = readFileSync(manifestPath, 'utf8');
    const manifest = yaml.load(content) as ClaudeManifest;
    return { manifest, error: null };
  } catch (e) {
    // Case 2: YAML parse error
    return {
      manifest: null,
      error: 'PARSE_ERROR',
      errorMessage: `Failed to parse manifest: ${e instanceof Error ? e.message : String(e)}`,
    };
  }
}

export function getKnowledgesAllowlist(): KnowledgesAllowlistResult {
  const result = readClaudeManifest();

  // File not found: Warning + empty allowlist (backward compatibility)
  if (result.error === 'FILE_NOT_FOUND') {
    return {
      allowlist: [],
      warning: result.errorMessage,
    };
  }

  // Parse error: Error (must not silently treat as empty)
  if (result.error === 'PARSE_ERROR') {
    return {
      allowlist: [],
      error: result.errorMessage,
    };
  }

  // Case 3: knowledges.allowlist key does not exist
  if (!result.manifest?.knowledges?.allowlist) {
    return {
      allowlist: [],
      warning: 'knowledges.allowlist not defined in manifest',
    };
  }

  return { allowlist: result.manifest.knowledges.allowlist };
}
