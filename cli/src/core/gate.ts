import { existsSync, readFileSync } from 'fs';
import { ExitCode, ExitCodeValue } from './errors';
import { readMeta, writeMeta, Meta, MetaStatus } from './meta';
import {
  getInstructionPath,
  getPlanPath,
  getDesignReviewPath,
  getImplPath,
  getImplReviewPath,
  getDesignReviewDir,
  getImplReviewDir,
} from './paths';
import { sha256 } from './hashes';
import { normalizeLF } from './normalize';
import { nowJST } from './time';
import { findLatestAttempt } from './attempt';

export interface GateResult {
  exitCode: ExitCodeValue;
  status: string;
  message: string;
}

type DesignReviewStatus = 'DESIGN_APPROVED' | 'REJECTED' | 'NEEDS_CHANGES';
type ImplReviewStatus = 'DONE' | 'NEEDS_CHANGES';

/**
 * Extract Status from design-review content
 * Returns null if Status line is missing or invalid
 */
function extractDesignReviewStatus(content: string): DesignReviewStatus | null {
  const lines = content.split('\n');
  for (const line of lines) {
    const match = line.match(/^Status:\s*(DESIGN_APPROVED|REJECTED|NEEDS_CHANGES)\s*$/i);
    if (match) {
      const status = match[1].toUpperCase();
      if (status === 'DESIGN_APPROVED' || status === 'REJECTED' || status === 'NEEDS_CHANGES') {
        return status as DesignReviewStatus;
      }
    }
  }
  return null;
}

/**
 * Extract Status from impl-review content
 * Returns null if Status line is missing or invalid
 */
function extractImplReviewStatus(content: string): ImplReviewStatus | null {
  const lines = content.split('\n');
  for (const line of lines) {
    const match = line.match(/^Status:\s*(DONE|NEEDS_CHANGES)\s*$/i);
    if (match) {
      const status = match[1].toUpperCase();
      if (status === 'DONE' || status === 'NEEDS_CHANGES') {
        return status as ImplReviewStatus;
      }
    }
  }
  return null;
}

/**
 * Compute hash for a file if it exists
 */
function computeFileHash(filePath: string): string | null {
  if (!existsSync(filePath)) return null;
  const content = normalizeLF(readFileSync(filePath, 'utf8'));
  return sha256(content);
}

/**
 * Find design review file path (attempt model first, then legacy fallback)
 * Returns null if no review file found
 */
function findDesignReviewFile(topic: string): string | null {
  // Try attempt model first
  const attemptDir = getDesignReviewDir(topic);
  const attemptResult = findLatestAttempt(attemptDir);
  if (attemptResult.found && attemptResult.path) {
    return attemptResult.path;
  }

  // Fallback to legacy single file
  const legacyPath = getDesignReviewPath(topic);
  if (existsSync(legacyPath)) {
    return legacyPath;
  }

  return null;
}

/**
 * Find impl review file path (attempt model first, then legacy fallback)
 * Returns null if no review file found
 */
function findImplReviewFile(topic: string): string | null {
  // Try attempt model first
  const attemptDir = getImplReviewDir(topic);
  const attemptResult = findLatestAttempt(attemptDir);
  if (attemptResult.found && attemptResult.path) {
    return attemptResult.path;
  }

  // Fallback to legacy single file
  const legacyPath = getImplReviewPath(topic);
  if (existsSync(legacyPath)) {
    return legacyPath;
  }

  return null;
}

/**
 * Reconcile meta.json with derived state
 * Only called when state derivation succeeds (not COMMAND_ERROR or BROKEN_STATE)
 */
function reconcileMeta(
  meta: Meta,
  topic: string,
  derivedStatus: MetaStatus,
  planPath: string,
  designReviewPath: string,
  implPath: string,
  implReviewPath: string
): void {
  meta.status = derivedStatus;
  meta.timestamps.updatedAt = nowJST();

  // Recompute hashes for existing files
  meta.hashes.planSha256 = computeFileHash(planPath);
  meta.hashes.designReviewSha256 = computeFileHash(designReviewPath);
  meta.hashes.implSha256 = computeFileHash(implPath);
  meta.hashes.implReviewSha256 = computeFileHash(implReviewPath);

  writeMeta(topic, meta);
}

