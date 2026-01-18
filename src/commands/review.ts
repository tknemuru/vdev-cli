import { writeFileSync, existsSync, readFileSync } from 'fs';
import { readMeta, writeMeta, MetaStatus } from '../core/meta';
import { getReviewPath, getPlanPath, getTopicDir } from '../core/paths';
import { sha256 } from '../core/hashes';
import { normalizeLF } from '../core/normalize';
import { nowJST } from '../core/time';

export interface ReviewResult {
  success: boolean;
  topic: string;
  status: MetaStatus | null;
  message: string;
}

function extractStatus(content: string): MetaStatus | null {
  const lines = content.split('\n');
  for (const line of lines) {
    const match = line.match(/^Status:\s*(APPROVED|REJECTED|NEEDS_CHANGES)\s*$/i);
    if (match) {
      return match[1].toUpperCase() as MetaStatus;
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

  const planPath = getPlanPath(topic);
  if (!existsSync(planPath)) {
    return {
      success: false,
      topic,
      status: null,
      message: 'plan.md not found',
    };
  }

  const normalizedContent = normalizeLF(content);
  const reviewPath = getReviewPath(topic);
  writeFileSync(reviewPath, normalizedContent, 'utf8');

  const extractedStatus = extractStatus(normalizedContent);
  const meta = metaResult.meta;

  if (extractedStatus === null) {
    // Status extraction failed -> NEEDS_CHANGES
    meta.status = 'NEEDS_CHANGES';
    meta.hashes.reviewSha256 = sha256(normalizedContent);
    meta.timestamps.updatedAt = nowJST();
    writeMeta(topic, meta);

    return {
      success: true,
      topic,
      status: 'NEEDS_CHANGES',
      message: 'review saved, status extraction failed',
    };
  }

  // Update meta with extracted status and hashes
  const planContent = normalizeLF(readFileSync(planPath, 'utf8'));
  const planHash = sha256(planContent);
  const reviewHash = sha256(normalizedContent);

  meta.status = extractedStatus;
  meta.hashes.planSha256 = planHash;
  meta.hashes.reviewSha256 = reviewHash;
  meta.timestamps.updatedAt = nowJST();

  writeMeta(topic, meta);

  return {
    success: true,
    topic,
    status: extractedStatus,
    message: `review saved with status ${extractedStatus}`,
  };
}
