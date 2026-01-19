# sync-claude-md 実装完了報告

## Summary

`vdev sync` コマンドの新設と `vdev new` への同期処理組み込みを実装した。
グローバル正本（`~/.vdev/CLAUDE.md`）を読み取り、repo の `CLAUDE.md` を自動生成ヘッダ付きで生成・同期する機能を提供する。

---

## Files Changed

| ファイル | 操作 | 説明 |
|----------|------|------|
| src/core/claudeMdSync.ts | 新規作成 | 同期ユーティリティ（コア機能） |
| src/commands/sync.ts | 新規作成 | vdev sync コマンド |
| src/commands/new.ts | 更新 | sync 処理の組み込み、force オプション追加 |
| src/cli.ts | 更新 | sync コマンド登録、new コマンドに --force オプション追加 |
| docs/vdev-spec.md | 追記 | 9.1 vdev new に同期処理追記、9.11 vdev sync 追加 |
| docs/ops.md | 追記 | セクション5に同期コマンドと vdev new 実行時の同期を追記 |
| test/sync.test.ts | 新規作成 | 15件のテストケース |

---

## Tests

```
 ✓ test/sync.test.ts  (15 tests) 62ms
 ✓ test/commands.test.ts  (21 tests) 2402ms
 ✓ test/gate.test.ts  (16 tests) 1210ms
 ✓ test/slug.test.ts  (9 tests) 2ms
 ✓ test/hashes.test.ts  (3 tests) 1ms
 ✓ test/normalize.test.ts  (3 tests) 1ms

 Test Files  6 passed (6)
      Tests  67 passed (67)
```

### 新規追加テストケース（test/sync.test.ts）

1. getGlobalClaudeMdPath returns correct path
2. readGlobalClaudeMd returns null when file does not exist
3. readGlobalClaudeMd returns content when file exists
4. renderRepoClaudeMd generates correct header
5. differs returns true when current is null
6. differs returns false when content is identical
7. **differs returns false when only Last synced differs**（Blocker対応）
8. differs returns true when body content differs
9. returns globalMissing when global CLAUDE.md does not exist
10. creates CLAUDE.md when repo has none
11. returns hasDiff=true, written=false when diff exists and force=false
12. overwrites when diff exists and force=true
13. **returns success with no write when content matches (Last synced only differs)**（Blocker対応）
14. creates topic even when sync fails (globalMissing)
15. creates topic and syncs CLAUDE.md when global exists

---

## Verify

```bash
# ビルド
npm run build  # ✓ 成功

# テスト
npm test  # ✓ 67件全てパス

# 手動検証: sync コマンド
./dist/cli.js sync --force
# REPO=vdev-cli	SYNCED	CLAUDE.md updated
```

---

## DoD 達成状況

- [x] `~/.vdev/CLAUDE.md` を正本として repo の `CLAUDE.md` を生成できる（自動生成ヘッダ付与）
- [x] `vdev sync` は差分時に停止し、確定メッセージを stderr に出す（exit=1）
- [x] `vdev sync --force` は常に上書き（exit=0）
- [x] `vdev new` は topic を必ず作り、内部で同期を試みる
- [x] `vdev new` は差分があると同期のみ失敗し exit=1（topic は作成済み）
- [x] `vdev new --force` は同期のみ force 扱いで上書きし exit=0
- [x] グローバル正本が存在しない場合、topic 作成は完了し同期のみ失敗（exit=1）
- [x] Last synced のみ異なる場合は差分なし扱い（テストで担保）
- [x] docs を削らず追記で更新
- [x] テストが追加され `npm test` が通る

---

## 実装詳細

### 差分判定仕様（Blocker対応）

`differs()` 関数は Last synced 行を正規化してから比較する：

```typescript
const LAST_SYNCED_PATTERN = /^<!-- Last synced: .* -->$/m;

function normalizeForComparison(content: string): string {
  return content.replace(LAST_SYNCED_PATTERN, '<!-- Last synced: NORMALIZED -->');
}
```

これにより、タイムスタンプのみ異なる場合は差分なしと判定される。

### repo_root の決定

plan.md の仕様通り、`process.cwd()` を使用（git root 探索は行わない）。

### 末尾改行の扱い

`renderRepoClaudeMd()` は globalBody の末尾改行をそのまま保持し、追加しない。

---

## Risks

- なし

---

## 残課題

- なし
