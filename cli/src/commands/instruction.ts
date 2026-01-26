import { writeFileSync, existsSync } from 'fs';
import { readMeta, writeMeta } from '../core/meta';
import { getInstructionPath, getTopicDir } from '../core/paths';
import { normalizeLF } from '../core/normalize';
import { nowJST } from '../core/time';

export interface InstructionResult {
  success: boolean;
  topic: string;
  message: string;
}

export function saveInstruction(topic: string, content: string): InstructionResult {
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
  const instructionPath = getInstructionPath(topic);
  writeFileSync(instructionPath, normalizedContent, 'utf8');

  const meta = metaResult.meta;
  // If status was NEEDS_INSTRUCTION, move to NEEDS_PLAN
  if (meta.status === 'NEEDS_INSTRUCTION') {
    meta.status = 'NEEDS_PLAN';
  }
  meta.timestamps.updatedAt = nowJST();
  writeMeta(topic, meta);

  return {
    success: true,
    topic,
    message: 'instruction saved',
  };
}
