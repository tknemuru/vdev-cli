import { existsSync, readFileSync } from 'fs';
import { ExitCode, ExitCodeValue } from './errors';
import { readMeta } from './meta';
import { getInstructionPath, getPlanPath, getReviewPath } from './paths';
import { sha256 } from './hashes';
import { normalizeLF } from './normalize';

export interface GateResult {
  exitCode: ExitCodeValue;
  status: string;
  message: string;
}

export function checkGate(topic: string): GateResult {
  // Priority 1: meta.json invalid or parse failure
  const metaResult = readMeta(topic);
  if (!metaResult.success) {
    return {
      exitCode: ExitCode.BROKEN_STATE,
      status: 'BROKEN_STATE',
      message: `meta.json error: ${metaResult.error}`,
    };
  }

  const meta = metaResult.meta;
  const instructionPath = getInstructionPath(topic);
  const planPath = getPlanPath(topic);
  const reviewPath = getReviewPath(topic);

  // Priority 2: status=APPROVED/REJECTED with hash mismatch
  if (meta.status === 'APPROVED' || meta.status === 'REJECTED') {
    const planExists = existsSync(planPath);
    const reviewExists = existsSync(reviewPath);

    if (planExists && reviewExists) {
      const planContent = normalizeLF(readFileSync(planPath, 'utf8'));
      const reviewContent = normalizeLF(readFileSync(reviewPath, 'utf8'));
      const planHash = sha256(planContent);
      const reviewHash = sha256(reviewContent);

      const hashMismatch =
        meta.hashes.planSha256 !== planHash || meta.hashes.reviewSha256 !== reviewHash;

      if (hashMismatch) {
        return {
          exitCode: ExitCode.BROKEN_STATE,
          status: 'BROKEN_STATE',
          message: 'hash mismatch in APPROVED/REJECTED state',
        };
      }
    }
  }

  // Priority 3: instruction.md missing
  if (!existsSync(instructionPath)) {
    return {
      exitCode: ExitCode.NEEDS_INSTRUCTION,
      status: 'NEEDS_INSTRUCTION',
      message: 'instruction.md not found',
    };
  }

  // Priority 4: plan.md missing
  if (!existsSync(planPath)) {
    return {
      exitCode: ExitCode.NEEDS_PLAN,
      status: 'NEEDS_PLAN',
      message: 'plan.md not found',
    };
  }

  // Priority 5: review.md missing
  if (!existsSync(reviewPath)) {
    return {
      exitCode: ExitCode.NEEDS_REVIEW,
      status: 'NEEDS_REVIEW',
      message: 'review.md not found',
    };
  }

  // Priority 6: status=NEEDS_CHANGES
  if (meta.status === 'NEEDS_CHANGES') {
    return {
      exitCode: ExitCode.NEEDS_CHANGES,
      status: 'NEEDS_CHANGES',
      message: 'changes requested',
    };
  }

  // Priority 7: status=REJECTED
  if (meta.status === 'REJECTED') {
    return {
      exitCode: ExitCode.REJECTED,
      status: 'REJECTED',
      message: 'plan rejected',
    };
  }

  // Priority 8: status=APPROVED with hash match
  if (meta.status === 'APPROVED') {
    return {
      exitCode: ExitCode.APPROVED,
      status: 'APPROVED',
      message: 'ready to implement',
    };
  }

  // Other status values (NEEDS_INSTRUCTION, NEEDS_PLAN, NEEDS_REVIEW as meta status)
  // but files exist - treat as needing review update
  return {
    exitCode: ExitCode.NEEDS_CHANGES,
    status: 'NEEDS_CHANGES',
    message: `status is ${meta.status} but files exist`,
  };
}
