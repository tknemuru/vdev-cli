import { existsSync } from 'fs';
import { readMeta, writeMeta } from '../core/meta';
import { getTopicDir } from '../core/paths';
import { nowJST } from '../core/time';

export interface StartResult {
  success: boolean;
  topic: string;
  message: string;
}

export function startImplementation(topic: string): StartResult {
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

  // Precondition: status must be DESIGN_APPROVED
  if (meta.status !== 'DESIGN_APPROVED') {
    return {
      success: false,
      topic,
      message: `Cannot start in ${meta.status} status`,
    };
  }

  // Transition to IMPLEMENTING
  meta.status = 'IMPLEMENTING';
  meta.timestamps.updatedAt = nowJST();

  writeMeta(topic, meta);

  return {
    success: true,
    topic,
    message: 'implementation started',
  };
}
