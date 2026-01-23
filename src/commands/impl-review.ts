import { writeFileSync, existsSync } from 'fs';
import { readMeta, writeMeta, MetaStatus } from '../core/meta';
import { getImplReviewPath, getImplPath, getTopicDir } from '../core/paths';
import { sha256 } from '../core/hashes';
import { normalizeLF } from '../core/normalize';
import { nowJST } from '../core/time';

export interface ImplReviewResult {
  success: boolean;
  topic: string;
  status: MetaStatus | null;
  message: string;
}

type ImplReviewStatus = 'DONE' | 'NEEDS_CHANGES';

function extractStatus(content: string): ImplReviewStatus | null {
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

export function saveImplReview(topic: string, content: string): ImplReviewResult {
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

  // Precondition: impl.md must exist
  const implPath = getImplPath(topic);
  if (!existsSync(implPath)) {
    return {
      success: false,
      topic,
      status: null,
      message: 'impl.md not found',
    };
  }

  // Precondition: implSha256 must be set (vdev impl must have been executed)
  const meta = metaResult.meta;
  if (!meta.hashes.implSha256) {
    return {
      success: false,
      topic,
      status: null,
      message: 'implSha256 not set: run vdev impl first',
    };
  }

  const normalizedContent = normalizeLF(content);
  const implReviewPath = getImplReviewPath(topic);
  writeFileSync(implReviewPath, normalizedContent, 'utf8');

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
  const implReviewHash = sha256(normalizedContent);

  // v2 状態遷移:
  // - DONE -> status=DONE
  // - NEEDS_CHANGES -> status=IMPLEMENTING (実装修正へ戻す)
  if (extractedStatus === 'DONE') {
    meta.status = 'DONE';
  } else if (extractedStatus === 'NEEDS_CHANGES') {
    meta.status = 'IMPLEMENTING';
  }

  meta.hashes.implReviewSha256 = implReviewHash;
  meta.timestamps.updatedAt = nowJST();

  writeMeta(topic, meta);

  return {
    success: true,
    topic,
    status: meta.status,
    message: `impl-review saved with status ${extractedStatus}`,
  };
}
