import { existsSync, readFileSync } from 'fs';
import { ExitCode, ExitCodeValue } from './errors';
import { readMeta, writeMeta, Meta, MetaStatus } from './meta';
import { getInstructionPath, getPlanPath, getDesignReviewPath, getImplPath, getImplReviewPath } from './paths';
import { sha256 } from './hashes';
import { normalizeLF } from './normalize';
import { nowJST } from './time';

export interface GateResult {
  exitCode: ExitCodeValue;
  status: string;
  message: string;
}

type DesignReviewStatus = 'DESIGN_APPROVED' | 'REJECTED' | 'NEEDS_CHANGES';
type ImplReviewStatus = 'DONE' | 'NEEDS_CHANGES';

/**
 * Extract Status from design-review.md
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
 * Extract Status from impl-review.md
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
  const designReviewPath = getDesignReviewPath(topic);
  const implPath = getImplPath(topic);
  const implReviewPath = getImplReviewPath(topic);

  // Step B: instruction.md missing -> NEEDS_INSTRUCTION (10)
  if (!existsSync(instructionPath)) {
    reconcileMeta(meta, topic, 'NEEDS_INSTRUCTION', planPath, designReviewPath, implPath, implReviewPath);
    return {
      exitCode: ExitCode.NEEDS_INSTRUCTION,
      status: 'NEEDS_INSTRUCTION',
      message: 'instruction.md not found',
    };
  }

  // Step C: plan.md missing -> NEEDS_PLAN (11)
  if (!existsSync(planPath)) {
    reconcileMeta(meta, topic, 'NEEDS_PLAN', planPath, designReviewPath, implPath, implReviewPath);
    return {
      exitCode: ExitCode.NEEDS_PLAN,
      status: 'NEEDS_PLAN',
      message: 'plan.md not found',
    };
  }

  // Step D: design-review.md missing -> NEEDS_DESIGN_REVIEW (12)
  if (!existsSync(designReviewPath)) {
    reconcileMeta(meta, topic, 'NEEDS_DESIGN_REVIEW', planPath, designReviewPath, implPath, implReviewPath);
    return {
      exitCode: ExitCode.NEEDS_DESIGN_REVIEW,
      status: 'NEEDS_DESIGN_REVIEW',
      message: 'design-review.md not found',
    };
  }

  // Step E: Extract design-review.md Status
  const designReviewContent = normalizeLF(readFileSync(designReviewPath, 'utf8'));
  const designReviewStatus = extractDesignReviewStatus(designReviewContent);

  if (designReviewStatus === null) {
    // COMMAND_ERROR (1) - Status line is non-compliant, do NOT update meta.json
    return {
      exitCode: ExitCode.COMMAND_ERROR,
      status: 'COMMAND_ERROR',
      message: 'design-review.md Status line is invalid or missing',
    };
  }

  // Status: REJECTED -> REJECTED (17)
  if (designReviewStatus === 'REJECTED') {
    reconcileMeta(meta, topic, 'REJECTED', planPath, designReviewPath, implPath, implReviewPath);
    return {
      exitCode: ExitCode.REJECTED,
      status: 'REJECTED',
      message: 'rejected',
    };
  }

  // Status: NEEDS_CHANGES -> NEEDS_PLAN (11)
  if (designReviewStatus === 'NEEDS_CHANGES') {
    reconcileMeta(meta, topic, 'NEEDS_PLAN', planPath, designReviewPath, implPath, implReviewPath);
    return {
      exitCode: ExitCode.NEEDS_PLAN,
      status: 'NEEDS_PLAN',
      message: 'design review requires changes',
    };
  }

  // Status: DESIGN_APPROVED -> proceed to implementation phase
  // Step F: Implementation phase logic

  // F1: impl-review.md exists
  if (existsSync(implReviewPath)) {
    const implReviewContent = normalizeLF(readFileSync(implReviewPath, 'utf8'));
    const implReviewStatus = extractImplReviewStatus(implReviewContent);

    if (implReviewStatus === null) {
      // COMMAND_ERROR (1) - Status line is non-compliant, do NOT update meta.json
      return {
        exitCode: ExitCode.COMMAND_ERROR,
        status: 'COMMAND_ERROR',
        message: 'impl-review.md Status line is invalid or missing',
      };
    }

    // Status: DONE -> DONE (0)
    if (implReviewStatus === 'DONE') {
      reconcileMeta(meta, topic, 'DONE', planPath, designReviewPath, implPath, implReviewPath);
      return {
        exitCode: ExitCode.DONE,
        status: 'DONE',
        message: 'done',
      };
    }

    // Status: NEEDS_CHANGES -> IMPLEMENTING (14)
    if (implReviewStatus === 'NEEDS_CHANGES') {
      reconcileMeta(meta, topic, 'IMPLEMENTING', planPath, designReviewPath, implPath, implReviewPath);
      return {
        exitCode: ExitCode.IMPLEMENTING,
        status: 'IMPLEMENTING',
        message: 'impl review requires changes',
      };
    }
  }

  // F2: impl-review.md does not exist, but impl.md exists -> NEEDS_IMPL_REVIEW (16)
  if (existsSync(implPath)) {
    reconcileMeta(meta, topic, 'NEEDS_IMPL_REVIEW', planPath, designReviewPath, implPath, implReviewPath);
    return {
      exitCode: ExitCode.NEEDS_IMPL_REVIEW,
      status: 'NEEDS_IMPL_REVIEW',
      message: 'impl-review.md not found',
    };
  }

  // F3: impl.md does not exist
  // Use meta.status as auxiliary information for backward compatibility
  const implementingStatuses: MetaStatus[] = ['IMPLEMENTING', 'NEEDS_IMPL_REPORT', 'NEEDS_IMPL_REVIEW', 'DONE'];

  if (implementingStatuses.includes(meta.status)) {
    // Already in implementation phase -> NEEDS_IMPL_REPORT (15) or IMPLEMENTING (14)
    // Keep NEEDS_IMPL_REPORT if already in that state, otherwise use IMPLEMENTING
    if (meta.status === 'NEEDS_IMPL_REPORT') {
      reconcileMeta(meta, topic, 'NEEDS_IMPL_REPORT', planPath, designReviewPath, implPath, implReviewPath);
      return {
        exitCode: ExitCode.NEEDS_IMPL_REPORT,
        status: 'NEEDS_IMPL_REPORT',
        message: 'impl.md not found',
      };
    }
    // For other implementing states without impl.md, treat as IMPLEMENTING
    reconcileMeta(meta, topic, 'IMPLEMENTING', planPath, designReviewPath, implPath, implReviewPath);
    return {
      exitCode: ExitCode.IMPLEMENTING,
      status: 'IMPLEMENTING',
      message: 'implementing (impl.md not yet created)',
    };
  }

  // Not in implementation phase -> DESIGN_APPROVED (13)
  reconcileMeta(meta, topic, 'DESIGN_APPROVED', planPath, designReviewPath, implPath, implReviewPath);
  return {
    exitCode: ExitCode.DESIGN_APPROVED,
    status: 'DESIGN_APPROVED',
    message: 'ready to implement',
  };
}
