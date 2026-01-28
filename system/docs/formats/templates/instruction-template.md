# vdev Instruction / 指示書（探索プロトコル版）

## 0. メタ情報 / Meta
- Topic: <YYYY-MM-DD-...>
- Risk Level: <R1 | R2 | R3>
- Target Branch: <feature/...>
- Repository: <repo-name>

---

## 1. 目的 / Goal
### 1.1 何をやるか（What）
- <目的を1〜3行で明確に書く>

### 1.2 なぜやるか（Why）
- <背景・課題・価値>

### 1.3 成功条件（Acceptance Criteria）
- [ ] <外部仕様として確認可能な条件>
- [ ] <テスト/コマンドで検証可能な条件>

(English hint)
- Define measurable success criteria.

---

## 2. スコープ / Scope
### 2.1 対象範囲（In Scope）
- <含める>

### 2.2 非対象（Out of Scope / Non-Goals）
- <やらないこと・触らないこと>

---

## 3. 制約 / Constraints (Must)
### 3.1 技術制約
- <例: backward compatibility must be preserved>

### 3.2 運用・設計制約
- <例: follow existing architecture patterns>

### 3.3 変更禁止領域
- <触ってはいけない領域>

---

## 4. 探索プロトコル / Exploration Protocol（必須 / Mandatory）

### 4.1 Quick Explore（E0）※必須
目的：現状理解を最低限確保すること。

以下を調査し、②plan/design の冒頭にまとめること。

#### A. 関連コードの特定 / Related Code
- Entry points（入口）:
- Key modules（主要モジュール）:
- Similar features（類似機能）:

#### B. 現状動作の要約 / Current Behavior Summary
- 処理フロー（簡潔に）:
- 入出力（I/O）:
- 例外・エラー処理:

#### C. 既存テスト / Existing Tests
- 該当テスト:
- verify コマンド:
- 追加すべきテスト:

#### D. 制約・落とし穴 / Constraints & Pitfalls
- 互換性リスク:
- 副作用の可能性:
- 破壊的変更の可能性:

---

### 4.2 Deep Explore（E1）※条件付き
次の場合のみ実施する：

- 不明点（Unknowns）が2件以上
- 複数サブシステムに影響
- breaking change の可能性
- 設計案が複数存在する

必要に応じて：

- 依存関係の詳細調査
- 既存設計パターンの抽出
- Mermaid 図（sequence / flow）1つ作成

---

## 5. 不確実性 / Unknowns（必須）
- Unknown 1:
  - 内容:
  - 解消方法:
- Unknown 2:
  - 内容:
  - 解消方法:

※ Unknowns が2件以上残る場合は実装に進まない。

---

## 6. 設計方針 / Design Direction（仮）
### 6.1 採用案 / Proposed Approach
- <概要>

### 6.2 代替案 / Alternatives
- 案A:
- 案B:

### 6.3 採用理由 / Rationale
- <なぜこの案を選ぶか>

---

## 7. ②Plan/Design への出力契約 / Output Contract

②plan/design は必ず以下の構造で出力すること：

### 7.1 Exploration Summary
- Related files/modules:
- Current behavior summary:
- Constraints/Risks:
- Unknowns（解消済/未解消）:

### 7.2 Final Design
- Architecture changes:
- API / Data model impact:
- Migration / Compatibility:

### 7.3 Implementation Steps
- Step 1:
  - Task:
  - Verify: `<command>`
- Step 2:
  - Task:
  - Verify: `<command>`

---

## 8. 停止条件 / Stop & Escalation Policy（必須）

以下の場合は実装を停止し、人間にエスカレーションする：

- Spec conflict（既存仕様との矛盾）
- Unknowns が2件以上残る
- Breaking change が必要
- 影響範囲が想定を超える
- テスト戦略が立てられない

(English hint)
- Stop implementation and escalate to human.

---

## 9. 成果物 / Deliverables
- ② plan/design:
  - <path>
- ③ impl:
  - <変更ファイル>
- tests:
  - <追加/更新>
- docs:
  - <必要なら>

---

## 10. Verify / 検証
最低限実行するコマンド：

- `<lint>`
- `<test>`
- `<format>`
- `<vdev gate>`
