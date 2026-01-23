# Implementation Report: vdev sync claude 配下「まるごと同期」修正

## 変更したファイル一覧

| ファイル | 変更内容 |
|---------|---------|
| src/core/claudeMdSync.ts | `syncClaudeDir()` 追加、`copyDirRecursive()` / `directoriesDiffer()` に除外パターン引数追加 |
| src/commands/sync.ts | `syncClaudeDir()` を呼び出すよう修正、`commandsResult` / `subagentsResult` を `claudeDirResult` に統合 |
| src/commands/new.ts | 同上 |
| src/cli.ts | CLI 出力を `claudeDirResult` に対応 |
| test/sync.test.ts | `syncClaudeDir` のテスト追加、既存テストの更新 |

## 実装詳細

### 1. syncClaudeDir() の追加

claude/ 配下を「CLAUDE.md を除きまるごと」同期する新関数を追加:

```typescript
const CLAUDE_DIR_EXCLUDE_PATTERNS = ['CLAUDE.md'];

export function syncClaudeDir(repoRoot: string, force: boolean): DirSyncResult {
  const srcDir = getGlobalClaudeDir();
  const destDir = join(repoRoot, '.claude');
  const hasDiff = directoriesDiffer(srcDir, destDir, CLAUDE_DIR_EXCLUDE_PATTERNS);
  // ...
}
```

### 2. 除外パターン対応

`copyDirRecursive()` と `directoriesDiffer()` に `excludePatterns` 引数を追加し、CLAUDE.md を除外:

```typescript
export function copyDirRecursive(
  src: string,
  dest: string,
  excludePatterns: string[] = []  // デフォルト空配列で後方互換
): void {
  // ...
  for (const entry of entries) {
    if (excludePatterns.includes(entry)) continue;
    // ...
  }
}
```

### 3. レガシー関数の維持

`syncClaudeCommands()` と `syncClaudeSubagents()` は後方互換のため維持（deprecated としてコメント）。
実際の同期では `syncClaudeDir()` が使用される。

## Verify 実行結果

### 自動テスト

```
$ npm test

 ✓ test/sync.test.ts  (43 tests) 287ms
 ✓ test/commands.test.ts  (21 tests) 1318ms
 ✓ test/gate.test.ts  (16 tests) 637ms
 ✓ test/slug.test.ts  (9 tests) 1ms
 ✓ test/hashes.test.ts  (3 tests) 1ms
 ✓ test/normalize.test.ts  (3 tests) 2ms

 Test Files  6 passed (6)
      Tests  95 passed (95)
```

### 手動検証

```
$ rm -rf .claude && vdev sync --force
REPO=vdev-cli	SYNCED	CLAUDE.md is up to date
REPO=vdev-cli	SYNCED	vdev-flow.md is up to date
REPO=vdev-cli	SYNCED	.claude created

$ ls -la .claude/
total 28
drwxr-xr-x 4 tk tk 4096 Jan 23 17:54 .
drwxr-xr-x 9 tk tk 4096 Jan 23 17:54 ..
drwxr-xr-x 2 tk tk 4096 Jan 23 17:54 commands
-rw-r--r-- 1 tk tk  102 Jan 23 17:54 knowledge-manifest.txt
-rw-r--r-- 1 tk tk 4183 Jan 23 17:54 reviewer-principles.md
drwxr-xr-x 2 tk tk 4096 Jan 23 17:54 subagents
```

### ~/.vdev/ 非参照確認

```
$ grep -r "~/.vdev\|homedir.*\.vdev\|home.*\.vdev" src/
No ~/.vdev path references found
```

## DoD 充足根拠

| DoD 項目 | 充足根拠 |
|---------|---------|
| reviewer-principles.md が .claude/ に同期 | 手動検証で確認（上記 ls 出力） |
| 新規ファイルが自動同期される | テスト `syncClaudeDir syncs future files without code change` で確認 |
| CLAUDE.md が .claude/ に二重配置されない | テスト `syncClaudeDir copies entire directory excluding CLAUDE.md` で確認 |
| knowledges allowlist 維持 | 既存テスト `syncKnowledges copies only allowlist files` が pass |
| ~/.vdev/ 非参照 | grep で確認（上記） |

## 残課題・不確実点

なし
