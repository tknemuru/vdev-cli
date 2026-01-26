import { writeFileSync, existsSync } from 'fs';
import { readMeta, writeMeta, MetaStatus } from '../core/meta';
import { getDesignReviewPath, getPlanPath, getTopicDir } from '../core/paths';
import { sha256 } from '../core/hashes';
import { normalizeLF } from '../core/normalize';
import { nowJST } from '../core/time';

export interface ReviewResult {
  success: boolean;
  topic: string;
  status: MetaStatus | null;
  message: string;
}

type ReviewStatus = 'DESIGN_APPROVED' | 'REJECTED' | 'NEEDS_CHANGES';

function extractStatus(content: string): ReviewStatus | null {
  const lines = content.split('\n');
  for (const line of lines) {
    const match = line.match(/^Status:\s*(DESIGN_APPROVED|REJECTED|NEEDS_CHANGES)\s*$/i);
    if (match) {
      const status = match[1].toUpperCase();
      if (status === 'DESIGN_APPROVED' || status === 'REJECTED' || status === 'NEEDS_CHANGES') {
        return status as ReviewStatus;
      }
    }
  }
  return null;
}

export function saveReview(topic: string, content: string): ReviewResult {
  const topicDir = getTopicDir(topic);

  if (!existsSync(topicDir)) {
    return {
      success: false,
      topic,
      status: null,
      message: 'topic not found',
    };
  }

  const metaResult = readMeta(topic);
  if (!metaResult.success) {
    return {
      success: false,
      topic,
      status: null,
      message: `meta.json error: ${metaResult.error}`,
    };
  }

  // Precondition: plan.md must exist
  const planPath = getPlanPath(topic);
  if (!existsSync(planPath)) {
    return {
      success: false,
      topic,
      status: null,
      message: 'plan.md not found',
    };
  }

  // Precondition: planSha256 must be set (vdev plan must have been executed)
  const meta = metaResult.meta;
  if (!meta.hashes.planSha256) {
    return {
      success: false,
      topic,
      status: null,
      message: 'planSha256 not set: run vdev plan first',
    };
  }

  const normalizedContent = normalizeLF(content);
  const designReviewPath = getDesignReviewPath(topic);
  writeFileSync(designReviewPath, normalizedContent, 'utf8');

  const extractedStatus = extractStatus(normalizedContent);

  if (extractedStatus === null) {
    // Status extraction failed -> COMMAND_ERROR
    return {
      success: false,
      topic,
      status: null,
      message: 'Status extraction failed',
    };
  }

  // Update meta with extracted status
  const reviewHash = sha256(normalizedContent);

  // v2 状態遷移:
  // - DESIGN_APPROVED -> status=DESIGN_APPROVED
  // - REJECTED -> status=REJECTED
  // - NEEDS_CHANGES -> status=NEEDS_PLAN (設計やり直し)
  if (extractedStatus === 'DESIGN_APPROVED') {
    meta.status = 'DESIGN_APPROVED';
  } else if (extractedStatus === 'REJECTED') {
    meta.status = 'REJECTED';
  } else if (extractedStatus === 'NEEDS_CHANGES') {
    meta.status = 'NEEDS_PLAN';
  }

  meta.hashes.designReviewSha256 = reviewHash;
  meta.timestamps.updatedAt = nowJST();

  writeMeta(topic, meta);

  return {
    success: true,
    topic,
    status: meta.status,
    message: `review saved with status ${extractedStatus}`,
  };
}
