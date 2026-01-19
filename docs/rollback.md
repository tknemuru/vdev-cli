# vdev Rollback & Recovery Guide（v2.0）

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
# REPO=my-project	BROKEN_STATE	topic	broken state
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

#### Case 2: plan.md の手動編集（DESIGN_APPROVED/DONE 状態で）

```bash
vdev gate topic
# REPO=my-project	BROKEN_STATE	topic	broken state
```

**Recovery Option A: 正規フローに戻す**
```bash
# plan を vdev 経由で再保存（設計レビューが無効化される）
cat docs/plans/topic/plan.md | vdev plan topic --stdin

# 再レビュー
cat << 'EOF' | vdev review topic --stdin
Status: DESIGN_APPROVED

手動編集分を確認し再承認
EOF
```

**Recovery Option B: Git から復元**
```bash
# 手動編集前の状態に戻す
git checkout HEAD -- docs/plans/topic/plan.md
git checkout HEAD -- docs/plans/topic/meta.json
```

#### Case 3: design-review.md の手動編集

```bash
# review を再保存して hash を再計算
cat docs/plans/topic/design-review.md | vdev review topic --stdin
```

#### Case 4: impl.md の手動編集（DONE 状態で）

```bash
# impl を再保存（impl-review が無効化される）
cat docs/plans/topic/impl.md | vdev impl topic --stdin

# 再レビュー
cat << 'EOF' | vdev impl-review topic --stdin
Status: DONE

手動編集分を確認し再承認
EOF
```

#### Case 5: impl-review.md の手動編集

```bash
# impl-review を再保存して hash を再計算
cat docs/plans/topic/impl-review.md | vdev impl-review topic --stdin
```

#### Case 6: ファイル削除

```bash
# 不足ファイルに応じて再作成
# instruction.md がない場合
echo "# Instruction" | vdev instruction topic --stdin

# plan.md がない場合
echo "# Plan" | vdev plan topic --stdin

# design-review.md がない場合
echo "Status: NEEDS_CHANGES" | vdev review topic --stdin

# impl.md がない場合（IMPLEMENTING 状態で）
echo "# Implementation Report" | vdev impl topic --stdin

# impl-review.md がない場合
echo "Status: NEEDS_CHANGES" | vdev impl-review topic --stdin
```

---

## 3. Plan Changed After Design Approval

### Symptom

```bash
vdev gate topic
# REPO=my-project	NEEDS_DESIGN_REVIEW	topic	design-review.md not found
# 以前は DESIGN_APPROVED だった
```

### Cause

`vdev plan` を実行すると、status は自動的に `NEEDS_DESIGN_REVIEW` に変更される。これは仕様通りの動作（設計変更には再レビューが必須）。

### Action

**正しい挙動なので、再レビューを実施する:**

```bash
cat << 'EOF' | vdev review topic --stdin
Status: DESIGN_APPROVED

変更内容を確認し、再承認します。
EOF
```

---

## 4. Implementation Changed After Approval

### Symptom

```bash
vdev gate topic
# REPO=my-project	NEEDS_IMPL_REVIEW	topic	impl-review.md not found
# 以前は DONE だった
```

### Cause

`vdev impl` を実行すると、status は自動的に `NEEDS_IMPL_REVIEW` に変更される。これは仕様通りの動作。

### Action

```bash
cat << 'EOF' | vdev impl-review topic --stdin
Status: DONE

変更内容を確認し、再承認します。
EOF
```

---

## 5. Status Extraction Failed

### Symptom

```bash
# review を保存したが DESIGN_APPROVED にならない
cat review.md | vdev review topic --stdin
# ERROR: Status extraction failed
```

### Cause

design-review.md に正しい形式の `Status:` 行がない。

### Action

```bash
# 正しい形式で再保存
cat << 'EOF' | vdev review topic --stdin
Status: DESIGN_APPROVED

（レビュー内容）
EOF
```

**正しい Status 行の形式（設計レビュー）:**
```
Status: DESIGN_APPROVED
Status: REJECTED
Status: NEEDS_CHANGES
```

**正しい Status 行の形式（実装レビュー）:**
```
Status: DONE
Status: NEEDS_CHANGES
```

---

## 6. DESIGN_APPROVED からの回復

### Symptom

DESIGN_APPROVED 状態で実装を開始し忘れた

### Action

```bash
vdev start topic
```

---

## 7. IMPLEMENTING からの回復

### Symptom

IMPLEMENTING 状態で作業が中断した

### Action

実装を再開するか、impl を提出する:

```bash
# 実装が完了した場合
cat impl-report.md | vdev impl topic --stdin

# 設計に問題があった場合（NEEDS_PLAN に戻す）
cat << 'EOF' | vdev review topic --stdin
Status: NEEDS_CHANGES

実装中に設計の問題を発見
EOF
```

---

## 8. REJECTED からの回復

### Symptom

```bash
vdev gate topic
# REPO=my-project	REJECTED	topic	rejected
```

### Action

設計を見直して新しい topic を作成する:

```bash
# 新規 topic で再提案
vdev new topic-v2
cat new-instruction.md | vdev instruction topic-v2 --stdin
cat new-plan.md | vdev plan topic-v2 --stdin
```

---

## 9. schemaVersion 1 Topic の扱い

### v2 CLI で v1 Topic を開いた場合

```bash
vdev gate old-topic
# ERROR: schemaVersion 1 is not supported by v2 CLI
```

### 対処方法

v1 topic は v2 CLI では処理できない。以下のいずれかを選択:

**Option A: v1 topic を完了させてからアップグレード**
- v1 CLI で作業を完了させる

**Option B: 手動で v2 に移行**
```bash
# 1. 内容をバックアップ
cp -r docs/plans/old-topic /tmp/old-topic-backup

# 2. v1 topic を削除
rm -rf docs/plans/old-topic

# 3. v2 で新規作成
vdev new old-topic-name

# 4. 内容を復元
cat /tmp/old-topic-backup/instruction.md | vdev instruction new-topic --stdin
cat /tmp/old-topic-backup/plan.md | vdev plan new-topic --stdin
cat << 'EOF' | vdev review new-topic --stdin
Status: DESIGN_APPROVED

v1 からの移行
EOF
```

---

## 10. Emergency Reset

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
Status: DESIGN_APPROVED

復旧のため再承認
EOF
vdev start new-topic
cat /tmp/topic-backup/impl.md | vdev impl new-topic --stdin
cat << 'EOF' | vdev impl-review new-topic --stdin
Status: DONE

復旧完了
EOF
```

---

## 11. Git を使った状態確認

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

## 12. Diagnosis Commands

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
sha256sum docs/plans/topic/design-review.md
sha256sum docs/plans/topic/impl.md
sha256sum docs/plans/topic/impl-review.md
```

### 全 topic の状態一覧

```bash
vdev ls
```

---

## 13. Philosophy

1. **事故は Git の履歴で追跡できる**
   - 全ての変更は Git に記録される
   - いつでも過去の状態に戻せる

2. **状態を隠さず、破壊的に直さない**
   - BROKEN_STATE は問題を明示する
   - 原因を理解してから修復する

3. **vdev コマンド経由で修復する**
   - meta.json を直接編集しない
   - plan/review/impl/impl-review コマンドで状態を再構築

4. **最悪の場合は topic 再作成**
   - 復旧が複雑なら、最初からやり直す方が安全

5. **v1 topic は手動移行が必要**
   - schemaVersion 1 は v2 CLI で処理できない
   - 移行するか、v1 で完了させる
