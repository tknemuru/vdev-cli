# vdev Implementation Review / 実装レビュー報告書（impl-review.md）

## 0. メタ情報 / Meta
- Topic: <YYYY-MM-DD-...>
- Risk Level: <R1 | R2 | R3>
- Repository: <repo-name>
- Branch: <feature/...>
- Related Instruction: <path to instruction.md>
- Related Plan/Design: <path to plan.md>
- Related Implementation: <path to impl.md>
- Reviewer: <Claude Code / Human>
- Date: <YYYY-MM-DD>

---

## 1. Review Summary / レビュー総括（最重要）

### 1.1 結論 / Verdict
- Status: <PASS | FAIL | NEEDS_CLARIFICATION>
- Confidence: <High | Medium | Low>

(English hint)
- Decide whether the implementation is acceptable.

---

### 1.2 総評（3〜7行で本質のみ）
- ...
- ...

---

### 1.3 差戻しの有無 / Blocking Issues
- Blocking issues exist: <Yes / No>
- If Yes:
  - Issue 1:
  - Issue 2:

---

## 2. Specification Alignment / 仕様整合性（必須）

### 2.1 Instruction との整合性
- Goal の達成度: <OK / NG>
- Scope逸脱の有無: <Yes / No>
  - 内容:
- Constraints遵守: <OK / NG>

---

### 2.2 Plan/Design との整合性
- Plan準拠: <Yes / No>
- Planとの差分:
  - 差分内容:
  - 正当性: <妥当 / 要再検討>
  - Plan修正の必要性: <Yes / No>

(English hint)
- Check whether implementation matches the plan.

---

### 2.3 Acceptance Criteria との対応
- [ ] AC-1: <...>
  - Evidence: <impl.md / tests / verify>
- [ ] AC-2: <...>
  - Evidence: ...

---

## 3. Technical Quality / 技術品質評価（核心）

### 3.1 設計品質 / Design Quality
- 責務分離:
  - 評価: <Good / Acceptable / Poor>
  - コメント:
- 依存関係:
  - 評価:
  - コメント:
- 拡張性:
  - 評価:
  - コメント:

---

### 3.2 実装品質 / Code Quality
- 可読性:
  - 評価:
  - コメント:
- 一貫性（既存パターンとの整合）:
  - 評価:
  - コメント:
- 複雑性:
  - 評価:
  - コメント:

---

### 3.3 テスト品質 / Test Quality
- テスト網羅性:
  - 評価:
- 境界条件 / 異常系:
  - 評価:
- 重要ロジックの担保:
  - 評価:

(English hint)
- Evaluate design, code, and tests separately.

---

## 4. Risk Assessment / リスク評価（vdev核心）

### 4.1 新規リスク
- Risk 1:
  - 内容:
  - 深刻度: <Low / Medium / High>
  - 対応要否: <Must / Should / Optional>

---

### 4.2 既存リスクの変化
- 既存リスクへの影響:
  - ...

---

### 4.3 Risk Level の妥当性
- 指定Risk（R1/R2/R3）は妥当か:
  - <Yes / No>
- 修正提案:
  - <R1→R2 など>

---

## 5. Verification Review / 検証妥当性（必須）

### 5.1 Verifyコマンドの妥当性
- 実行結果の信頼性:
  - <High / Medium / Low>
- 不足している検証:
  - ...

---

### 5.2 Acceptance Criteria の満足度
- 全体評価:
  - <Satisfied / Partially / Unsatisfied>
- 不足項目:
  - ...

---

## 6. vdev Gate 判定 / Gate Decision（必須）

### 6.1 Gate 判定
- Gate status: <PASS / FAIL>
- 理由:
  - ...

---

### 6.2 Handoff 判定
- 次フェーズへ進めるか:
  - <Yes / No>
- 条件付き承認の場合の条件:
  - ...

(English hint)
- Decide whether to pass the gate or stop.

---

## 7. Required Actions / 必須対応（差戻し時）

> Status = FAIL の場合は必須。

### 7.1 修正必須事項（Must Fix）
- [ ] Issue 1:
  - 修正内容:
  - 理由:
- [ ] Issue 2:
  - ...

---

### 7.2 推奨改善（Should Fix）
- [ ] Improvement 1:
- [ ] Improvement 2:

---

## 8. Optional Feedback / 任意コメント（価値最大化）

### 8.1 設計改善提案
- ...

### 8.2 将来リファクタ候補
- ...

### 8.3 技術的負債の兆候
- ...

---

## 9. Final Recommendation / 最終提言（Human向け）

- 推奨判断:
  - [ ] このままマージ可能
  - [ ] 修正後に再レビュー
  - [ ] 設計からやり直すべき
- 理由（3〜5行）:
  - ...
