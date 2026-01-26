import { writeFileSync, existsSync } from 'fs';
import { readMeta, writeMeta } from '../core/meta';
import { getImplPath, getTopicDir } from '../core/paths';
import { sha256 } from '../core/hashes';
import { normalizeLF } from '../core/normalize';
import { nowJST } from '../core/time';

export interface ImplResult {
  success: boolean;
  topic: string;
  message: string;
}

export function saveImpl(topic: string, content: string): ImplResult {
  const topicDir = getTopicDir(topic);

  if (!existsSync(topicDir)) {
    return {
      success: false,
      topic,
      message: 'topic not found',
    };
  }

  const metaResult = readMeta(topic);
  if (!metaResult.success) {
    return {
      success: false,
      topic,
      message: `meta.json error: ${metaResult.error}`,
    };
  }

  const meta = metaResult.meta;

  // Precondition: status must be IMPLEMENTING
  if (meta.status !== 'IMPLEMENTING') {
    return {
      success: false,
      topic,
      message: `Cannot save impl in ${meta.status} status`,
    };
  }

  const normalizedContent = normalizeLF(content);
  const implPath = getImplPath(topic);
  writeFileSync(implPath, normalizedContent, 'utf8');

  const implHash = sha256(normalizedContent);

  // Transition to NEEDS_IMPL_REVIEW
  meta.status = 'NEEDS_IMPL_REVIEW';
  meta.hashes.implSha256 = implHash;
  meta.hashes.implReviewSha256 = null; // Invalidate impl-review
  meta.timestamps.updatedAt = nowJST();

  writeMeta(topic, meta);

  return {
    success: true,
    topic,
    message: 'impl saved',
  };
}
