import { syncClaudeMd, SyncResult } from '../core/claudeMdSync';

export interface SyncCommandResult {
  success: boolean;
  message: string;
  syncResult: SyncResult;
}

export function syncCommand(force: boolean): SyncCommandResult {
  const repoRoot = process.cwd();
  const syncResult = syncClaudeMd(repoRoot, force);

  return {
    success: syncResult.success,
    message: syncResult.message,
    syncResult,
  };
}
