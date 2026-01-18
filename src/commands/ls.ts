import { readdirSync, existsSync } from 'fs';
import { getPlansDir, getMetaPath } from '../core/paths';
import { readMeta } from '../core/meta';

export interface LsEntry {
  topic: string;
  status: string;
  title: string;
  updatedAt: string;
}

export function listPlans(): LsEntry[] {
  const plansDir = getPlansDir();

  if (!existsSync(plansDir)) {
    return [];
  }

  const entries: LsEntry[] = [];

  try {
    const dirs = readdirSync(plansDir, { withFileTypes: true });

    for (const dir of dirs) {
      if (!dir.isDirectory()) continue;

      const topic = dir.name;
      const metaPath = getMetaPath(topic);

      if (!existsSync(metaPath)) continue;

      const metaResult = readMeta(topic);
      if (!metaResult.success) {
        entries.push({
          topic,
          status: 'BROKEN_STATE',
          title: '',
          updatedAt: '',
        });
        continue;
      }

      const meta = metaResult.meta;
      entries.push({
        topic: meta.topic,
        status: meta.status,
        title: meta.title,
        updatedAt: meta.timestamps.updatedAt,
      });
    }
  } catch {
    return [];
  }

  // Sort by updatedAt descending
  entries.sort((a, b) => {
    if (!a.updatedAt) return 1;
    if (!b.updatedAt) return -1;
    return b.updatedAt.localeCompare(a.updatedAt);
  });

  return entries;
}
