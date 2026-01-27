# vdev Flow Specification (SoT)

本ドキュメントは、vdevフローの正式仕様（SoT）である。

---

## 0. Overview

### 0.1 What is “vdev”?
vdev は、ソフトウェア開発を **成果物（ドキュメント）** と **状態遷移（ゲート）** によって管理する開発フローである。  
開発は「何を作るか（instruction）」「どう作るか（plan）」「設計の承認（design-review）」「実装（impl）」「実装の承認（impl-review）」という成果物を順に作成し、各ゲート条件を満たすことで次の状態へ進む。

vdev の狙いは、口頭合意や暗黙知に依存せず、**再現可能な品質判断**を成果物として残しながら開発を進めることである。

> 本ドキュメントは vdev の運用仕様（SoT）であり、特定のツール実装（CLI）の仕様ではない。ツールは本SoTに準拠して運用される。

### 0.2 Key Ideas（本SoTの中核概念）
- **Canonical（正本）**：各ステージでフロー進行に用いる"最新の正しい成果物"を1つ定める
- **meta.json（派生キャッシュ）**：正本（md 成果物）から gate が導出した状態を保持するキャッシュ。gate は必要に応じて meta.json を同期更新する。hash 不一致はエラー条件ではない
- **Attempts（履歴）**：差戻しや再レビューを上書きせず保存し、監査と効果測定を可能にする
- **Role Separation**：実装者（Implementer）とレビュアー（Reviewer）を分離し、Reviewerがゲートを回す
- **Risk-based Human Intervention**：通常は自律運用。高リスク（R3）のみHumanが最終承認/マージ責務を持つ

### 0.3 End-to-End Flow at a Glance（全体像）
vdev の標準ライフサイクルは以下である。

1. **Instruction**：`instruction.md`
2. **Plan**：`plan.md`
3. **Design Review Gate**：`design-review.md`（`DESIGN_APPROVED` で通過）
4. **Implementation**：`impl.md`
5. **Implementation Review Gate**：`impl-review.md`（`DONE` で完了）

加えて、監査・測定のために以下を保存する：
- `reviews/<topic_name>/**/attempt-XXX.md`（レビュー往復の履歴）

---

## 1. Purpose and Principles

### 1.1 Purpose
本ドキュメントは、vdev フローを GitHub/GitLab を前提に運用する際の正式仕様（SoT）を定義する。  
目的は、開発スピードを最大化しつつ、チーム運用に耐える品質ゲートと監査可能性を両立することである。

### 1.2 Principles
- **ゲートを維持する**：状態機械と正規ゲートを迂回しない
- **正本を一本化する**：各ステージ1つの正本（Canonical）
- **役割分離**：Implementer と Reviewer を分離し、Reviewer がゲートを回す
- **履歴は残すが肥大化させない**：Attemptは最小記録に限定し、ログ全文やdiff全文の転載を避ける
- **人間介入は例外化**：R3のみHumanが最終Approve/Merge責務を持つ

---

## 2. The vdev Lifecycle（仕様としての全体フロー）

### 2.1 Canonical Artifacts（正本の一覧）
vdevの状態遷移に用いる成果物（Canonical）は以下に固定する。

- `instruction.md`
- `plan.md`
- `design-review.md`
- `impl.md`
- `impl-review.md`

vdev CLI（または運用上のゲート判定）は原則として **正本のみ**を参照する。

### 2.2 Stage Definitions and Gate Conditions

#### Stage: Instruction
- 生成物：`instruction.md`
- 目的：スコープ・制約・完了条件を明確化し、以降の自律実行の契約とする

#### Stage: Plan
- 生成物：`plan.md`
- 目的：実装タスク分割、検証（Verify）手順、リスクとロールバックを作業可能な形にする

#### Gate: Design Review
- 生成物：`design-review.md`
- 通過条件：`DESIGN_APPROVED`

#### Stage: Implementation
- 生成物：`impl.md`
- 目的：実装内容、変更点、検証結果を正本として残す

#### Gate: Implementation Review
- 生成物：`impl-review.md`
- 通過条件：`DONE`

### 2.3 Rework（差戻し）時の戻り先
差戻しは、指摘対象の成果物ステージへ戻す。

- `design-review`で差戻し（Status: NEEDS_CHANGES）：
  - gate は NEEDS_DESIGN_REVIEW を返す
  - Implementer は `plan.md` を修正し、Reviewer が新しい design-review attempt を追加することで前進する
- `impl-review`で差戻し（Status: NEEDS_CHANGES）：
  - gate は IMPLEMENTING を返す
  - Implementer は実装を修正し、Reviewer が新しい impl-review attempt を追加することで前進する

