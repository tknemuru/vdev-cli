# Design Review: ops.md / vdev-cli-cheatsheet.md 追従改訂

## Attempt 1

**Date**: 2026-01-26
**Reviewer**: Claude (Reviewer role)
**Target**: plan.md (registered via vdev plan)

---

## Pressure Test Suite v1

- Suite: v1
- Executed: 5/5
- Triggered: None

| Test ID | Result | Notes |
|---------|--------|-------|
| PT-D1 | PASS | instruction → plan 対応が 1:1 で明確。重要制約（.claude 配下修正禁止）が plan に反映 |
| PT-D2 | PASS | 曖昧表現なし。正本パスが明示されている |
| PT-D3 | PASS | Verify が具体的 grep コマンドと期待結果で構成 |
| PT-D4 | PASS | 必須ドキュメント更新判断が明示（正本 / コピー の区別あり） |
| PT-D5 | PASS | 影響範囲が明確（正本のみ、.claude 配下は除外） |

---

## Guard

**Result: PASS**

- vdev フロー準拠: OK（NEEDS_PLAN → NEEDS_DESIGN_REVIEW の正規遷移）
- instruction.md 存在: OK
- plan.md 存在: OK（vdev plan 登録済み）
- Risk Assessment 明示: OK（R2 として明記）
- 必須ドキュメント判断: OK
- 重要制約（.claude 配下修正禁止）: OK（plan に明記）

---

## Verifier

**Result: PASS**

plan.md の Verify セクションが以下を満たしている：

1. **実行コマンド**: 具体的な bash コマンドが記載
2. **期待結果**: 成功条件が明示
3. **再現可能性**: 第三者が同一コマンドで検証可能

Verify 項目：
- 手動編集禁止記述の除去: `grep -n "手動編集禁止" docs/ops.md`
- v3 追従の正本宣言: `grep -n "Canonical\|正本" docs/ops.md`
- ハッシュ整合必須の除去: `grep -n "ハッシュ整合が必須"`
- cheatsheet 正本の v3 宣言: 正本パスを明示して grep
- .claude 配下差分なし: `git diff --name-only .claude/`

---

## Critic

**Result: PASS (BLOCKER: 0, MAJOR: 0)**

### 反証（Counter-Arguments）

1. **ai-resources リポジトリへの変更**
   - 反証: vdev-cli-cheatsheet.md の正本が ai-resources にあるため、本リポジトリ外への変更が必要
   - 評価: plan で正本パスが明示されており、変更対象が明確。vdev sync により .claude 配下に反映される前提で運用可能。

2. **既存ユーザーの混乱リスク**
   - 反証: v2 の「手動編集禁止」を信じていたユーザーが v3 の「直接編集 OK」に戸惑う可能性
   - 評価: これは vdev-spec v3.0.0 の設計判断であり、ドキュメント追従は正当。むしろ追従しないと混乱が増大。

3. **.claude 配下の同期タイミング**
   - 反証: ai-resources の cheatsheet を修正しても、vdev sync を実行しないと .claude 配下に反映されない
   - 評価: これは既存の同期フローであり、本トピックの scope 外。DoD で「.claude 配下に差分がない」ことを確認するため、意図しない変更は検出可能。

---

## 総合判定

| 視点 | 結果 |
|------|------|
| Guard | PASS |
| Verifier | PASS |
| Critic | PASS (BLOCKER: 0, 反証: 3) |

Status: DESIGN_APPROVED

---

## 承認理由

1. instruction.md の重要制約（.claude 配下修正禁止）が plan に明記されている
2. 正本ファイルのパスが明確に特定されている
3. Verify が具体的コマンドと期待結果で構成されている
4. DoD に「.claude 配下に差分がない」が含まれている
5. 反証 3 件を検討し、いずれも設計上の問題ではないことを確認
