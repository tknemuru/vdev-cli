# vdev Design Review / 設計レビュー報告書（design-review.md）

## 0. メタ情報 / Meta
- Topic: <YYYY-MM-DD-...>
- Risk Level: <R1 | R2 | R3>
- Repository: <repo-name>
- Branch: <feature/...>
- Related Instruction: <path to instruction.md>
- Related Plan/Design: <path to plan.md>
- Reviewer: <Claude Code / Human>
- Date: <YYYY-MM-DD>

---

## 1. Review Summary / 総括（最重要）

### 1.1 結論 / Verdict
- Status: <PASS | FAIL | NEEDS_REDESIGN>
- Confidence: <High | Medium | Low>

(English hint)
- Decide whether the design is acceptable.

---

### 1.2 総評（3〜7行）
- ...
- ...

---

### 1.3 差戻し要否 / Blocking Design Issues
- Blocking issues exist: <Yes / No>
- If Yes:
  - Issue 1:
  - Issue 2:

---

## 2. Instruction Alignment / instruction との整合性（必須）

### 2.1 Goal の達成度
- Goal alignment: <OK / NG>
- Scope逸脱の有無:
  - <Yes / No>
  - 内容:

---

### 2.2 Exploration の妥当性
- Exploration（探索）が十分か:
  - <Sufficient / Insufficient>
- 不足している調査:
  - ...

---

### 2.3 Unknowns の扱い
- Unknowns が残っているか:
  - <Yes / No>
- 残存 Unknowns:
  - ...
- 実装に進んでよいか:
  - <Yes / No>

(English hint)
- Check whether unknowns are resolved.

---

## 3. Design Quality Review / 設計品質評価（核心）

### 3.1 アーキテクチャ妥当性
- 責務分離:
  - 評価: <Good / Acceptable / Poor>
  - コメント:
- 依存関係:
  - 評価:
  - コメント:
- 境界設計（Boundaries）:
  - 評価:
  - コメント:

---

### 3.2 代替案の検討
- Alternatives が十分か:
  - <Yes / No>
- 見落とされている案:
  - ...

---

### 3.3 拡張性・保守性
- 拡張性:
  - 評価:
- 保守性:
  - 評価:
- 技術的負債の兆候:
  - ...

---

### 3.4 API / データ設計の妥当性
- API changes:
  - 妥当 / 要再検討
- Data model changes:
  - 妥当 / 要再検討
- Backward compatibility:
  - Preserved / Broken（理由）

---

## 4. Risk Review / リスク再評価（vdev核心）

### 4.1 新規リスク
- Risk 1:
  - 内容:
  - 深刻度: <Low / Medium / High>

---

### 4.2 Risk Level の妥当性
- 指定Risk（R1/R2/R3）は妥当か:
  - <Yes / No>
- 修正提案:
  - ...

---

### 4.3 Failure Modes（失敗モード）
- 想定される失敗:
  - ...
- ガード策:
  - ...

(English hint)
- Identify failure modes and mitigation.

---

## 5. Implementation Feasibility / 実装可能性評価

### 5.1 実装難易度
- Complexity:
  - <Low / Medium / High>
- 実装負荷:
  - ...

---

### 5.2 テスト可能性
- テスト戦略は妥当か:
  - <Yes / No>
- 不足しているテスト観点:
  - ...

---

### 5.3 Step Plan の妥当性
- Step分解は適切か:
  - <Yes / No>
- 見落としステップ:
  - ...

---

## 6. vdev Gate 判定 / Design Gate Decision（必須）

### 6.1 Gate 判定
- Gate status: <PASS / FAIL>
- 理由:
  - ...

---

### 6.2 Handoff 判定
- impl フェーズへ進めるか:
  - <Yes / No>
- 条件付き承認の場合の条件:
  - ...

---

## 7. Required Actions / 必須修正（FAIL時）

### 7.1 Must Fix（必須）
- [ ] Issue 1:
  - 修正内容:
  - 理由:
- [ ] Issue 2:

---

### 7.2 Should Fix（推奨）
- [ ] Improvement 1:
- [ ] Improvement 2:

---

## 8. Final Recommendation / 最終提言（Human向け）

- 推奨判断:
  - [ ] この設計で実装に進んでよい
  - [ ] 修正後に再レビュー
  - [ ] 設計からやり直すべき
- 理由（3〜5行）:
  - ...
