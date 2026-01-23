import { existsSync, mkdirSync } from 'fs';
import { toSlug } from '../core/slug';
import { todayJST, nowJST } from '../core/time';
import { createInitialMeta, writeMeta } from '../core/meta';
import { getTopicDir } from '../core/paths';
import {
  syncClaudeMd,
  syncVdevFlow,
  syncClaudeCommands,
  syncClaudeSubagents,
  syncKnowledges,
  SyncResult,
  DirSyncResult,
  KnowledgesSyncResult,
} from '../core/claudeMdSync';

export interface NewResult {
  success: boolean;
  topic: string;
  path: string;
  message: string;
  syncResult?: SyncResult;
  vdevFlowResult?: SyncResult;
  commandsResult?: DirSyncResult;
  subagentsResult?: DirSyncResult;
  knowledgesResult?: KnowledgesSyncResult;
}

export function newPlan(name: string, force: boolean = false): NewResult {
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

  const syncResult = syncClaudeMd(process.cwd(), force);
  const vdevFlowResult = syncVdevFlow(process.cwd(), force);
  const commandsResult = syncClaudeCommands(process.cwd(), force);
  const subagentsResult = syncClaudeSubagents(process.cwd(), force);
  const knowledgesResult = syncKnowledges(process.cwd(), force);

  // 【互換維持】new の成功判定には vdevFlowResult, commandsResult, subagentsResult, knowledgesResult を含めない
  // これらは呼び出し側で警告表示に使用

  return {
    success: true,
    topic,
    path: topicDir + '/',
    message: 'created',
    syncResult,
    vdevFlowResult,
    commandsResult,
    subagentsResult,
    knowledgesResult,
  };
}