### 2.4 Attempts（履歴）の位置付け
- Attemptは監査・測定のための履歴であり、状態遷移には直接関与しない
- レビューのたびにAttemptを **新規作成**し、上書きしない

### 2.5 エラー・異常状態の定義

#### BROKEN_STATE（致命的破損のみ）
BROKEN_STATE は、状態導出や同期が不可能な致命的破損を表す。

以下の場合にのみ BROKEN_STATE とする:
- meta.json がパース不能であり、再生成もできない
- トピックディレクトリ構造が破損している等、復旧不能な状態

以下は BROKEN_STATE の条件ではない:
- 正本ファイルと meta.json の不整合
- hash 不一致

#### COMMAND_ERROR（exit 1）
Status 行が規約外で状態導出不能な場合は COMMAND_ERROR（exit code: 1）とする。
COMMAND_ERROR 発生時は、状態遷移および meta.json 更新を行わない。

---

## 3. Roles and Responsibilities

### 3.1 Human (Product Owner)
- 目的・優先順位・制約（スコープ/期限/リスク）を決定する
- `instruction.md` の品質に責任を持つ（DoD / Verify / Rollback / リスク指定）
- 原則として日々の plan/実装/レビュー往復には介入しない  
- **R3（高リスク）では、Humanは最終のApproveおよびMerge（マージ実行）に責任を持つ**

### 3.2 Implementer (Implementation Agent)
- 作成責務：
  - `plan.md`（正本）を作成・更新する
  - 実装・テストを行い、`impl.md`（正本）を作成・更新する
- 必須：`instruction` / `plan` / レビュー指摘から逸脱しない
- 禁止：
  - `design-review.md` / `impl-review.md`（正本）を作成しない
  - `reviews/.../attempt-XXX.md`（Attempt履歴）を作成しない
  - Status判定（承認/差戻し）を行わない

### 3.3 Reviewer (Review Agent)
- 責務：
  - Planレビュー（運用手順として実施）
  - Designレビュー：Attempt作成→`design-review.md`更新→vdev reviewゲート実行
  - Implレビュー：Attempt作成→`impl-review.md`更新→vdev impl-reviewゲート実行
- 必須：
  - diff/変更ファイル/テスト結果を確認し、チェックリストに沿って判断根拠を残す
- 原則：
  - 実装への直接変更は行わない（指摘→Implementer修正を基本とする）
  - 例外を設ける場合は本SoTで明示する

---

## 4. Artifacts and Canonical Sources（正本＋履歴）

### 4.1 Canonical（正本）
正本は各ステージで1つとし、常に最新状態を表す（直近の判定を反映）。

- `instruction.md`
- `plan.md`
- `design-review.md`
- `impl.md`
- `impl-review.md`

meta.json は正本から導出された派生キャッシュであり、
vdev gate が正本ファイル群から状態を導出し、meta.json を同期更新する。
hashes は監査・差分検知用メタであり、hash 不一致は状態破損の理由にならない。

### 4.2 Attempts（レビュー履歴）
レビュー往復を保存するため、Attemptを以下に積む。

ディレクトリ構造：
- `docs/plans/<topic>/design-review/attempt-001.md`
- `docs/plans/<topic>/design-review/attempt-002.md`
- `docs/plans/<topic>/impl-review/attempt-001.md`
- `docs/plans/<topic>/impl-review/attempt-002.md`

Attemptは上書き禁止。レビューのたびに新規作成する。
vdev gate は最新 attempt のみを解釈する。

### 4.3 Attempt Minimal Format（必須項目）
Attemptには判断記録のみを残し、ログ全文・diff全文の貼付は禁止。

必須項目：
1. **対象識別**
   - PR URL（存在する場合は必須、R3は必須）
   - commit hash / 比較レンジ
   - 変更ファイル一覧
2. **判定**
   - 承認/差戻し と根拠の要点
3. **チェックリスト結果**
   - PASS/FAIL（または○×）＋短い理由
4. **指摘一覧**
   - must / should / nit
   - 状態：open / resolved / won’t fix（wont fixは理由必須）
5. **Verify結果サマリ**
   - 実行コマンドと結果の要約
   - 参照リンク（CI等）

### 4.4 R3 Human Comments Sync（R3のHuman指摘同期）
- R3のHuman指摘の一次記録（正本）はPRのReviewコメントとする
- ReviewerはAttemptに **リンク＋要約**として同期する（全文転載は禁止）

---

## 5. Review Process

