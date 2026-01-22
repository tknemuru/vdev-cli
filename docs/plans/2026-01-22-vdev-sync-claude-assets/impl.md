# vdev-sync-claude-assets 実装完了報告

## Summary

`vdev sync` の配布ペイロードを拡張し、`.claude/commands` と `.claude/subagents` ディレクトリを各リポジトリへ配布できるようにした。

**impl-review での NEEDS_CHANGES 指摘を反映:**
- ディレクトリ同期も既存の CLAUDE.md / vdev-flow.md 同期と同じポリシーに統一
- 差分検出を実装し、--force フラグを尊重するように修正
- ops.md の記述と CLI 出力を整合させた

---

## Files Changed

| ファイル | 操作 | 説明 |
|----------|------|------|
| src/core/claudeMdSync.ts | 更新 | DirSyncResult に hasDiff 追加、directoriesDiffer 関数追加、syncClaudeCommands/syncClaudeSubagents で差分検出と --force 尊重 |
| src/commands/sync.ts | 更新 | commandsResult/subagentsResult を SyncCommandResult に追加 |
| src/commands/new.ts | 更新 | commandsResult/subagentsResult を NewResult に追加 |
| src/cli.ts | 更新 | sync/new コマンドに .claude 資産の差分検出警告を追加 |
| docs/ops.md | 追記 | .claude 資産の同期ポリシーと警告メッセージを明記 |
| test/sync.test.ts | 追記 | .claude ディレクトリ同期のテスト 11 件追加（差分検出含む） |

---

## Tests

```
 ✓ test/sync.test.ts  (26 tests) 122ms
 ✓ test/commands.test.ts  (21 tests) 1596ms
 ✓ test/gate.test.ts  (16 tests) 802ms
 ✓ test/slug.test.ts  (9 tests) 1ms
 ✓ test/hashes.test.ts  (3 tests) 1ms
 ✓ test/normalize.test.ts  (3 tests) 1ms

 Test Files  6 passed (6)
      Tests  78 passed (78)
```

### 新規追加テストケース

1. getGlobalClaudeDir returns correct path
2. syncClaudeCommands returns sourceMissing when source does not exist
3. syncClaudeCommands copies directory when source exists
4. syncClaudeSubagents returns sourceMissing when source does not exist
5. syncClaudeSubagents copies directory when source exists
6. **syncClaudeCommands returns hasDiff=true, written=false when diff exists and force=false**（差分検出対応）
7. **syncClaudeCommands overwrites when diff exists and force=true**（--force 対応）
8. **syncClaudeCommands returns hasDiff=false when content is identical**（差分なし判定）
9. syncCommand includes commandsResult and subagentsResult
10. syncCommand copies .claude directories when they exist
11. newPlan includes commandsResult and subagentsResult

---

## Verify

```bash
# ビルド
npm run build  # ✓ 成功

# テスト
npm test  # ✓ 78件全てパス

# symlink 確認
ls -la ~/.vdev/CLAUDE.md
# lrwxrwxrwx ... -> /home/tk/projects/ai-resources/vibe-coding-partner/claude/CLAUDE.md
ls -la ~/.vdev/vdev-flow.md
# lrwxrwxrwx ... -> /home/tk/projects/ai-resources/vibe-coding-partner/knowledges/vdev-flow.md

# 手動検証: 差分検出
mkdir -p ~/.vdev/.claude/commands ~/.vdev/.claude/subagents
echo "# Test Command" > ~/.vdev/.claude/commands/test.md
echo "# Test Subagent" > ~/.vdev/.claude/subagents/test.md
./dist/cli.js sync --force
# REPO=vdev-cli	SYNCED	CLAUDE.md updated
# REPO=vdev-cli	SYNCED	.claude/commands created
# REPO=vdev-cli	SYNCED	.claude/subagents created

# ローカル変更後の差分検出
echo "# Modified" >> .claude/commands/test.md
./dist/cli.js sync
# Warning: .claude/commands differs from source (~/.vdev/.claude/commands)
# Hint: run 'vdev sync --force' to overwrite repo .claude/commands
# Exit code: 0（CLAUDE.md は成功しているため）

# --force で上書き
./dist/cli.js sync --force
# REPO=vdev-cli	SYNCED	.claude/commands updated

# 同期元欠損時の警告
rm -rf ~/.vdev/.claude
./dist/cli.js sync --force
# Warning: ~/.vdev/.claude/commands not found (skipped)
# Warning: ~/.vdev/.claude/subagents not found (skipped)
# Exit code: 0（CLAUDE.md は成功しているため）
```

---

## DoD 達成状況

- [x] `~/.vdev/.claude/commands` が存在する場合、repo の `.claude/commands` にコピーされる
- [x] `~/.vdev/.claude/subagents` が存在する場合、repo の `.claude/subagents` にコピーされる
- [x] 同期元が存在しない場合は警告のみ（exit code に影響しない）
- [x] 既存の CLAUDE.md / vdev-flow.md 同期が回帰していない
- [x] `~/.vdev/CLAUDE.md` および `~/.vdev/vdev-flow.md` の symlink が改修前と同一
- [x] docs を削らず追記で更新
- [x] テストが追加され `npm test` が通る
- [x] **差分検出と --force の整合が取れている**（NEEDS_CHANGES 対応）
- [x] **ops.md と CLI 出力が整合している**（NEEDS_CHANGES 対応）

---

## 実装詳細

### ディレクトリ同期の仕様（修正後）

CLAUDE.md / vdev-flow.md と同じポリシーに統一：

| 状態 | force=false | force=true |
|------|-------------|------------|
| 同期元なし | 警告のみ、written=false | 警告のみ、written=false |
| 同期先なし | 新規作成、written=true | 新規作成、written=true |
| 差分なし | 何もしない、written=false | 何もしない、written=false |
| 差分あり | 警告のみ、written=false | 上書き、written=true |

### 差分検出の実装

`directoriesDiffer(srcDir, destDir)` 関数で再帰的にディレクトリを比較：
- ファイルリストが異なる場合 → 差分あり
- ファイル内容が異なる場合 → 差分あり
- サブディレクトリも再帰的に比較

### 成功判定の互換維持

- exit code は CLAUDE.md の同期結果のみで判定
- vdev-flow.md, .claude/commands, .claude/subagents の結果は exit code に影響しない
- これらは警告として stderr に出力

---

## Risks

- なし

---

## 残課題

- なし