export function checkGate(topic: string): GateResult {
  // Step A: meta.json parse check
  const metaResult = readMeta(topic);
  if (!metaResult.success) {
    // BROKEN_STATE (20) - meta.json is unparseable or structurally invalid
    return {
      exitCode: ExitCode.BROKEN_STATE,
      status: 'BROKEN_STATE',
      message: `meta.json error: ${metaResult.error}`,
    };
  }

  const meta = metaResult.meta;
  const instructionPath = getInstructionPath(topic);
  const planPath = getPlanPath(topic);
  const legacyDesignReviewPath = getDesignReviewPath(topic);
  const implPath = getImplPath(topic);
  const legacyImplReviewPath = getImplReviewPath(topic);

  // Step B: instruction.md missing -> NEEDS_INSTRUCTION (10)
  if (!existsSync(instructionPath)) {
    reconcileMeta(meta, topic, 'NEEDS_INSTRUCTION', planPath, legacyDesignReviewPath, implPath, legacyImplReviewPath);
    return {
      exitCode: ExitCode.NEEDS_INSTRUCTION,
      status: 'NEEDS_INSTRUCTION',
      message: 'instruction.md not found',
    };
  }

  // Step C: plan.md missing -> NEEDS_PLAN (11)
  if (!existsSync(planPath)) {
    reconcileMeta(meta, topic, 'NEEDS_PLAN', planPath, legacyDesignReviewPath, implPath, legacyImplReviewPath);
    return {
      exitCode: ExitCode.NEEDS_PLAN,
      status: 'NEEDS_PLAN',
      message: 'plan.md not found',
    };
  }

  // Step D: Find design review file (attempt model first, then legacy)
  const designReviewFilePath = findDesignReviewFile(topic);

  if (designReviewFilePath === null) {
    reconcileMeta(
      meta,
      topic,
      'NEEDS_DESIGN_REVIEW',
      planPath,
      legacyDesignReviewPath,
      implPath,
      legacyImplReviewPath
    );
    return {
      exitCode: ExitCode.NEEDS_DESIGN_REVIEW,
      status: 'NEEDS_DESIGN_REVIEW',
      message: 'design-review not found',
    };
  }

  // Step E: Extract design-review Status
  const designReviewContent = normalizeLF(readFileSync(designReviewFilePath, 'utf8'));
  const designReviewStatus = extractDesignReviewStatus(designReviewContent);

  if (designReviewStatus === null) {
    // COMMAND_ERROR (1) - Status line is non-compliant, do NOT update meta.json
    return {
      exitCode: ExitCode.COMMAND_ERROR,
      status: 'COMMAND_ERROR',
      message: 'design-review Status line is invalid or missing',
    };
  }

  // Status: REJECTED -> REJECTED (17)
  if (designReviewStatus === 'REJECTED') {
    reconcileMeta(meta, topic, 'REJECTED', planPath, legacyDesignReviewPath, implPath, legacyImplReviewPath);
    return {
      exitCode: ExitCode.REJECTED,
      status: 'REJECTED',
      message: 'rejected',
    };
  }

  // Status: NEEDS_CHANGES -> NEEDS_DESIGN_REVIEW (12) [Changed from NEEDS_PLAN for Attempt model]
  if (designReviewStatus === 'NEEDS_CHANGES') {
    reconcileMeta(
      meta,
      topic,
      'NEEDS_DESIGN_REVIEW',
      planPath,
      legacyDesignReviewPath,
      implPath,
      legacyImplReviewPath
    );
    return {
      exitCode: ExitCode.NEEDS_DESIGN_REVIEW,
      status: 'NEEDS_DESIGN_REVIEW',
      message: 'design review requires changes',
    };
  }

  // Status: DESIGN_APPROVED -> proceed to implementation phase
  // Step F: Implementation phase logic

  // F1: Find impl review file (attempt model first, then legacy)
  const implReviewFilePath = findImplReviewFile(topic);

  if (implReviewFilePath !== null) {
    const implReviewContent = normalizeLF(readFileSync(implReviewFilePath, 'utf8'));
    const implReviewStatus = extractImplReviewStatus(implReviewContent);

    if (implReviewStatus === null) {
      // COMMAND_ERROR (1) - Status line is non-compliant, do NOT update meta.json
      return {
        exitCode: ExitCode.COMMAND_ERROR,
        status: 'COMMAND_ERROR',
        message: 'impl-review Status line is invalid or missing',
      };
    }

    // Status: DONE -> DONE (0)
    if (implReviewStatus === 'DONE') {
      reconcileMeta(meta, topic, 'DONE', planPath, legacyDesignReviewPath, implPath, legacyImplReviewPath);
      return {
        exitCode: ExitCode.DONE,
        status: 'DONE',
        message: 'done',
      };
    }

    // Status: NEEDS_CHANGES -> IMPLEMENTING (14)
    if (implReviewStatus === 'NEEDS_CHANGES') {
      reconcileMeta(meta, topic, 'IMPLEMENTING', planPath, legacyDesignReviewPath, implPath, legacyImplReviewPath);
      return {
        exitCode: ExitCode.IMPLEMENTING,
        status: 'IMPLEMENTING',
        message: 'impl review requires changes',
      };
    }
  }

  // F2: impl-review does not exist, but impl.md exists -> NEEDS_IMPL_REVIEW (16)
  if (existsSync(implPath)) {
    reconcileMeta(meta, topic, 'NEEDS_IMPL_REVIEW', planPath, legacyDesignReviewPath, implPath, legacyImplReviewPath);
    return {
      exitCode: ExitCode.NEEDS_IMPL_REVIEW,
      status: 'NEEDS_IMPL_REVIEW',
      message: 'impl-review not found',
    };
  }

  // F3: impl.md does not exist
  // Use meta.status as auxiliary information for backward compatibility
  const implementingStatuses: MetaStatus[] = ['IMPLEMENTING', 'NEEDS_IMPL_REPORT', 'NEEDS_IMPL_REVIEW', 'DONE'];

  if (implementingStatuses.includes(meta.status)) {
    // Already in implementation phase -> NEEDS_IMPL_REPORT (15) or IMPLEMENTING (14)
    // Keep NEEDS_IMPL_REPORT if already in that state, otherwise use IMPLEMENTING
    if (meta.status === 'NEEDS_IMPL_REPORT') {
      reconcileMeta(
        meta,
        topic,
        'NEEDS_IMPL_REPORT',
        planPath,
        legacyDesignReviewPath,
        implPath,
        legacyImplReviewPath
      );
      return {
        exitCode: ExitCode.NEEDS_IMPL_REPORT,
        status: 'NEEDS_IMPL_REPORT',
        message: 'impl.md not found',
      };
    }
    // For other implementing states without impl.md, treat as IMPLEMENTING
    reconcileMeta(meta, topic, 'IMPLEMENTING', planPath, legacyDesignReviewPath, implPath, legacyImplReviewPath);
    return {
      exitCode: ExitCode.IMPLEMENTING,
      status: 'IMPLEMENTING',
      message: 'implementing (impl.md not yet created)',
    };
  }

  // Not in implementation phase -> DESIGN_APPROVED (13)
  reconcileMeta(meta, topic, 'DESIGN_APPROVED', planPath, legacyDesignReviewPath, implPath, legacyImplReviewPath);
  return {
    exitCode: ExitCode.DESIGN_APPROVED,
    status: 'DESIGN_APPROVED',
    message: 'ready to implement',
  };
}