### 5.1 Plan Review（vdev成果物を増やさない）
- Implementerが `plan.md` を作成する
- Reviewerが `plan.md` をチェックリストに基づきレビューする
- 差戻しの場合：Reviewerは修正指示を返し、Implementerが `plan.md` を更新する
- Plan受理後、ReviewerはDesign Reviewへ進む

> Planレビュー履歴を残したい場合、`reviews/<topic_name>/plan/attempt-XXX.md` を任意で採用して良い（必須化しない）。

### 5.2 Design Review（正本＋Attempt＋ゲート）
Reviewerはレビューごとに以下を必ず実施する。
1) `docs/plans/<topic>/design-review/attempt-XXX.md` を新規作成
2) vdev reviewゲートを実行（最新 attempt の Status を用いる）

- 承認：Statusは `DESIGN_APPROVED`
- 差戻し：Statusは `NEEDS_CHANGES`（gate は NEEDS_DESIGN_REVIEW を返す）

### 5.3 Implementation & Impl Review（正本＋Attempt＋ゲート）
- Implementer：実装→テスト→`impl.md`（正本）作成・更新
- Reviewer：diff/変更ファイル/テスト結果を確認し、
  1) `docs/plans/<topic>/impl-review/attempt-XXX.md` を新規作成
  2) vdev impl-reviewゲートを実行（最新 attempt の Status を用いる）

---

## 6. Topic Sizing Policy（トピック粒度）

### 6.1 Policy
- 1 topic = 1 batch を原則とする
- 目安：半日〜2日で完了可能な範囲（運用状況で調整可）

### 6.2 Split Conditions（分割条件）
- diffが大きく、Reviewerが理解・判定できない規模
- 高リスク（R3）が混在し、ロールバックを局所化できない
- 失敗時の切り戻し単位を局所化できない

---

## 7. Risk Policy and Human Intervention

### 7.1 Risk Levels
- **R1（低）**：内部リファクタ、型、テスト、内部品質改善
- **R2（中）**：外部I/O、境界仕様、重要ロジック、データ契約
- **R3（高）**：破壊的操作、課金/支払い、権限、データ消失/移行、不可逆副作用

### 7.2 Human Intervention Policy
- R1/R2：原則として自律（Humanは介入しない）
- R3：介入点を増やさず **最終Approve/Mergeに責務を集中**（詳細はMerge Policy参照）

---

## 8. Quality Bar（Checklist / DoD / Verify / Rollback）

### 8.1 Reviewer Checklist（汎用）
- Scope/Intent：instruction/plan逸脱なし
- Contract：I/O、エラー、境界条件、互換性
- Safety：破壊的操作・権限・課金・副作用ガード
- Idempotency/Retry：再実行、部分失敗、冪等性
- State/Consistency：状態遷移、整合性、並行性
- Observability：ログ、障害時の追跡可能性
- Test/Verify：DoD、検証コマンド、必要なテスト更新
- Rollback：戻し方、影響範囲、リリース/切り戻し手順

### 8.2 Definition of Done（DoD）
トピック完了には最低限以下を含む：
- テストの追加/更新（必要範囲）
- Verify実行結果の提示（サマリ）
- 変更点サマリと影響範囲
- ロールバック方針（必要時）

### 8.3 Verify
- 必須検証コマンドは `instruction` または `plan` に明記する
- ReviewerはVerifyサマリと参照情報（CIリンク等）を確認する

### 8.4 Rollback
- ロールバックが必要な変更では、`instruction` または `plan` に戻し方を明記する
- Reviewerはロールバック方針が実運用で成立するか確認する

---

## 9. Operating Loop（自律運用手順）

1) Human：`instruction.md` を確定（リスク、DoD/Verify/Rollback）  
2) Implementer：`plan.md` 作成  
3) Reviewer：Planレビュー → Designレビュー（Attempt＋正本＋vdevゲート）  
4) Implementer：実装・テスト → `impl.md` 作成  
5) Reviewer：Implレビュー（Attempt＋正本＋vdevゲート）  
6) PR運用：Merge Policyに従って承認・マージ  
7) 差戻し時：該当ステップへ戻り、Attemptを積み上げる

---

## 10. Metrics（最低限の測定指標）
- 1 topic（1 batch）のリードタイム
- 差戻し回数（plan差戻し、impl差戻し）
- 重大バグ（リグレッション）件数

---

## 11. Merge Policy（GitHub/GitLab）

