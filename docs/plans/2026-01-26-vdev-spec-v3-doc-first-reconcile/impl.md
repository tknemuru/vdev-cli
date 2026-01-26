# Implementation Report: vdev-spec.md v3.0.0 改訂

## 概要

instruction.md に記載された 8 項目の改訂を vdev-spec.md に反映し、version 3.0.0 として確定した。

## 変更ファイル一覧

| ファイル | 変更内容 |
|---------|---------|
| docs/vdev-spec.md | v2.0.0 → v3.0.0 改訂（8 項目反映） |

## 反映した改訂内容

### 1. version 表記の更新
- 冒頭の `version: 2.0.0` → `version: 3.0.0` に変更

### 2. Source of Truth の再定義（2.2 完全置換）
- 旧 2.2 を削除し、正本ファイル群中心の定義に置換
- 「meta.json を唯一の正とする」記述を削除
- 「正本ファイル群から状態を導出」に変更

### 3. meta.json の位置づけ変更（2.3 新設）
- meta.json を「派生キャッシュ」として定義
- 不整合自体はエラーではないことを明記

### 4. hashes フィールドの扱い変更（5.4 新設）
- hash 不一致はエラー条件ではないことを明記
- vdev gate 実行時に SHA256 を再計算・同期更新することを明記
- DONE / REJECTED 状態でも例外なしを明記

### 5. BROKEN_STATE の再定義（6.1 新設）
- 「meta.json パース不能」「構造破損」に限定
- 「hash 不一致のみを理由に BROKEN_STATE としない」を明記

### 6. Status 行不正時の扱い（8.2 新設）
- Status 行が規定外の場合は COMMAND_ERROR（exit 1）を明記
- Exit Code 表にも反映

### 7. Gate Decision Logic の書き換え（8 全面改訂）
- 旧 Gate Decision Table を新ロジックに置換
- 優先度 2（hash 不一致 → BROKEN_STATE）を削除
- 優先度 11（hash 一致条件）を削除
- Status 行解釈による状態導出ロジックを追加

### 8. NEEDS_CHANGES の戻り先明文化（8.3 新設）
- design-review.md の NEEDS_CHANGES → NEEDS_PLAN
- impl-review.md の NEEDS_CHANGES → IMPLEMENTING

## Verify 実行結果

### 1. version 確認
```bash
$ grep -n "^version:" docs/vdev-spec.md
3:version: 3.0.0
```
**結果: PASS**（3.0.0 が設定されている）

### 2. 旧 SoT 記述の除去確認
```bash
$ grep -n "唯一の正" docs/vdev-spec.md
11:本仕様書は vdev の唯一の正とする。
32:キャッシュとして保持する派生物であり、唯一の正ではない。
547:- CLAUDE.md の唯一の正（Source of Truth）は ai-resources リポジトリ内に存在する。
```
**結果: PASS**
- 11 行目: vdev-spec.md 自体が SoT であるという記述（meta.json ではない）
- 32 行目: 「唯一の正ではない」という否定形（正しい）
- 547 行目: CLAUDE.md の SoT についての記述（meta.json ではない）

### 3. hash 不一致エラー記述の除去確認
```bash
$ grep -n "hash.*不一致.*BROKEN" docs/vdev-spec.md
177:または hash 不一致のみを理由に BROKEN_STATE としてはならない。
```
**結果: PASS**（「としてはならない」という禁止規定のみ）

### 4. COMMAND_ERROR の Status 行不正記述確認
```bash
$ grep -n "COMMAND_ERROR" docs/vdev-spec.md | head -5
195:| 1 | COMMAND_ERROR | 前提条件違反 / 入力不正 / Status 行不正 / 例外 |
206:4. Status 行が規約外の場合は COMMAND_ERROR（exit 1）
219:| 5 | design-review.md の Status 行が規約外 | COMMAND_ERROR | 1 |
226:| 12 | impl-review.md の Status 行が規約外 | COMMAND_ERROR | 1 |
238:- vdev gate は COMMAND_ERROR（exit code: 1）を返す
```
**結果: PASS**（Status 行不正時の扱いが明文化されている）

### 5. Gate Decision Table の改訂確認
```bash
$ grep -n "hash 不一致.*BROKEN_STATE" docs/vdev-spec.md
177:または hash 不一致のみを理由に BROKEN_STATE としてはならない。
$ grep -n "hash 一致" docs/vdev-spec.md
(no output)
```
**結果: PASS**
- 旧優先度 2（hash 不一致 → BROKEN_STATE）は禁止規定としてのみ存在
- 旧優先度 11（hash 一致条件）は削除済み

## DoD 充足確認

| DoD 項目 | 状態 |
|---------|------|
| vdev-spec.md に version 3.0.0 が明示されている | PASS |
| instruction.md に記載した全 8 項目の改訂内容が反映されている | PASS |
| 「meta.json が唯一の正」と読める記述が存在しない | PASS |
| 「DONE / REJECTED が終端固定」と誤解される記述が存在しない | PASS |
| Status 行不正時の COMMAND_ERROR が明文化されている | PASS |
| 本トピックが R3 である旨は instruction.md に既に明示されている | PASS |

## 注意事項

- 本トピックは **R3（高リスク）** である
- vdev-cli の実装は本トピック scope 外であり、後続トピックで追従改修が必要
- ops.md / cheatsheet の改訂も後続トピックで実施

## ブランチ情報

- 作業ブランチ: `feature/2026-01-26-vdev-spec-v3-doc-first-reconcile`
