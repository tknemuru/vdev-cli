# vdev-sync-claude-assets 実装計画

version: 1.0.0
created: 2026-01-22
status: DRAFT

---

## 1. 概要

本計画は instruction.md に基づき、`vdev sync` の配布ペイロードを拡張し、各リポジトリへ Claude 資産（`.claude/commands` と `.claude/subagents`）を配布できるようにする。

現行の同期対象：
- CLAUDE.md
- vdev-flow.md

追加する同期対象：
- .claude/commands/（ディレクトリ丸ごとコピー）
- .claude/subagents/（ディレクトリ丸ごとコピー）

---

## 2. 実装範囲（In Scope）

1. `src/core/claudeMdSync.ts` 更新（.claude ディレクトリ同期機能追加）
2. `src/commands/sync.ts` 更新（.claude 同期結果の返却）
3. `src/commands/new.ts` 更新（.claude 同期の組み込み）
4. `src/cli.ts` 更新（.claude 同期結果の出力）
5. `docs/ops.md` 追記（.claude 資産の運用ルール）
6. `test/sync.test.ts` 追記（.claude 同期のテスト）

---

## 3. 実装手順

### Step 1: `src/core/claudeMdSync.ts` に .claude ディレクトリ同期関数を追加

以下の関数を追加する：

```typescript
// .claude ディレクトリの同期元パス
export function getGlobalClaudeDir(): string
// ~/.vdev/.claude を返す

// ディレクトリ同期結果
export interface DirSyncResult {
  success: boolean;
  written: boolean;        // コピーが行われたか
  sourceMissing: boolean;  // 同期元が存在しないか
  message: string;
}

// ディレクトリを再帰的にコピー
export function copyDirRecursive(src: string, dest: string): void

// .claude/commands を同期
export function syncClaudeCommands(repoRoot: string, force: boolean): DirSyncResult

// .claude/subagents を同期
export function syncClaudeSubagents(repoRoot: string, force: boolean): DirSyncResult
```

#### ディレクトリ同期の挙動

1. **同期元が存在しない場合**
   - `sourceMissing: true`, `success: false`
   - 警告扱い（exit code には影響しない）

2. **同期先が存在しない場合**
   - 新規作成してコピー
   - `written: true`, `success: true`

3. **同期先が存在する場合（force=false）**
   - 既存ファイルの差分は検出しない（ディレクトリ同期はファイル単位の差分追跡が複雑すぎるため）
   - 常に上書きコピーを行う
   - `written: true`, `success: true`

4. **同期先が存在する場合（force=true）**
   - 同上（force の有無でディレクトリ同期の挙動は変わらない）

**設計判断**: ディレクトリ同期は CLAUDE.md/vdev-flow.md と異なり、差分検出を行わない。理由：
- ディレクトリ内の複数ファイルの差分追跡は複雑
- 正本は ~/.vdev/.claude であり、リポジトリ側での編集は想定しない
- シンプルに「常に上書き」とすることで実装を簡潔に保つ

### Step 2: `src/commands/sync.ts` 更新

```typescript
export interface SyncCommandResult {
  success: boolean;
  message: string;
  syncResult: SyncResult;
  vdevFlowResult?: SyncResult;
  commandsResult?: DirSyncResult;   // 追加
  subagentsResult?: DirSyncResult;  // 追加
}

export function syncCommand(force: boolean): SyncCommandResult
```

動作：
1. 既存の CLAUDE.md / vdev-flow.md 同期を実行
2. .claude/commands 同期を実行
3. .claude/subagents 同期を実行
4. 結果を集約して返却

**成功判定は CLAUDE.md のみを基準とする**（互換維持）
- vdevFlowResult, commandsResult, subagentsResult は success に影響しない

### Step 3: `src/commands/new.ts` 更新

```typescript
export interface NewResult {
  success: boolean;
  topic: string;
  path: string;
  message: string;
  syncResult?: SyncResult;
  vdevFlowResult?: SyncResult;
  commandsResult?: DirSyncResult;   // 追加
  subagentsResult?: DirSyncResult;  // 追加
}
```

動作変更：
1. topic 作成（従来通り）
2. CLAUDE.md / vdev-flow.md 同期（従来通り）
3. .claude/commands 同期（追加）
4. .claude/subagents 同期（追加）

### Step 4: `src/cli.ts` 更新

#### sync コマンド

成功時の出力を拡張：
```
REPO=vdev-cli	SYNCED	CLAUDE.md updated
REPO=vdev-cli	SYNCED	vdev-flow.md updated
REPO=vdev-cli	SYNCED	.claude/commands synced
REPO=vdev-cli	SYNCED	.claude/subagents synced
```

同期元欠損時の警告（exit code は変えない）：
```
Warning: ~/.vdev/.claude/commands not found (skipped)
Warning: ~/.vdev/.claude/subagents not found (skipped)
```

