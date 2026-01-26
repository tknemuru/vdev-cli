# Implementation Report: ops.md / vdev-cli-cheatsheet.md 追従改訂

## 概要

vdev-spec v3.0.0 の世界観に合わせて、ops.md と vdev-cli-cheatsheet.md（正本）を追従改訂した。

## 変更ファイル一覧

| ファイル | パス | 変更内容 |
|---------|------|---------|
| ops.md | docs/ops.md（本リポジトリ） | v3 追従改訂 |
| vdev-cli-cheatsheet.md | ~/projects/ai-resources/vibe-coding-partner/knowledges/vdev-cli-cheatsheet.md | v3 宣言追加 |

**.claude 配下は変更なし**（重要制約を遵守）

## 反映した改訂内容

### ops.md

1. **タイトル更新**: v2.0 → v3.0
2. **セクション 2.8（DONE）**: ハッシュ整合必須の記述を削除、「完了状態（読み取り専用）」に簡略化
3. **セクション 2.10（BROKEN_STATE）**: 原因を「meta.json パース失敗」「構造破損」に限定
4. **セクション 3（差戻し時の挙動）**: v3 追従版に更新、「正本 md 更新 → gate 確認」中心に記述
5. **セクション 4.1**: 「手動編集禁止」→「正本と編集ポリシー（v3 追従）」に置換

### vdev-cli-cheatsheet.md（正本）

1. **冒頭に v3.0.0 追従メモを追加**:
   - 正本は docs/plans/<topic>/ 配下の md
   - .claude 配下はコピーであり修正禁止
   - vdev サブコマンドは任意の補助
   - gate は状態確認の入口
   - Status 行規約外は COMMAND_ERROR（exit 1）

## Verify 実行結果

### 1. ops.md: 手動編集禁止記述の除去確認
```bash
$ grep -n "手動編集禁止" docs/ops.md
Not found (expected)
```
**exit code: 1（該当なし）** - PASS

### 2. ops.md: v3 追従の正本宣言確認
```bash
$ grep -n "Canonical\|正本" docs/ops.md
185:2. plan.md（正本）を修正する
193:2. 実装を修正し、impl.md（正本）を更新する
205:### 4.1 正本と編集ポリシー（v3 追従）
207:- docs/plans/<topic>/ 配下の md は Canonical（正本）であり、直接編集してよい
```
**exit code: 0** - PASS

### 3. ops.md: ハッシュ整合必須の除去確認
```bash
$ grep -n "ハッシュ整合が必須\|ハッシュ不整合.*BROKEN" docs/ops.md
Not found (expected)
```
**exit code: 1（該当なし）** - PASS

### 4. cheatsheet（正本）: v3 追従メモ確認
```bash
$ grep -n "v3.0.0\|正本" ~/projects/ai-resources/vibe-coding-partner/knowledges/vdev-cli-cheatsheet.md
8:## v3.0.0 追従メモ
10:- 正本は docs/plans/<topic>/ 配下の md である
```
**exit code: 0** - PASS

### 5. .claude 配下に差分がないことの確認
```bash
$ git diff --name-only .claude/
(no output)
```
**exit code: 0（差分なし）** - PASS

## DoD 充足確認

| DoD 項目 | 状態 |
|---------|------|
| 修正はすべて正本ファイルに対して行われている | PASS |
| .claude 配下ファイルに差分が存在しない | PASS |
| ops.md が vdev-spec v3.0.0 と整合している | PASS |
| vdev-cli-cheatsheet.md（正本）が vdev-spec v3.0.0 と整合している | PASS |

## ブランチ情報

- 作業ブランチ: `feature/2026-01-26-ops-cheatsheet-v3-reconcile-docs`

## 注意事項

- ai-resources リポジトリの変更は本リポジトリとは別にコミット・push が必要
- vdev sync を実行すると .claude 配下に反映される
