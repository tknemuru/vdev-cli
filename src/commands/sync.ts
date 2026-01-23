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

export interface SyncCommandResult {
  success: boolean;
  message: string;
  syncResult: SyncResult;
  vdevFlowResult?: SyncResult;
  commandsResult?: DirSyncResult;
  subagentsResult?: DirSyncResult;
  knowledgesResult?: KnowledgesSyncResult;
}

export function syncCommand(force: boolean): SyncCommandResult {
  const repoRoot = process.cwd();
  const syncResult = syncClaudeMd(repoRoot, force);
  const vdevFlowResult = syncVdevFlow(repoRoot, force);
  const commandsResult = syncClaudeCommands(repoRoot, force);
  const subagentsResult = syncClaudeSubagents(repoRoot, force);
  const knowledgesResult = syncKnowledges(repoRoot, force);

  // 【互換維持】成功判定は従来通り CLAUDE.md のみを基準とする
  // vdev-flow.md, commands, subagents, knowledges の結果は success に影響しない
  const success = syncResult.success;

  return {
    success,
    message: syncResult.message,
    syncResult,
    vdevFlowResult,
    commandsResult,
    subagentsResult,
    knowledgesResult,
  };
}