#### new コマンド

sync コマンドと同様の警告出力を追加。

### Step 5: `docs/ops.md` 追記

セクション 5 に以下を追加：

```markdown
### .claude 資産（commands / subagents）の運用

#### 配布元の構成

~/.vdev/.claude/
├── commands/
│   ├── command1.md
│   └── command2.md
└── subagents/
    ├── subagent1.md
    └── subagent2.md

- これらのディレクトリは ai-resources からコピーするか、直接作成する。
- symlink ではなく実体ディレクトリとして配置することを推奨。

#### 同期動作

- `vdev sync` / `vdev new` は ~/.vdev/.claude/ 配下を各リポジトリにコピーする。
- ディレクトリ同期は常に上書きコピー（差分検出なし）。
- 同期元が存在しない場合は警告のみ（exit code には影響しない）。

#### セットアップ

# ai-resources から .claude 資産をコピー
mkdir -p ~/.vdev/.claude
cp -r /path/to/ai-resources/vibe-coding-partner/claude/commands ~/.vdev/.claude/
cp -r /path/to/ai-resources/vibe-coding-partner/claude/subagents ~/.vdev/.claude/

# または symlink（非推奨だが可能）
ln -s /path/to/ai-resources/vibe-coding-partner/claude/commands ~/.vdev/.claude/commands
ln -s /path/to/ai-resources/vibe-coding-partner/claude/subagents ~/.vdev/.claude/subagents
```

### Step 6: `test/sync.test.ts` 追記

以下のテストケースを追加：

1. `getGlobalClaudeDir` returns correct path
2. `syncClaudeCommands` returns sourceMissing when source does not exist
3. `syncClaudeCommands` copies directory when source exists
4. `syncClaudeSubagents` returns sourceMissing when source does not exist
5. `syncClaudeSubagents` copies directory when source exists
6. `syncCommand` includes commandsResult and subagentsResult
7. `newPlan` includes commandsResult and subagentsResult

---

## 4. 変更ファイル一覧

| ファイル | 操作 |
|----------|------|
| src/core/claudeMdSync.ts | 更新 |
| src/commands/sync.ts | 更新 |
| src/commands/new.ts | 更新 |
| src/cli.ts | 更新 |
| docs/ops.md | 追記 |
| test/sync.test.ts | 追記 |

---

## 5. DoD（Definition of Done）

- [ ] `~/.vdev/.claude/commands` が存在する場合、repo の `.claude/commands` にコピーされる
- [ ] `~/.vdev/.claude/subagents` が存在する場合、repo の `.claude/subagents` にコピーされる
- [ ] 同期元が存在しない場合は警告のみ（exit code に影響しない）
- [ ] 既存の CLAUDE.md / vdev-flow.md 同期が回帰していない
- [ ] `~/.vdev/CLAUDE.md` および `~/.vdev/vdev-flow.md` の symlink が改修前と同一
- [ ] docs を削らず追記で更新
- [ ] テストが追加され `npm test` が通る

---

## 6. Verify

```bash
# ビルド
npm run build

# テスト
npm test

# 事前確認: symlink が維持されていること
ls -l ~/.vdev/CLAUDE.md
ls -l ~/.vdev/vdev-flow.md

# 同期元の準備（テスト用）
mkdir -p ~/.vdev/.claude/commands
mkdir -p ~/.vdev/.claude/subagents
echo "# test command" > ~/.vdev/.claude/commands/test.md
echo "# test subagent" > ~/.vdev/.claude/subagents/test.md

# 手動検証: sync --force
./dist/cli.js sync --force
ls -la .claude/commands
ls -la .claude/subagents

# 手動検証: 同期元欠損時の警告
rm -rf ~/.vdev/.claude
./dist/cli.js sync --force
# Warning が出力されること

# 事後確認: symlink が維持されていること
ls -l ~/.vdev/CLAUDE.md
ls -l ~/.vdev/vdev-flow.md
```

---

## 7. 注意事項

- **symlink 非破壊**: `~/.vdev/CLAUDE.md` と `~/.vdev/vdev-flow.md` の symlink 構造は絶対に変更しない
- **ディレクトリ同期は差分検出なし**: シンプルに常に上書きコピーとする
- **成功判定の互換維持**: exit code は CLAUDE.md の同期結果のみで判定
- **警告のみ**: .claude 資産の同期元欠損は警告扱いで exit code には影響しない

---

## 8. Rollback

- src/core/claudeMdSync.ts から .claude 関連関数を削除
- src/commands/sync.ts から commandsResult/subagentsResult を削除
- src/commands/new.ts から commandsResult/subagentsResult を削除
- src/cli.ts から .claude 関連出力を削除
- docs/ops.md から .claude 資産の記述を削除
- test/sync.test.ts から .claude 関連テストを削除