### 11.1 Basics
- `main`（または `trunk`）への直接pushは禁止し、変更は必ずPR経由で取り込む
- 1 vdev topic は原則として 1ブランチ＋1PRに対応させる
- PRは差分の監査・承認・マージ責務を担い、vdevは成果物と状態遷移による品質ゲートを担う

### 11.2 Required PR Information
PR本文には最低限以下を含める（テンプレ化推奨）：
- vdev topic 名
- リスク分類（R1/R2/R3）
- 変更概要（What / Why）
- Verify結果サマリ（コマンドと結果）
- ロールバック方針（必要時）

### 11.3 Approval and Merge Responsibilities
- **R1/R2**
  - PR作成：Implementer
  - PRレビュー：Reviewer
  - マージ：Reviewer（必須チェック成功後）
- **R3**
  - PR作成：Implementer
  - 一次レビュー：Reviewer（チェックリスト＋Verify確認、指摘を残す）
  - **最終承認（Approve）およびマージ：Humanの責務**（GitHub/GitLab UIで実施）

### 11.4 R3 Human Comments are Canonical in PR
- R3のHuman指摘はPR上のReviewコメント（Request changes/Approve、行コメント、総評）を一次記録（正本）とする
- ReviewerはAttemptにリンク＋要約として同期し、全文転載は行わない
- HumanがRequest changesを出した場合、Implementerは解消するまでマージしてはならない
- R3のマージは原則として以下が揃った場合のみ実行する：
  - vdev `impl-review` が `DONE`
  - HumanがPRを `Approve`
  - 必須チェック（テスト等）がすべて成功

---

## 12. Pilot and Change Management

- 運用ルールの導入・変更は、まず1 topicでパイロットし、Metricsで効果測定する
- 詰まりが出た場合は、以下の順で対処する：
  1) 本SoT/運用手順（CLAUDE.md、サブエージェント手順、チェックリスト）で吸収  
  2) 吸収不能な場合のみ、vdev CLIの最小改修を検討する

---

## 13. vdev CLI Modification Policy（最小改修の原則）
- 原則：SoT/運用で解決し、CLI改修は最後の手段とする
- 改修が正当化される条件（例）：
  - Reviewerが判定に必要な情報（変更ファイル一覧、diff参照、Verify結果参照）を取得できず運用で補えない
  - バッチ化により成果物管理が破綻し運用で抑えられない

---

## 14. Epic and Epic Run（複数 topic 管理）

本章は、vdev-cli の挙動を変更せずに **Epic（任意）** と **Epic Run（任意）** を vdev フローに追加するための仕様である。

### 14.1 非目標 / 互換性

#### 14.1.1 非目標（Non-Goals）
- vdev-cli の挙動・状態機械・正本（Canonical）成果物の場所を **変更しない**。
- Epic に対して **新しい vdev ゲートを追加しない**。
- topic 成果物を `docs/plans/<topic_name>/` から **移動しない**。

#### 14.1.2 互換性（Compatibility）
- vdev の正本成果物は引き続き **topic スコープ**で `docs/plans/<topic_name>/...` に置く。
- Epic の成果物は **非正本（Non-Canonical）**であり、topic を導くための **入力**とする。

### 14.2 定義

#### 14.2.1 Epic（任意）
**Epic** は、複数 topic を束ねるための **上位合意**であり、以下を定義する：
- Why / Outcome（何を実現したいか）
- スコープ（In/Out）
- 制約（依存・期限・互換性など）
- 受入（DoD）、Verify、Rollback、リスク方針
- topic 分割の意図・順序・依存（Topic Seeds）

Epic は vdev の状態機械には **関与しない**。また vdev ゲートの対象では **ない**。

#### 14.2.2 Epic Run（任意）
**Epic Run** は、以下を入力として：
- Epic（epic.md）
- meta（meta.json：manifest + meta を同居させた JSON）
- `docs/plans/<topic_name>/instruction.md` 配下の既存 topic 群

…を受け取り、vdev の Operating Loop を **topic 単位で順次**自律オーケストレーションする実行モードである。

#### 14.2.3 Human Escalation（人間エスカレーション）
Human が介在するのは **所定の条件を満たす場合のみ**（14.6 節参照）。
`NEEDS_CHANGES` は Implementer と Reviewer の往復における **正常運転**として扱う。

### 14.3 Epic が必須となる条件 / 任意となる条件

- 作業が **複数 topic**（N >= 2）にまたがる場合、Epic は **必須**。
- 作業が **単一 topic**（N = 1）で完結する場合、Epic は **任意**（通常不要だが作ってもよい）。

### 14.4 リポジトリの配置（固定）

