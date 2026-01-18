import { existsSync, mkdirSync } from 'fs';
import { toSlug } from '../core/slug';
import { todayJST, nowJST } from '../core/time';
import { createInitialMeta, writeMeta } from '../core/meta';
import { getTopicDir } from '../core/paths';

export interface NewResult {
  success: boolean;
  topic: string;
  path: string;
  message: string;
}

export function newPlan(name: string): NewResult {
  const slug = toSlug(name);
  const today = todayJST();
  const topic = `${today}-${slug}`;
  const topicDir = getTopicDir(topic);

  if (existsSync(topicDir)) {
    return {
      success: false,
      topic,
      path: topicDir,
      message: 'topic already exists',
    };
  }

  mkdirSync(topicDir, { recursive: true });

  const title = name
    .split(/[-_\s]+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');

  const timestamp = nowJST();
  const meta = createInitialMeta(topic, title, timestamp);
  writeMeta(topic, meta);

  return {
    success: true,
    topic,
    path: topicDir + '/',
    message: 'created',
  };
}
