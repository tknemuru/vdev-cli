# Implementation Report: ~/.vdev 参照の削除

## 概要

docs/vdev-spec.md から廃止済みの `~/.vdev` 運用記述を削除し、現行の ai-resources 参照に修正した。

## 変更ファイル一覧

| ファイル | 変更内容 |
|---------|----------|
| docs/vdev-spec.md | `~/.vdev` 参照を ai-resources 参照に変更（3 箇所） |

## 変更詳細

### 1. セクション 9.1 vdev new（行 190）

**Before**:
```
5. グローバル正本（~/.vdev/CLAUDE.md）から repo の CLAUDE.md を同期
   ...
   - グローバル正本が存在しない場合: topic は作成済み、同期失敗、exit 1
```

**After**:
```
5. ai-resources から repo の CLAUDE.md およびその他資産を同期（vdev sync と同等）
   ...
   - 同期元が存在しない場合: topic は作成済み、同期失敗、exit 1
```

### 2. セクション 9.11 vdev sync（行 396-405）

**Before**:
```
### 9.11 vdev sync

repo の CLAUDE.md をグローバル正本に同期する。

vdev sync [--force]

動作：
1. ~/.vdev/CLAUDE.md（グローバル正本）を読み取る
```

**After**:
```
### 9.11 vdev sync

ai-resources から各種資産を repo に同期する。

vdev sync [--force]

動作：
1. ai-resources 配下の資産を読み取る
```

### 3. セクション 14.1 Source of Truth（行 471-478）

**Before**:
```
### 14.1 Source of Truth

- CLAUDE.md の唯一の正（Source of Truth）は以下とする：

  ~/.vdev/CLAUDE.md

- このファイルは vdev フロー全体に共通な方針のみを記載し、
  リポジトリ固有のルールは含めない。
```

**After**:
```
### 14.1 Source of Truth

- CLAUDE.md の唯一の正（Source of Truth）は ai-resources リポジトリ内に存在する。
- vdev sync により各リポジトリへ同期される。
- このファイルは vdev フロー全体に共通な方針のみを記載し、
  リポジトリ固有のルールは含めない。
```

## Verify 実行結果

### 1. ~/.vdev 参照の残存確認

```bash
$ grep -r "~/.vdev" docs/vdev-spec.md docs/ops.md docs/rollback.md
Exit code: 1
```

**結果**: 出力なし（マッチなし）= 残存ゼロ ✅

### 2. symlink 参照の残存確認

```bash
$ grep -r "symlink" docs/vdev-spec.md docs/ops.md docs/rollback.md
Exit code: 1
```

**結果**: 出力なし（マッチなし）= 残存ゼロ ✅

### 3. 目視確認

修正後の各セクションを確認し、文脈が自然で整合性が保たれていることを確認。

## DoD 達成状況

| DoD 項目 | 状態 | 根拠 |
|---------|------|------|
| vdev-spec.md から ~/.vdev 参照削除 | ✅ | grep 結果（exit 1 = マッチなし） |
| symlink 前提の説明削除 | ✅ | grep 結果（exit 1 = マッチなし） |
| 読者の誤誘導防止 | ✅ | ai-resources 参照に統一 |
| 文脈の自然さ・整合性 | ✅ | 目視確認 |

## 残課題

なし

## 備考

- R3（高リスク）トピックのため、最終 merge は Human が実施する
- docs/plans/ 配下の過去トピック成果物は変更していない（履歴として保持）
