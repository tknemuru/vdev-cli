import { writeFileSync, existsSync } from 'fs';
import { readMeta, writeMeta } from '../core/meta';
import { getPlanPath, getTopicDir } from '../core/paths';
import { sha256 } from '../core/hashes';
import { normalizeLF } from '../core/normalize';
import { nowJST } from '../core/time';

export interface PlanResult {
  success: boolean;
  topic: string;
  message: string;
}

export function savePlan(topic: string, content: string): PlanResult {
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

  const normalizedContent = normalizeLF(content);
  const planPath = getPlanPath(topic);
  writeFileSync(planPath, normalizedContent, 'utf8');

  const planHash = sha256(normalizedContent);
  const meta = metaResult.meta;

  // When plan is saved, status becomes NEEDS_CHANGES (invalidates approval)
  meta.status = 'NEEDS_CHANGES';
  meta.hashes.planSha256 = planHash;
  meta.hashes.reviewSha256 = '';
  meta.timestamps.updatedAt = nowJST();

  writeMeta(topic, meta);

  return {
    success: true,
    topic,
    message: 'plan saved',
  };
}
