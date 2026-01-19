# vdev CLI 仕様書

version: 2.0.0

## 1. 概要

vdev は計画駆動開発のための CLI ツールである。
設計（plan）と実装（impl）の作成・レビュー・承認フローを単一の状態機械として管理し、
DONE 状態のみを「完了」として扱う。

本仕様書は vdev の唯一の正とする。

---

## 2. Core Concepts

### 2.1 Topic
- Topic は 1つの設計〜実装スレッド単位を表す
- Topic は `docs/plans/YYYY-MM-DD-slug/` ディレクトリで表現される

### 2.2 Source of Truth
- 人間向け成果物：
  - `instruction.md`, `plan.md`, `design-review.md`, `impl.md`, `impl-review.md`
- 機械向け状態：
  - `meta.json`
- フローの状態判定は meta.json を唯一の正とする

---

## 3. ディレクトリ構造

<git-root>/
└── docs/
    └── plans/
        └── <topic>/
            ├── meta.json
            ├── instruction.md
            ├── plan.md
            ├── design-review.md
            ├── impl.md
            └── impl-review.md

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

## 5. meta.json Schema（v2.0）

### 5.1 Schema Version
- schemaVersion は 2 とする

### 5.2 完全スキーマ（例）

{
  "schemaVersion": 2,
  "topic": "2026-01-19-auth-refresh",
  "title": "Auth Refresh",
  "status": "NEEDS_IMPL_REVIEW",
  "paths": {
    "instruction": "instruction.md",
    "plan": "plan.md",
    "designReview": "design-review.md",
    "impl": "impl.md",
    "implReview": "impl-review.md"
  },
  "hashes": {
    "planSha256": "abc...",
    "designReviewSha256": "def...",
    "implSha256": "ghi...",
    "implReviewSha256": "jkl..."
  },
  "timestamps": {
    "createdAt": "2026-01-19T10:00:00+09:00",
    "updatedAt": "2026-01-19T10:30:00+09:00"
  }
}

### 5.3 フィールド説明

| フィールド | 型 | 説明 |
|-----------|-----|------|
| schemaVersion | number | スキーマバージョン（固定: 2） |
| topic | string | トピック識別子 |
| title | string | 表示用タイトル |
| status | string | 現在の状態 |
| paths.* | string | 各ファイルの相対パス |
| hashes.*Sha256 | string | 各 md の SHA256 ハッシュ |
| timestamps.createdAt | string | 作成日時（JST ISO 8601） |
| timestamps.updatedAt | string | 更新日時（JST ISO 8601） |

---

## 6. Status Enum（v2.0）

| 値 | 説明 |
|----|------|
| NEEDS_INSTRUCTION | instruction.md 待ち |
| NEEDS_PLAN | plan.md 待ち |
| NEEDS_DESIGN_REVIEW | design-review.md 待ち |
| DESIGN_APPROVED | 設計承認済み（実装開始可能） |
| IMPLEMENTING | 実装中 |
| NEEDS_IMPL_REPORT | impl.md 待ち（実装完了報告待ち） |
| NEEDS_IMPL_REVIEW | impl-review.md 待ち |
| DONE | 実装レビュー承認済み（完了） |
| REJECTED | 設計却下 |
| BROKEN_STATE | meta.json 不正またはハッシュ不整合 |

---

## 7. Exit Code（v2.0）

| Code | 状態 | 説明 |
|------|------|------|
| 0 | DONE | 完了 |
| 10 | NEEDS_INSTRUCTION | instruction.md なし |
| 11 | NEEDS_PLAN | plan.md なし |
| 12 | NEEDS_DESIGN_REVIEW | design-review.md なし |
| 13 | DESIGN_APPROVED | 設計承認済み（実装開始可能） |
| 14 | IMPLEMENTING | 実装中 |
| 15 | NEEDS_IMPL_REPORT | impl.md なし |
| 16 | NEEDS_IMPL_REVIEW | impl-review.md なし |
| 17 | REJECTED | 設計却下 |
| 20 | BROKEN_STATE | 整合性エラー |
| 1 | COMMAND_ERROR | 前提条件違反 / 入力不正 / 例外 |

