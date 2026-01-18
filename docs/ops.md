# vdev Operations Guide

## 1. Daily Workflow (Happy Path)

### Step 1. Create Topic
```bash
vdev new auth-refresh
Step 2. Create Plan
bash
コードをコピーする
# Claude Code が plan を生成
cat plan-output.md | vdev plan 2026-01-18-auth-refresh --stdin
Step 3. Review
bash
コードをコピーする
# ChatGPT の review 出力を保存
cat review-output.md | vdev review 2026-01-18-auth-refresh --stdin
Step 4. Gate Check
bash
コードをコピーする
vdev gate 2026-01-18-auth-refresh
Step 5. Implementation
gate が APPROVED の場合のみ実装を開始する

2. Common Status Patterns
NEEDS_PLAN
plan.md が未作成

NEEDS_REVIEW
review.md が未作成

NEEDS_CHANGES
修正要求あり

Status 抽出失敗時

REJECTED
方針却下

APPROVED
実装GO

3. Listing Topics
bash
コードをコピーする
vdev ls
vdev ls --status APPROVED
4. Warnings and Errors
Status Not Found
review は保存される

status は NEEDS_CHANGES に強制される

BROKEN
meta.json の不整合

plan/review hash 不一致

5. Best Practices
plan.md は直接編集しない

review.md は gate の判断のみを書く

状態は会話ではなくファイルで確認する

yaml
コードをコピーする

---

# 3️⃣ `docs/rollback.md`（事故対応・切り戻し）

> **目的**：  
> - 失敗時に「どう戻すか」を **事前に言語化**  
> - 人間判断の属人化を防ぐ

---

## `docs/rollback.md` 雛形

```md
# vdev Rollback & Recovery Guide

## 1. Topic Creation Mistake

### Symptom
- 誤った topic を作成した

### Action
```bash
rm -rf docs/plans/YYYY-MM-DD-wrong-topic
2. Approved but Plan Changed
Symptom
plan.md を再生成したら gate が通らなくなった

Cause
plan hash が変わり status が NEEDS_CHANGES に戻った

Action
正しい挙動

再度 review を実施する

3. BROKEN_STATE Recovery
Common Causes
meta.json の手動編集

plan/review の手動編集

ファイル削除

Recovery Steps
meta.json を確認

必要なら review を再実施

vdev gate が正常になるまで修復

4. Emergency Reset
Last Resort
topic ディレクトリを削除し、new からやり直す

5. Philosophy
事故は Git の履歴で追跡できる

状態を隠さず、破壊的に直さない
