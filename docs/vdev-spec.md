# vdev CLI 仕様書

version: 1.0.0

## 1. 概要

vdev は計画駆動開発のための CLI ツールである。計画（plan）の作成・レビュー・承認フローを管理し、承認された計画のみ実装を許可する gate 機構を提供する。

本仕様書は vdev の唯一の正とする。

---

## 2. Core Concepts

### 2.1 Topic
- Topic は 1つの設計スレッド単位を表す
- Topic は `docs/plans/YYYY-MM-DD-slug/` ディレクトリで表現される

### 2.2 Source of Truth
- 人間向け成果物：`instruction.md`, `plan.md`, `review.md`
- 機械向け状態：`meta.json`
- フローの状態判定は **meta.json を唯一の正**とする

---

## 3. ディレクトリ構造

```
<git-root>/
└── docs/
    └── plans/
        └── <topic>/
            ├── meta.json        # メタデータ（状態・ハッシュ）
            ├── instruction.md   # 指示書
            ├── plan.md          # 計画書
            └── review.md        # レビュー結果
```

---

## 4. Topic Slug Rules

### 4.1 命名規則
- 形式: `YYYY-MM-DD-<slug>`
- 日付: JST 基準

### 4.2 Allowed Characters
- a-z（小文字のみ）
- 0-9
- `-`（ハイフン）

### 4.3 Normalization Rules
1. 大文字 → 小文字
2. 特殊文字・スペース → ハイフン
3. 連続ハイフン → 単一ハイフン
4. 先頭・末尾のハイフン → 削除
5. 最大長: 48文字
6. 空文字列 → `untitled`

### 4.4 Collision Handling
- 同日同slugが存在する場合はエラー

---

## 5. meta.json Schema

### 5.1 Schema Version
```json
{
  "schemaVersion": 1
}
```

### 5.2 完全スキーマ

```json
{
  "schemaVersion": 1,
  "topic": "2026-01-19-auth-refresh",
  "title": "Auth Refresh",
  "status": "NEEDS_CHANGES",
  "paths": {
    "instruction": "instruction.md",
    "plan": "plan.md",
    "review": "review.md"
  },
  "hashes": {
    "planSha256": "abc123...",
    "reviewSha256": "def456..."
  },
  "timestamps": {
    "createdAt": "2026-01-19T10:00:00+09:00",
    "updatedAt": "2026-01-19T10:30:00+09:00"
  }
}
```

### 5.3 フィールド説明

| フィールド | 型 | 説明 |
|-----------|-----|------|
| schemaVersion | number | スキーマバージョン（固定: 1） |
| topic | string | トピック識別子 |
| title | string | 表示用タイトル |
| status | string | 現在の状態 |
| paths.* | string | 各ファイルの相対パス |
| hashes.planSha256 | string | plan.md の SHA256 ハッシュ |
| hashes.reviewSha256 | string | review.md の SHA256 ハッシュ |
| timestamps.createdAt | string | 作成日時（JST ISO 8601） |
| timestamps.updatedAt | string | 更新日時（JST ISO 8601） |

### 5.4 Status Enum

| 値 | 説明 |
|----|------|
| NEEDS_INSTRUCTION | instruction.md 待ち |
| NEEDS_PLAN | plan.md 待ち |
| NEEDS_REVIEW | review.md 待ち |
| NEEDS_CHANGES | 修正要求あり |
| APPROVED | 承認済み |
| REJECTED | 却下 |

**重要:** instruction hash は管理しない（gate 判定に含めない）

---

## 6. Exit Code 一覧

| Code | 状態 | 説明 |
|------|------|------|
| 0 | APPROVED | 承認済み、実装可能 |
| 10 | NEEDS_INSTRUCTION | instruction.md なし |
| 11 | NEEDS_PLAN | plan.md なし |
| 12 | NEEDS_REVIEW | review.md なし |
| 13 | NEEDS_CHANGES | 修正要求あり |
| 14 | REJECTED | 計画却下 |
| 20 | BROKEN_STATE | meta.json 不正またはハッシュ不整合 |

---

## 7. Gate Decision Table

優先度順に評価し、最初に該当した条件で判定を確定する。

| 優先度 | 条件 | 判定状態 | Exit Code |
|--------|------|----------|-----------|
| 1 | meta.json 不正/パース失敗 | BROKEN_STATE | 20 |
| 2 | status=APPROVED/REJECTED かつ hash 不一致 | BROKEN_STATE | 20 |
| 3 | instruction.md なし | NEEDS_INSTRUCTION | 10 |
| 4 | plan.md なし | NEEDS_PLAN | 11 |
| 5 | review.md なし | NEEDS_REVIEW | 12 |
| 6 | status=NEEDS_CHANGES | NEEDS_CHANGES | 13 |
| 7 | status=REJECTED | REJECTED | 14 |
| 8 | status=APPROVED かつ hash 一致 | APPROVED | 0 |

### hash 一致条件

```
meta.hashes.planSha256 == SHA256(plan.md) AND
meta.hashes.reviewSha256 == SHA256(review.md)
```

---

## 8. Commands

### 8.1 vdev new

新しい計画トピックを作成する。

```bash
vdev new <name>
```

**Input:** name（任意文字列）