---

## 8. Gate Decision Table（v2.0）

優先度順に評価し、最初に該当した条件で判定を確定する。

| 優先度 | 条件 | 判定状態 | Exit Code |
|--------|------|----------|-----------|
| 1 | meta.json 不正/パース失敗 | BROKEN_STATE | 20 |
| 2 | status in (DONE, REJECTED) かつ hash 不一致 | BROKEN_STATE | 20 |
| 3 | instruction.md なし | NEEDS_INSTRUCTION | 10 |
| 4 | plan.md なし | NEEDS_PLAN | 11 |
| 5 | design-review.md なし | NEEDS_DESIGN_REVIEW | 12 |
| 6 | status=REJECTED | REJECTED | 17 |
| 7 | status=DESIGN_APPROVED | DESIGN_APPROVED | 13 |
| 8 | status=IMPLEMENTING かつ impl.md なし | NEEDS_IMPL_REPORT | 15 |
| 9 | status=IMPLEMENTING かつ impl.md あり かつ impl-review.md なし | NEEDS_IMPL_REVIEW | 16 |
| 10 | status=NEEDS_IMPL_REVIEW | NEEDS_IMPL_REVIEW | 16 |
| 11 | status=DONE かつ hash 一致 | DONE | 0 |
| 12 | その他 | BROKEN_STATE | 20 |

hash 一致条件：
- planSha256 == SHA256(plan.md)
- designReviewSha256 == SHA256(design-review.md)
- implSha256 == SHA256(impl.md)
- implReviewSha256 == SHA256(impl-review.md)

---

## 9. Commands（v2.0）

### 9.1 vdev new

新しい計画トピックを作成する。

vdev new <name>

動作：
1. <name> を slug 化
2. 今日の日付（JST）をプレフィックスに付与
3. docs/plans/<topic>/ ディレクトリを作成
4. meta.json を初期状態で作成

初期状態：
- schemaVersion: 2
- status: NEEDS_INSTRUCTION
- hashes: 空

Exit Codes：
- 0: 成功
- 1: エラー（既存 topic 等）

---

### 9.2 vdev instruction

instruction.md を保存する。

echo "..." | vdev instruction <topic> --stdin

前提条件：
- topic が存在すること（存在しない場合 COMMAND_ERROR(1)）

動作：
1. stdin からコンテンツを読み取り
2. CRLF → LF に正規化
3. instruction.md として保存
4. status が NEEDS_INSTRUCTION の場合、NEEDS_PLAN に更新
5. meta.timestamps.updatedAt を更新

Exit Codes：
- 0: 成功
- 1: エラー

---

### 9.3 vdev plan

plan.md を保存する（設計の正規手続き）。

cat plan.md | vdev plan <topic> --stdin

前提条件：
- instruction.md が存在すること（存在しない場合 COMMAND_ERROR(1)）

動作：
1. stdin 読み取り、CRLF→LF 正規化
2. plan.md 保存
3. planSha256 更新
4. designReviewSha256 をクリア
5. status を NEEDS_DESIGN_REVIEW に設定
6. updatedAt 更新

重要：
- plan 保存は常に再レビューを要求する（設計レビューを無効化する）

Exit Codes：
- 0: 成功
- 1: エラー

---

### 9.4 vdev review

design-review.md を保存する（設計レビュー）。

echo "Status: DESIGN_APPROVED" | vdev review <topic> --stdin

Status 抽出パターン：
^Status:\s*(DESIGN_APPROVED|REJECTED|NEEDS_CHANGES)\s*$

抽出値の扱い：
- DESIGN_APPROVED: status=DESIGN_APPROVED
- REJECTED: status=REJECTED
- NEEDS_CHANGES: status=NEEDS_PLAN（設計やり直し）

