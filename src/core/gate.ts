import { existsSync, readFileSync } from 'fs';
import { ExitCode, ExitCodeValue } from './errors';
import { readMeta, Meta } from './meta';
import { getInstructionPath, getPlanPath, getDesignReviewPath, getImplPath, getImplReviewPath } from './paths';
import { sha256 } from './hashes';
import { normalizeLF } from './normalize';

export interface GateResult {
  exitCode: ExitCodeValue;
  status: string;
  message: string;
}

function hashMatches(expectedHash: string | null, filePath: string): boolean {
  if (!expectedHash) return false;
  if (!existsSync(filePath)) return false;
  const content = normalizeLF(readFileSync(filePath, 'utf8'));
  return sha256(content) === expectedHash;
}

function designHashesMatch(meta: Meta, topic: string): boolean {
  const planPath = getPlanPath(topic);
  const designReviewPath = getDesignReviewPath(topic);

  return (
    hashMatches(meta.hashes.planSha256, planPath) &&
    hashMatches(meta.hashes.designReviewSha256, designReviewPath)
  );
}

function allHashesMatch(meta: Meta, topic: string): boolean {
  const planPath = getPlanPath(topic);
  const designReviewPath = getDesignReviewPath(topic);
  const implPath = getImplPath(topic);
  const implReviewPath = getImplReviewPath(topic);

  return (
    hashMatches(meta.hashes.planSha256, planPath) &&
    hashMatches(meta.hashes.designReviewSha256, designReviewPath) &&
    hashMatches(meta.hashes.implSha256, implPath) &&
    hashMatches(meta.hashes.implReviewSha256, implReviewPath)
  );
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
  const designReviewPath = getDesignReviewPath(topic);
  const implPath = getImplPath(topic);
  const implReviewPath = getImplReviewPath(topic);

  // Priority 2: status in (DONE, REJECTED) with hash mismatch
  // DONE requires all 4 hashes to match
  // REJECTED only requires plan + designReview hashes (no impl files)
  if (meta.status === 'DONE') {
    if (!allHashesMatch(meta, topic)) {
      return {
        exitCode: ExitCode.BROKEN_STATE,
        status: 'BROKEN_STATE',
        message: 'hash mismatch in DONE/REJECTED state',
      };
    }
  }
  if (meta.status === 'REJECTED') {
    if (!designHashesMatch(meta, topic)) {
      return {
        exitCode: ExitCode.BROKEN_STATE,
        status: 'BROKEN_STATE',
        message: 'hash mismatch in DONE/REJECTED state',
      };
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

  // Priority 5: design-review.md missing
  if (!existsSync(designReviewPath)) {
    return {
      exitCode: ExitCode.NEEDS_DESIGN_REVIEW,
      status: 'NEEDS_DESIGN_REVIEW',
      message: 'design-review.md not found',
    };
  }

  // Priority 6: status=REJECTED
  if (meta.status === 'REJECTED') {
    return {
      exitCode: ExitCode.REJECTED,
      status: 'REJECTED',
      message: 'rejected',
    };
  }

  // Priority 7: status=DESIGN_APPROVED
  if (meta.status === 'DESIGN_APPROVED') {
    return {
      exitCode: ExitCode.DESIGN_APPROVED,
      status: 'DESIGN_APPROVED',
      message: 'ready to implement',
    };
  }

  // Priority 8: status=IMPLEMENTING and impl.md missing
  if (meta.status === 'IMPLEMENTING') {
    if (!existsSync(implPath)) {
      return {
        exitCode: ExitCode.NEEDS_IMPL_REPORT,
        status: 'NEEDS_IMPL_REPORT',
        message: 'impl.md not found',
      };
    }
    // Priority 9: status=IMPLEMENTING and impl.md exists but impl-review.md missing
    if (!existsSync(implReviewPath)) {
      return {
        exitCode: ExitCode.NEEDS_IMPL_REVIEW,
        status: 'NEEDS_IMPL_REVIEW',
        message: 'impl-review.md not found',
      };
    }
  }

  // Priority 10: status=NEEDS_IMPL_REVIEW
  if (meta.status === 'NEEDS_IMPL_REVIEW') {
    return {
      exitCode: ExitCode.NEEDS_IMPL_REVIEW,
      status: 'NEEDS_IMPL_REVIEW',
      message: 'impl-review.md not found',
    };
  }

  // Priority 11: status=DONE with hash match
  if (meta.status === 'DONE' && allHashesMatch(meta, topic)) {
    return {
      exitCode: ExitCode.DONE,
      status: 'DONE',
      message: 'done',
    };
  }

  // Priority 12: Other cases → BROKEN_STATE
  return {
    exitCode: ExitCode.BROKEN_STATE,
    status: 'BROKEN_STATE',
    message: 'broken state',
  };
}