#### 14.4.1 Epic（非正本）
- `docs/epics/<epic_id>/epic.md`
- `docs/epics/<epic_id>/meta.json`
- `docs/epics/<epic_id>/attachments/`

#### 14.4.2 Topic（正本・変更なし）
- `docs/plans/<topic_name>/instruction.md`
- `docs/plans/<topic_name>/...`

#### 14.4.3 Backref（Topic → Epic）
Epic が存在する場合、各 topic は必ず以下を含む：
- `docs/plans/<topic_name>/epic-ref.md`

内容（1行固定）：
```
EpicRef: docs/epics/<epic_id>/epic.md
```

### 14.5 Epic 成果物仕様

#### 14.5.1 epic.md テンプレ（見出し固定）
1. 背景 / Why
2. ゴール / Outcome（勝ちの定義）
3. スコープ（In / Out）
4. 制約（期限 / 互換 / 依存 / 運用）
5. リスク方針（R1/R2/R3、事故リスク）
6. Epic DoD
7. Verify
8. Rollback
9. Topic Seeds

#### 14.5.2 meta.json（meta + manifest 同居）

**必須キー：**
- schema_version
- epic_id
- title
- epic_path
- topics（順序付き配列）

**topics[] 必須フィールド：**
- order
- topic_name
- plan_dir
- instruction_path
- epic_ref_path
- depends_on
- allow_parallel

meta.json 記述例は Appendix B を参照。

### 14.6 Human Escalation Policy（Epic / 単発共通）

#### 14.6.1 原則
`NEEDS_CHANGES` は **Human 介在の理由にならない**。

#### 14.6.2 Human が介在するのは次の2条件のみ
1. **意図レベルの変更が必要**
   - 目的 / Outcome / 受入条件の変更
   - スコープ外作業が不可避
   - プロダクト判断が必要

2. **事故リスクが高い**
   - 金銭・購入・外部影響の即時実害
   - データ消失・権限漏れ・不可逆破壊
   - 検証不能 / ロールバック不能な高不確実性

### 14.7 Epic Run 手順（任意）

#### 14.7.1 入力
- epic.md
- meta.json
- meta.json で参照される topic ディレクトリ群

#### 14.7.2 実行（既定：直列）
- meta.json の order 昇順で topic を処理
- 各 topic は `impl-review: DONE` まで同一 topic 内で反復
- `NEEDS_CHANGES` では停止しない

#### 14.7.3 停止条件
- 14.6 節の Human Escalation Policy に該当した場合のみ停止

### 14.8 topic instruction.md 運用指針（Epic がある場合）
- epic-ref.md は **必須**
- Epic の意図を再定義してはならない
- 意図変更が必要な場合は Human Escalation

---

## Appendix A. Recommended Repository Layout（参考）
- `docs/vdev-flow.md`（本SoT）
- `docs/checklists/reviewer-checklist.md`
- `CLAUDE.md`（SoT参照＋Claude Code運用規約）
- `docs/subagents/implementer.md`
- `docs/subagents/reviewer.md`
- `docs/plans/<topic>/design-review/attempt-*.md`（Design Review Attempt 履歴）
- `docs/plans/<topic>/impl-review/attempt-*.md`（Impl Review Attempt 履歴）
- `docs/epics/<epic_id>/epic.md`（Epic 定義、非正本）
- `docs/epics/<epic_id>/meta.json`（Epic manifest、非正本）
- `docs/epics/<epic_id>/attachments/`（Epic 添付資料）

---

## Appendix B. Epic meta.json 記述例（参考）

```json
{
  "schema_version": "v1",
  "epic_id": "EPIC-001-abel-foundation",
  "title": "abelの大幅改修土台作り",
  "epic_path": "docs/epics/EPIC-001-abel-foundation/epic.md",
  "attachments_dir": "docs/epics/EPIC-001-abel-foundation/attachments",
  "created_at": "2026-01-23",
  "updated_at": "2026-01-23",
  "run_policy": {
    "default_execution": "serial",
    "stop_condition": "human_escalation_only",
    "human_escalation_policy_ref": "SoT:vdev-flow.md#human-escalation-policy"
  },
  "topics": [
    {
      "order": 1,
      "topic_name": "2026-01-23-a2-a1-b2-c1",
      "plan_dir": "docs/plans/2026-01-23-a2-a1-b2-c1",
      "instruction_path": "docs/plans/2026-01-23-a2-a1-b2-c1/instruction.md",
      "epic_ref_path": "docs/plans/2026-01-23-a2-a1-b2-c1/epic-ref.md",
      "allow_parallel": false,
      "depends_on": []
    }
  ]
}
```

---