前提条件：
- plan.md が存在すること（無い場合 COMMAND_ERROR(1)）

動作：
1. stdin 正規化
2. design-review.md 保存
3. designReviewSha256 更新
4. status を抽出値に応じて更新
5. updatedAt 更新

Exit Codes：
- 0: 成功
- 1: エラー

---

### 9.5 vdev start

実装開始を宣言する。

vdev start <topic>

前提条件：
- status が DESIGN_APPROVED のみ許可（それ以外は COMMAND_ERROR(1)）

動作：
- status を IMPLEMENTING に更新
- updatedAt 更新

Exit Codes：
- 0: 成功
- 1: エラー

---

### 9.6 vdev impl

impl.md を保存する（Claude の実装完了報告）。

cat impl.md | vdev impl <topic> --stdin

前提条件：
- status が IMPLEMENTING のみ許可（それ以外は COMMAND_ERROR(1)）

動作：
1. stdin 正規化
2. impl.md 保存
3. implSha256 更新
4. implReviewSha256 をクリア
5. status を NEEDS_IMPL_REVIEW に設定
6. updatedAt 更新

Exit Codes：
- 0: 成功
- 1: エラー

---

### 9.7 vdev impl-review

impl-review.md を保存する（実装レビュー）。

echo "Status: DONE" | vdev impl-review <topic> --stdin

Status 抽出パターン：
^Status:\s*(DONE|NEEDS_CHANGES)\s*$

抽出値の扱い：
- DONE: status=DONE
- NEEDS_CHANGES: status=IMPLEMENTING（実装修正へ戻す）

前提条件：
- impl.md が存在すること（無い場合 COMMAND_ERROR(1)）

動作：
1. stdin 正規化
2. impl-review.md 保存
3. implReviewSha256 更新
4. status を抽出値に応じて更新
5. updatedAt 更新

Exit Codes：
- 0: 成功
- 1: エラー

---

### 9.8 vdev gate

計画の gate 状態を判定する。

vdev gate <topic>

Output：
REPO=<repo>\t<status>\t<topic>\t<message>

動作：
- Gate 判定表に基づき状態を判定し、対応する exit code で終了する

Exit Codes：
- セクション7参照

---

### 9.9 vdev run（廃止）

v2.0 では vdev run を廃止する。
実装開始は vdev start を用いる。

---

### 9.10 vdev ls

全計画をリスト表示する。

vdev ls

Output：
REPO=<repo>\t<topic>\t<status>\t<title>\t<updatedAt>

ソート：
- updatedAt 降順

Broken Topic：
- status に BROKEN_STATE を表示する

---

## 10. 出力フォーマット

### 10.1 REPO プレフィックス仕様

全 stdout 出力に共通プレフィックスを付与する。

REPO=<repo-name>\t<command-output>

- <repo-name>: git リポジトリ名（git rev-parse --show-toplevel の basename）
- git リポジトリ外の場合: -
- タブ区切り（\t）

### 10.2 stderr 出力

stderr には REPO プレフィックスを付与しない。

ERROR: <message>

---

## 11. stdin 処理仕様

- 全 stdin 入力は保存時に CRLF → LF に変換される
- 正規化後のコンテンツで SHA256 を計算する
- instruction/plan/design-review/impl/impl-review 保存時に updatedAt を JST ISO 8601 で更新する

---

## 12. Invariants（不変条件）

1. plan 更新は必ず NEEDS_DESIGN_REVIEW に戻す（再設計レビュー必須）
2. DESIGN_APPROVED は design-review hash 整合が必須
3. DONE は impl-review hash 整合が必須
4. 全ての日時は JST（+09:00）で記録される
5. 前提条件違反は状態遷移しない（COMMAND_ERROR）

---

## 13. Non-Goals

- LLM API 呼び出しの内包
- 会話ログの保存
- Git 操作の自動実行
