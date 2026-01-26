import { writeFileSync, existsSync } from 'fs';
import { readMeta, writeMeta } from '../core/meta';
import { getPlanPath, getTopicDir, getInstructionPath } from '../core/paths';
import { sha256 } from '../core/hashes';
import { normalizeLF } from '../core/normalize';
import { nowJST } from '../core/time';
import { ExitCode } from '../core/errors';

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

  // Precondition: instruction.md must exist
  const instructionPath = getInstructionPath(topic);
  if (!existsSync(instructionPath)) {
    return {
      success: false,
      topic,
      message: 'instruction.md not found',
    };
  }

  const normalizedContent = normalizeLF(content);
  const planPath = getPlanPath(topic);
  writeFileSync(planPath, normalizedContent, 'utf8');

  const planHash = sha256(normalizedContent);
  const meta = metaResult.meta;

  // v2: plan 保存で status は NEEDS_DESIGN_REVIEW になる（設計レビューを無効化）
  meta.status = 'NEEDS_DESIGN_REVIEW';
  meta.hashes.planSha256 = planHash;
  meta.hashes.designReviewSha256 = null; // 設計レビューを無効化
  meta.timestamps.updatedAt = nowJST();

  writeMeta(topic, meta);

  return {
    success: true,
    topic,
    message: 'plan saved',
  };
}
