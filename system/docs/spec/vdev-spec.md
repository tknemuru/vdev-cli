# vdev CLI 仕様書

version: 3.0.0

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

### 2.2 Source of Truth（v3.0 改訂）

vdev におけるフロー状態の正（Canonical）は、以下の正本ファイル群から導出される。

- instruction.md
- plan.md
- design-review.md
- impl.md
- impl-review.md

meta.json は、これら正本ファイル群から導出された状態・メタデータを
キャッシュとして保持する派生物であり、唯一の正ではない。

vdev gate は、正本ファイル群を読み取り、
現在の状態を導出し、必要に応じて meta.json を同期更新する。

### 2.3 meta.json の位置づけ（v3.0 新設）

meta.json は以下の目的のための派生キャッシュである。

- vdev gate 実行結果の保存
- 状態表示の高速化
- 監査・履歴補助（timestamps / hashes）

meta.json の内容が正本ファイル群と不整合であっても、
それ自体はエラーとはならない。

vdev gate は、正本ファイル群から導出した結果をもって
meta.json を上書き同期してよい

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
| hashes.*Sha256 | string \| null | 各 md の SHA256 ハッシュ（監査用） |
| timestamps.createdAt | string | 作成日時（JST ISO 8601） |
| timestamps.updatedAt | string | 更新日時（JST ISO 8601） |

### 5.4 hashes フィールドの扱い（v3.0 改訂）

hashes.*Sha256 は、正本ファイルの内容を記録するための
監査・差分検知用メタデータである。

hash 不一致はエラー条件ではない。

vdev gate 実行時、存在する正本ファイルについては
SHA256 を再計算し、meta.json の hashes を同期更新してよい。

DONE / REJECTED 状態であっても例外は設けない。

---

## 6. Status Enum（v3.0）

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
| BROKEN_STATE | meta.json パース不能または構造破損（致命的破損のみ） |

---

### 6.1 BROKEN_STATE（v3.0 改訂）

BROKEN_STATE は、状態導出や同期が不可能な致命的破損を表す。

以下の場合にのみ BROKEN_STATE とする。

- meta.json がパース不能であり、再生成もできない
- トピックディレクトリ構造が破損している等、復旧不能な状態

正本ファイルと meta.json の不整合、
または hash 不一致のみを理由に BROKEN_STATE としてはならない。

---

## 7. Exit Code（v3.0）

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
| 20 | BROKEN_STATE | 致命的破損（パース不能・構造破損） |
| 1 | COMMAND_ERROR | 前提条件違反 / 入力不正 / Status 行不正 / 例外 |

---

## 8. Gate Decision Logic（v3.0 改訂）

vdev gate は、以下の手順で判定を行う。

1. meta.json がパース不能な場合は BROKEN_STATE（exit 20）
2. 正本ファイルの存在を確認し、欠落に応じて NEEDS_* を導出
3. review ファイルが存在する場合、Status 行を解釈して状態を導出
4. Status 行が規約外の場合は COMMAND_ERROR（exit 1）
5. 導出した状態を結果として返し、可能な場合 meta.json を同期更新する

### 8.1 Gate Decision Table（v3.0）

優先度順に評価し、最初に該当した条件で判定を確定する。

| 優先度 | 条件 | 判定状態 | Exit Code |
|--------|------|----------|-----------|
| 1 | meta.json パース不能 | BROKEN_STATE | 20 |
| 2 | instruction.md なし | NEEDS_INSTRUCTION | 10 |
| 3 | plan.md なし | NEEDS_PLAN | 11 |
| 4 | design-review.md なし | NEEDS_DESIGN_REVIEW | 12 |
| 5 | design-review.md の Status 行が規約外 | COMMAND_ERROR | 1 |
| 6 | design-review.md に Status: REJECTED | REJECTED | 17 |
| 7 | design-review.md に Status: NEEDS_CHANGES | NEEDS_PLAN | 11 |
| 8 | design-review.md に Status: DESIGN_APPROVED かつ status=IMPLEMENTING | IMPLEMENTING | 14 |
| 9 | design-review.md に Status: DESIGN_APPROVED かつ status≠IMPLEMENTING | DESIGN_APPROVED | 13 |
| 10 | impl.md なし（status=IMPLEMENTING） | NEEDS_IMPL_REPORT | 15 |
| 11 | impl-review.md なし | NEEDS_IMPL_REVIEW | 16 |
| 12 | impl-review.md の Status 行が規約外 | COMMAND_ERROR | 1 |
| 13 | impl-review.md に Status: NEEDS_CHANGES | IMPLEMENTING | 14 |
| 14 | impl-review.md に Status: DONE | DONE | 0 |

