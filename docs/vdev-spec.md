# vdev Specification

## 1. Overview
vdev は、Vibe Coding における設計〜実装GOまでのフローを
Git 上の状態として管理・遷移させるための自動化レイヤである。

本仕様書は、vdev の唯一の正とする。

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

## 3. Directory Structure

docs/plans/
  YYYY-MM-DD-slug/
    instruction.md
    plan.md
    review.md
    meta.json

---

## 4. Topic Slug Rules

### 4.1 Allowed Characters
- a-z
- 0-9
- '-'

### 4.2 Normalization Rules
（ここに slug 正規化ルールをそのまま転記）

### 4.3 Collision Handling
- 同日同slugが存在する場合は `-2`, `-3` を付与する

---

## 5. meta.json Schema

### 5.1 Schema Version
- schemaVersion: 1

### 5.2 Fields
（確定した meta.json スキーマをそのまま記載）

### 5.3 Status Enum
- NEEDS_CHANGES
- APPROVED
- REJECTED

---

## 6. State Machine

### 6.1 File-based State
- instruction.md の有無
- plan.md の有無
- review.md の有無

### 6.2 Status-based State
- meta.status による状態

---

## 7. Commands

### 7.1 vdev new
- Purpose
- Input / Output
- Validation
- Exit Codes

### 7.2 vdev plan --stdin
- Purpose
- Preconditions
- meta.json Update Rules
- Exit Codes

### 7.3 vdev review --stdin
- Status Extraction Rules
- Normalization Rules
- meta.json Update Rules
- Exit Codes

### 7.4 vdev gate
- Decision Table
- Output Format
- Exit Codes

### 7.5 vdev ls
- Sorting
- Display Columns
- Broken Topic Handling

---

## 8. Gate Decision Table

（今回確定した判定表をそのまま転記）

---

## 9. Invariants
- plan.md 更新時は必ず status を NEEDS_CHANGES に戻す
- APPROVED/REJECTED は plan/review hash 整合が必須
- instruction.md は承認条件に含めない

---

## 10. Non-Goals
- LLM API 呼び出しの内包
- 会話ログの保存
- Git 操作の自動実行

