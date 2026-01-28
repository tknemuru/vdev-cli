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