### 8.2 Status 行の解釈とエラー（v3.0 新設）

design-review.md および impl-review.md に記載された Status 行は、
vdev が状態を導出するための入力である。

Status 行が規定の値・形式に一致せず、
状態を導出できない場合は以下とする。

- vdev gate は COMMAND_ERROR（exit code: 1）を返す
- この場合、状態遷移および meta.json 更新は行わない

### 8.3 NEEDS_CHANGES の扱い（v3.0 明文化）

- design-review.md に Status: NEEDS_CHANGES がある場合
  - 状態は NEEDS_PLAN に戻る

- impl-review.md に Status: NEEDS_CHANGES がある場合
  - 状態は IMPLEMENTING に戻る

---

## 9. Commands（v3.0）

### 9.1 vdev new

新しい計画トピックを作成する。

vdev new <name> [--force]

動作：
1. <name> を slug 化
2. 今日の日付（JST）をプレフィックスに付与
3. docs/plans/<topic>/ ディレクトリを作成
4. meta.json を初期状態で作成
5. ai-resources から repo の CLAUDE.md およびその他資産を同期（vdev sync と同等）
   - --force なし: 差分があれば同期のみ失敗（topic は作成済み）、exit 1
   - --force あり: 差分があっても上書き、exit 0
   - 同期元が存在しない場合: topic は作成済み、同期失敗、exit 1

初期状態：
- schemaVersion: 2
- status: NEEDS_INSTRUCTION
- hashes: 空

Exit Codes：
- 0: 成功
- 1: エラー（既存 topic、同期失敗等）

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

### 9.11 vdev sync

ai-resources から各種資産を repo に同期する。

vdev sync [--force]

動作：
1. ai-resources 配下の資産を読み取る
2. 自動生成ヘッダ付きで repo 用 CLAUDE.md を生成
3. 差分判定を行う（Last synced 行は比較対象から除外）

デフォルト挙動（--force なし）：
- 差分があれば stderr にエラーメッセージを出力し exit 1
- 上書きは行わない

--force 指定時：
- 差分があっても常に上書き
- exit 0

Exit Codes：
- 0: 成功
- 1: 差分検出（forceなし）またはエラー

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

## 12. Invariants（不変条件・v3.0 改訂）

1. plan 更新は必ず NEEDS_DESIGN_REVIEW に戻す（再設計レビュー必須）
2. 全ての日時は JST（+09:00）で記録される
3. 前提条件違反は状態遷移しない（COMMAND_ERROR）
4. 正本ファイル群が状態の正であり、meta.json は派生キャッシュである
5. vdev gate は正本から状態を導出し、meta.json を同期更新する

---

## 13. Non-Goals

- LLM API 呼び出しの内包
- 会話ログの保存
- Git 操作の自動実行

---

## 14. CLAUDE.md 管理方針（永続）

vdev は LLM 実行時の共通指示文として CLAUDE.md を利用する。

### 14.1 Source of Truth

- CLAUDE.md の唯一の正（Source of Truth）はモノリポ内 system/adapters/claude/CLAUDE.md に存在する。
- vdev sync により各リポジトリへ同期される。
- このファイルは vdev フロー全体に共通な方針のみを記載し、
  リポジトリ固有のルールは含めない。

### 14.2 配布・同期方針

- 各リポジトリのルートに配置される CLAUDE.md は、
  上記 Source of Truth の **同期コピー** として扱う。
- vdev は CLAUDE.md の内容解釈や編集を行わない。

### 14.3 設計原則

- CLAUDE.md は「コピーソース方式」を避けるため、
  単一正本を中心とした運用を前提とする。
- vdev-spec.md / ops.md の更新により CLAUDE.md の内容が変わることはあるが、
  各リポジトリ固有の判断で改変してはならない。
