# vdev Rollback & Recovery Guide

## 1. Topic Creation Mistake

### Symptom
- 誤った topic を作成した
- slug のタイプミス

### Action

```bash
# topic ディレクトリを削除
rm -rf docs/plans/2026-01-19-wrong-topic

# 正しい名前で再作成
vdev new correct-topic
```

---

## 2. BROKEN_STATE Recovery

### 原因と対処

#### Case 1: meta.json の手動編集

```bash
vdev gate topic
# REPO=my-project	BROKEN_STATE	topic	parse error: ...
```

**Recovery:**
```bash
# meta.json の構文を確認
cat docs/plans/topic/meta.json | jq .

# 修正するか、review を再実施して状態を再構築
cat << 'EOF' | vdev review topic --stdin
Status: NEEDS_CHANGES

meta.json 復旧のため再レビュー
EOF
```

#### Case 2: plan.md の手動編集（APPROVED 状態で）

```bash
vdev gate topic
# REPO=my-project	BROKEN_STATE	topic	hash mismatch in APPROVED/REJECTED state
```

**Recovery Option A: 正規フローに戻す**
```bash
# plan を vdev 経由で再保存（承認が無効化される）
cat docs/plans/topic/plan.md | vdev plan topic --stdin

# 再レビュー
cat << 'EOF' | vdev review topic --stdin
Status: APPROVED

手動編集分を確認し再承認
EOF
```

**Recovery Option B: Git から復元**
```bash
# 手動編集前の状態に戻す
git checkout HEAD -- docs/plans/topic/plan.md
git checkout HEAD -- docs/plans/topic/meta.json
```

#### Case 3: review.md の手動編集（APPROVED 状態で）

```bash
# review を再保存して hash を再計算
cat docs/plans/topic/review.md | vdev review topic --stdin
```

#### Case 4: ファイル削除

```bash
# 不足ファイルに応じて再作成
# instruction.md がない場合
echo "# Instruction" | vdev instruction topic --stdin

# plan.md がない場合
echo "# Plan" | vdev plan topic --stdin

# review.md がない場合
echo "Status: NEEDS_CHANGES" | vdev review topic --stdin
```

---

## 3. Plan Changed After Approval

### Symptom

```bash
vdev gate topic
# REPO=my-project	NEEDS_CHANGES	topic	changes requested
# 以前は APPROVED だった
```

### Cause

`vdev plan` を実行すると、status は自動的に `NEEDS_CHANGES` に変更される。これは仕様通りの動作。

### Action

**正しい挙動なので、再レビューを実施する:**

```bash
cat << 'EOF' | vdev review topic --stdin
Status: APPROVED

変更内容を確認し、再承認します。
EOF
```

---

## 4. Status Extraction Failed

### Symptom

```bash
# review を保存したが APPROVED にならない
cat review.md | vdev review topic --stdin
# REPO=my-project	REVIEW_SAVED	topic	NEEDS_CHANGES
```

### Cause

review.md に正しい形式の `Status:` 行がない。

### Action

```bash
# 正しい形式で再保存
cat << 'EOF' | vdev review topic --stdin
Status: APPROVED

（レビュー内容）
EOF
```

**正しい Status 行の形式:**
```
Status: APPROVED
Status: REJECTED
Status: NEEDS_CHANGES
```
（行頭に `Status:`、値は大文字小文字を区別しない）

---

## 5. Emergency Reset

### Last Resort

全ての recovery が失敗した場合、topic を削除して最初からやり直す。

```bash
# 1. 現在の内容をバックアップ
cp -r docs/plans/topic /tmp/topic-backup

# 2. topic を削除
rm -rf docs/plans/topic

# 3. 新規作成
vdev new topic-name

# 4. 内容を復元
cat /tmp/topic-backup/instruction.md | vdev instruction new-topic --stdin
cat /tmp/topic-backup/plan.md | vdev plan new-topic --stdin
cat << 'EOF' | vdev review new-topic --stdin
Status: APPROVED

復旧のため再承認
EOF
```

---

## 6. Git を使った状態確認

### 変更履歴の確認

```bash
# topic ディレクトリの変更履歴
git log --oneline -- docs/plans/topic/

# 特定ファイルの差分
git diff HEAD~1 -- docs/plans/topic/meta.json
```

### 特定時点への復元

```bash
# 特定コミットの状態に復元
git checkout abc1234 -- docs/plans/topic/

# 復元後、gate を確認
vdev gate topic
```

---

## 7. Diagnosis Commands

### 状態の確認

```bash
# gate 状態
vdev gate topic
echo "Exit code: $?"

# meta.json の内容
cat docs/plans/topic/meta.json | jq .

# ファイル存在確認
ls -la docs/plans/topic/

# hash の手動確認
sha256sum docs/plans/topic/plan.md
sha256sum docs/plans/topic/review.md
```

### 全 topic の状態一覧

```bash
vdev ls
```

---

## 8. Philosophy

1. **事故は Git の履歴で追跡できる**
   - 全ての変更は Git に記録される
   - いつでも過去の状態に戻せる

2. **状態を隠さず、破壊的に直さない**
   - BROKEN_STATE は問題を明示する
   - 原因を理解してから修復する

3. **vdev コマンド経由で修復する**
   - meta.json を直接編集しない
   - plan/review コマンドで状態を再構築

4. **最悪の場合は topic 再作成**
   - 復旧が複雑なら、最初からやり直す方が安全
