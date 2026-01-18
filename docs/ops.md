# vdev Operations Guide

## 1. Daily Workflow（公式フロー）

### Step 1: Create Topic

```bash
vdev new auth-refresh
# REPO=my-project	CREATED	2026-01-19-auth-refresh	docs/plans/2026-01-19-auth-refresh/
```

### Step 2: Write Instruction

```bash
cat << 'EOF' | vdev instruction 2026-01-19-auth-refresh --stdin
# 認証トークンのリフレッシュ機能

## 要件
- リフレッシュトークンの自動更新
- 有効期限切れ時のリダイレクト
EOF
# REPO=my-project	INSTRUCTION_SAVED	2026-01-19-auth-refresh
```

### Step 3: Gate Check（NEEDS_PLAN 確認）

```bash
vdev gate 2026-01-19-auth-refresh
# REPO=my-project	NEEDS_PLAN	2026-01-19-auth-refresh	plan.md not found
# Exit code: 11
```

### Step 4: Create Plan

```bash
# Claude Code が plan を生成
cat plan-output.md | vdev plan 2026-01-19-auth-refresh --stdin
# REPO=my-project	PLAN_SAVED	2026-01-19-auth-refresh
```

### Step 5: Gate Check（NEEDS_REVIEW 確認）

```bash
vdev gate 2026-01-19-auth-refresh
# REPO=my-project	NEEDS_REVIEW	2026-01-19-auth-refresh	review.md not found
# Exit code: 12
```

### Step 6: Review

```bash
# レビュー結果を保存
cat << 'EOF' | vdev review 2026-01-19-auth-refresh --stdin
Status: APPROVED

計画内容を確認し、承認します。
EOF
# REPO=my-project	REVIEW_SAVED	2026-01-19-auth-refresh	APPROVED
```

### Step 7: Final Gate Check

```bash
vdev gate 2026-01-19-auth-refresh
# REPO=my-project	APPROVED	2026-01-19-auth-refresh	ready to implement
# Exit code: 0
```

### Step 8: Implementation

```bash
vdev run 2026-01-19-auth-refresh
# REPO=my-project	RUN_ALLOWED	2026-01-19-auth-refresh
# Exit code: 0

# → 実装開始
```

---

## 2. Status Patterns

| Status | Exit Code | 説明 | 次のアクション |
|--------|-----------|------|---------------|
| NEEDS_INSTRUCTION | 10 | instruction.md 未作成 | `vdev instruction` |
| NEEDS_PLAN | 11 | plan.md 未作成 | `vdev plan` |
| NEEDS_REVIEW | 12 | review.md 未作成 | `vdev review` |
| NEEDS_CHANGES | 13 | 修正要求 / Status 抽出失敗 | plan 修正後に再レビュー |
| REJECTED | 14 | 方針却下 | 計画の見直し |
| APPROVED | 0 | 実装 GO | `vdev run` で実装開始 |
| BROKEN_STATE | 20 | 整合性エラー | rollback.md 参照 |

---

## 3. Listing Topics

```bash
# 全トピック表示（updatedAt 降順）
vdev ls
# REPO=my-project	2026-01-19-auth-refresh	APPROVED	Auth Refresh	2026-01-19T10:30:00+09:00
# REPO=my-project	2026-01-19-bugfix	NEEDS_REVIEW	Bug Fix	2026-01-19T09:00:00+09:00
```

---

## 4. Plan 更新時のフロー

plan を更新すると**承認は自動的に無効化**される。

```bash
# 既存の APPROVED 状態
vdev gate 2026-01-19-auth-refresh
# Exit code: 0 (APPROVED)

# plan を更新
cat new-plan.md | vdev plan 2026-01-19-auth-refresh --stdin
# REPO=my-project	PLAN_SAVED	2026-01-19-auth-refresh

# 承認が無効化された
vdev gate 2026-01-19-auth-refresh
# REPO=my-project	NEEDS_CHANGES	2026-01-19-auth-refresh	changes requested
# Exit code: 13

# 再レビューが必要
cat << 'EOF' | vdev review 2026-01-19-auth-refresh --stdin
Status: APPROVED

修正内容を確認し、再承認します。
EOF
```

---

## 5. stdin 処理の詳細

### LF 正規化

全ての stdin 入力は保存時に CRLF → LF に変換される。

```bash
# Windows からのコピペでも正規化される
printf "line1\r\nline2\r\n" | vdev plan topic --stdin
# 保存時: "line1\nline2\n"
```

### ハッシュ計算

正規化後のコンテンツで SHA256 ハッシュが計算される。

### updatedAt 更新

instruction/plan/review 保存時に `meta.timestamps.updatedAt` が JST で更新される。

---

## 6. Warnings and Errors

### Status 抽出失敗

```bash
echo "レビュー完了" | vdev review topic --stdin
# REPO=my-project	REVIEW_SAVED	topic	NEEDS_CHANGES

# Status: 行がないため NEEDS_CHANGES に強制される
```

**正しい形式:**
```
Status: APPROVED
Status: REJECTED
Status: NEEDS_CHANGES
```

### BROKEN_STATE

```bash
vdev gate topic
# REPO=my-project	BROKEN_STATE	topic	hash mismatch in APPROVED/REJECTED state
# Exit code: 20
```

**原因:**
- meta.json の手動編集
- plan.md / review.md の手動編集
- ファイルの削除

**対処:** `docs/rollback.md` 参照

---

## 7. スクリプトでの利用

```bash
#!/bin/bash
TOPIC="2026-01-19-auth-refresh"

# gate チェック
if vdev gate "$TOPIC" > /dev/null 2>&1; then
    echo "Implementation allowed"
    # 実装処理
else
    exit_code=$?
    case $exit_code in
        10) echo "Need instruction" ;;
        11) echo "Need plan" ;;
        12) echo "Need review" ;;
        13) echo "Changes requested" ;;
        14) echo "Rejected" ;;
        20) echo "Broken state - check meta.json" ;;
    esac
    exit $exit_code
fi
```

---

## 8. Best Practices

1. **plan.md は vdev コマンド経由でのみ更新する**
   - 手動編集は BROKEN_STATE の原因になる

2. **review.md には必ず Status: 行を含める**
   - 省略すると NEEDS_CHANGES になる

3. **状態確認は vdev gate を使う**
   - meta.json を直接読まない

4. **Git コミットは gate 通過後に行う**
   - APPROVED 状態でコミットすることで履歴を明確に

5. **instruction.md は計画の背景を記録する**
   - gate 条件には含まれないが、文脈の保存に有用