**Output:**
```
REPO=<repo>\tCREATED\t<topic>\t<path>
```

**動作:**
1. `<name>` を slug 化
2. 今日の日付（JST）をプレフィックスに付与
3. `docs/plans/<topic>/` ディレクトリを作成
4. `meta.json` を初期状態で作成

**初期状態:**
- status: `NEEDS_INSTRUCTION`
- hashes: 空

**Exit Codes:**
- 0: 成功
- 1: エラー（既存 topic 等）

---

### 8.2 vdev instruction

instruction.md を保存する。

```bash
echo "..." | vdev instruction <topic> --stdin
```

**Input:** stdin（instruction 内容）

**Output:**
```
REPO=<repo>\tINSTRUCTION_SAVED\t<topic>
```

**動作:**
1. stdin からコンテンツを読み取り
2. CRLF → LF に正規化
3. `instruction.md` として保存
4. status が `NEEDS_INSTRUCTION` の場合、`NEEDS_PLAN` に更新
5. `meta.timestamps.updatedAt` を更新

**Exit Codes:**
- 0: 成功
- 1: エラー

---

### 8.3 vdev plan

plan.md を保存する。

```bash
cat plan.md | vdev plan <topic> --stdin
```

**Input:** stdin（plan 内容）

**Output:**
```
REPO=<repo>\tPLAN_SAVED\t<topic>
```

**動作:**
1. stdin からコンテンツを読み取り
2. CRLF → LF に正規化
3. `plan.md` として保存
4. SHA256 ハッシュを計算し `meta.hashes.planSha256` に保存
5. **status を `NEEDS_CHANGES` に強制変更**（既存の承認を無効化）
6. `meta.hashes.reviewSha256` をクリア
7. `meta.timestamps.updatedAt` を更新

**重要:** plan 保存は常に承認状態を無効化する。再承認が必要。

**Exit Codes:**
- 0: 成功
- 1: エラー

---

### 8.4 vdev review

review.md を保存する。

```bash
echo "Status: APPROVED" | vdev review <topic> --stdin
```

**Input:** stdin（review 内容）

**Output:**
```
REPO=<repo>\tREVIEW_SAVED\t<topic>\t<extracted-status>
```

**動作:**
1. stdin からコンテンツを読み取り
2. CRLF → LF に正規化
3. `review.md` として保存
4. コンテンツから `Status:` 行を抽出
5. 抽出成功時: status を抽出値に設定
6. 抽出失敗時: status を `NEEDS_CHANGES` に設定
7. 両ファイルの SHA256 ハッシュを計算し保存
8. `meta.timestamps.updatedAt` を更新

**Status 抽出パターン:**
```
^Status:\s*(APPROVED|REJECTED|NEEDS_CHANGES)\s*$
```
（大文字小文字を区別しない）

**Exit Codes:**
- 0: 成功
- 1: エラー

---

### 8.5 vdev gate

計画の gate 状態を判定する。

```bash
vdev gate <topic>
```

**Output:**
```
REPO=<repo>\t<status>\t<topic>\t<message>
```

**動作:** Gate 判定表に基づき状態を判定し、対応する exit code で終了。

**Exit Codes:** セクション6参照

---

### 8.6 vdev run

実装実行の許可を確認する。

```bash
vdev run <topic>
```

**Output:**
```
REPO=<repo>\tRUN_ALLOWED\t<topic>     # APPROVED時
REPO=<repo>\tRUN_BLOCKED\t<topic>\t<status>  # それ以外
```

**Exit Codes:** gate と同一

---

### 8.7 vdev ls

全計画をリスト表示する。

```bash
vdev ls
```

**Output:**
```
REPO=<repo>\t<topic>\t<status>\t<title>\t<updatedAt>
```

**ソート:** updatedAt 降順

**Broken Topic:** status に `BROKEN_STATE` を表示

---

## 9. 出力フォーマット

### 9.1 REPO プレフィックス仕様

全 stdout 出力に共通プレフィックスを付与する。

```
REPO=<repo-name>\t<command-output>
```

- `<repo-name>`: git リポジトリ名（`git rev-parse --show-toplevel` の basename）
- git リポジトリ外の場合: `-`
- タブ区切り（`\t`）

### 9.2 stderr 出力

stderr には REPO プレフィックスを付与しない（視認性確保）。

```
ERROR: <message>
```

---

## 10. stdin 処理仕様

### 10.1 LF 正規化

全 stdin 入力に対して CRLF → LF 変換を適用する。

```javascript
input.replace(/\r\n/g, '\n')
```

### 10.2 ハッシュ計算

正規化後のコンテンツに対して SHA256 ハッシュを計算する。

### 10.3 updatedAt 更新

instruction/plan/review 保存時に `meta.timestamps.updatedAt` を現在時刻（JST ISO 8601）で更新する。

---

## 11. Invariants（不変条件）

1. plan.md 更新時は必ず status を NEEDS_CHANGES に戻す
2. APPROVED/REJECTED は plan/review hash 整合が必須
3. instruction.md は gate 承認条件に含めない（ファイル存在のみ確認）
4. 全ての日時は JST（+09:00）で記録される

---

## 12. Non-Goals

- LLM API 呼び出しの内包
- 会話ログの保存
- Git 操作の自動実行
