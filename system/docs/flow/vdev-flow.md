# vdev Flow Specification (SoT)

本ドキュメントは、vdev フローの正式仕様（SoT）である。

---

## 1. Overview

### 1.1 What is “vdev”?
vdev は、ソフトウェア開発を **成果物（ドキュメント）** と **状態遷移（ゲート）** によって管理する開発フローである。  
開発は「何を作るか（instruction）」「どう作るか（plan）」「設計の承認（design review）」「実装（implementation）」「実装の承認（implementation review）」という成果物を順に作成し、各ゲート条件を満たすことで次の状態へ進む。

vdev の狙いは、人間の関与を意図・判断レベルに限定し、  
計画・実装・レビューといった実行フェーズを AI に委譲することで、  
開発における人間の労力を最小化することである。

このために vdev は、instruction を起点とした自律的なオーケストレーションと、  
成果物および状態遷移による管理を採用し、  
個人開発からエンタープライズ開発まで一貫して適用可能な  
スケーラブルなバイブコーディングの開発フローを提供する。

### 1.2 Key Ideas（本 SoT の中核）

- **Lifecycle-driven Development**
  - vdev は、第 2 章で定義される状態管理・ライフサイクルに従って開発フローを進める。
  - 開発の進行は人の裁量ではなく、成果物とゲートによって管理される。

- **Instruction-driven Autonomous Orchestration**
  - 人間（または ChatGPT）が instruction を作成し、意図と制約を定義する。
  - その instruction を起点に、Claude Code が人格を切り替えながら、
    plan 作成・実装・レビューを自律的にオーケストレーションする。

---

## 2. The vdev Lifecycle（仕様としての全体フロー）

vdev は以下のステージとゲートによって状態遷移する。

### Stage: Instruction
- 目的：開発の意図・制約・完了条件を定義する
- 出力：Instruction 成果物
- 次状態：Plan

### Stage: Plan
- 目的：Instruction を実行可能な計画に落とす
- 出力：Plan 成果物
- 次状態：Design Review

### Gate: Design Review
- 判定結果：
  - `DESIGN_APPROVED`：Implementation へ進む
  - `NEEDS_CHANGES`：Plan へ戻る

### Stage: Implementation
- 目的：Plan に基づき実装を行う
- 出力：Implementation 成果物
- 次状態：Implementation Review

### Gate: Implementation Review
- 判定結果：
  - `DONE`：Topic 完了
  - `NEEDS_CHANGES`：Implementation へ戻る

### Review and Attempt Policy

レビューは vdev の状態遷移を担う正式な判断行為であり、  
その判断結果は **Attempt（判断履歴）** として保存される。

- Attempt はレビューごとに新規作成され、上書きしてはならない
- Attempt 自体は状態ではなく、ゲート判定の **入力** として扱われる
- ゲートは常に **最新の Attempt** のみを解釈し、状態を決定する

---

## 3. Roles and Responsibilities

本フローにおける Implementer および Reviewer は、いずれも Claude Code が担う。  
Human は判断責務のみを持ち、Claude Code の役割を代行しない。

### 3.1 Human (Product Owner)
- 開発の目的・優先順位・制約（スコープ / 期限 / リスク）を決定する
- Instruction の内容と品質に責任を持つ（意図・DoD・Verify・Rollback・リスク）
- 原則として、日々の計画・実装・レビュー判断には介入しない
- 高リスク（R3）においてのみ、最終的な承認および実行判断に責任を持つ

### 3.2 Implementer (Implementation Agent / Claude Code)
- 責務：
  - Instruction に基づき、計画および実装を作成・更新する
  - 必要なテストおよび検証を実施する
- 必須：
  - Instruction・計画・レビュー指摘から逸脱しない
- 禁止：
  - レビュー判断を行わない
  - 承認・差戻し等のステータス判定を行わない
  - 判断履歴（Attempt）を作成しない

### 3.3 Reviewer (Review Agent / Claude Code)
- 責務：
  - 計画および実装の内容をレビューし、判断を行う
  - レビュー結果を判断履歴として記録し、ゲート判定を実行する
- 必須：
  - 変更内容・影響範囲・検証結果を確認し、判断根拠を残す
- 原則：
  - 実装を直接変更しない

---

## 4. Risk Policy

### 4.1 Risk Levels
- **R1（低）**：内部リファクタ、型、テスト、内部品質改善
- **R2（中）**：外部 I/O、境界仕様、重要ロジック、データ契約
- **R3（高）**：破壊的操作、課金・支払い、権限、データ消失・移行、不可逆副作用

---

## 5. Operating Loop（自律運用手順）

1. **Human**：Instruction を確定する（意図、リスク、DoD / Verify / Rollback）
2. **Implementer（Claude Code）**：Plan を作成する
3. **Reviewer（Claude Code）**：Plan をレビューし、Design Review のゲート判定を行う
4. **Implementer（Claude Code）**：実装およびテストを実施する
5. **Reviewer（Claude Code）**：Implementation Review を実施し、ゲート判定を行う
6. **Human（R3 のみ）**：最終的な承認および実行判断を行う
7. 差戻しが発生した場合、該当ステージへ戻り、Attempt を積み上げて再実行する
