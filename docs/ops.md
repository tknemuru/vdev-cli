# vdev Operations Guide（v2.0）

## 1. Daily Workflow（公式フロー：DONE まで）

### Step 1: Create Topic

vdev new auth-refresh

```bash
# REPO=my-project	CREATED	2026-01-19-auth-refresh	docs/plans/2026-01-19-auth-refresh/
```

---

### Step 2: Write Instruction

cat << 'EOF' | vdev instruction 2026-01-19-auth-refresh --stdin
# 認証トークンのリフレッシュ機能

要件：
- リフレッシュトークンの自動更新
- 有効期限切れ時のリダイレクト
EOF

```bash
# REPO=my-project	INSTRUCTION_SAVED	2026-01-19-auth-refresh
```

---

### Step 3: Gate Check（NEEDS_PLAN 確認）

vdev gate 2026-01-19-auth-refresh

```bash
# REPO=my-project	NEEDS_PLAN	2026-01-19-auth-refresh	plan.md not found
# Exit code: 11
```

---

### Step 4: Create Plan（Claude が生成 → vdev plan で登録）

cat plan.md | vdev plan 2026-01-19-auth-refresh --stdin

```bash
# REPO=my-project	PLAN_SAVED	2026-01-19-auth-refresh
```

#### Plan 作成結果の取り込み（WSL + Windows 環境）

Claude が生成した plan（例: `plan.md`）は、以下のコマンドで **クリップボードへのコピー**と  
**`vdev plan` への流し込み**を同時に行うことを推奨する。

```bash
cat plan.md | vdev plan <TOPIC> --stdin
cat plan.md | iconv -f UTF-8 -t UTF-16LE | /mnt/c/Windows/System32/clip.exe

```

---

### Step 5: Gate Check（NEEDS_DESIGN_REVIEW 確認）

vdev gate 2026-01-19-auth-refresh

```bash
# REPO=my-project	NEEDS_DESIGN_REVIEW	2026-01-19-auth-refresh	design-review.md not found
# Exit code: 12
```

---

### Step 6: Design Review（人間/ChatGPT）

cat << 'EOF' | vdev review 2026-01-19-auth-refresh --stdin
Status: DESIGN_APPROVED

Summary:
- 要約（1〜3行）

Requests:
- 修正要求（必要な場合のみ）

Verify:
- 確認方法（コマンドまたは手順）

Rollback:
- 切り戻し方針（1行）
EOF

```bash
# REPO=my-project	DESIGN_REVIEW_SAVED	2026-01-19-auth-refresh	DESIGN_APPROVED
```

---

### Step 7: Gate Check（DESIGN_APPROVED 確認）

vdev gate 2026-01-19-auth-refresh

```bash
# REPO=my-project	DESIGN_APPROVED	2026-01-19-auth-refresh	ready to implement
# Exit code: 13
```

---

### Step 8: Start Implementation（実装開始宣言）

vdev start 2026-01-19-auth-refresh

```bash
# REPO=my-project	IMPLEMENTING	2026-01-19-auth-refresh
# Exit code: 0
```

---

### Step 9: Implementation（Claude Code が実装）

- Claude Code に実装を実行させる
- 実装が完了したら Step 10 で実装完了報告を登録する

---

### Step 10: Implementation Report（Claude が実装完了報告 → vdev impl で登録）

cat impl.md | vdev impl 2026-01-19-auth-refresh --stdin

```bash
# REPO=my-project	IMPL_SAVED	2026-01-19-auth-refresh
```

推奨フォーマット（impl.md 内）：
[Summary]
[Files Changed]
[Tests]
[Verify]
[Docs]
[Risks]

---

### Step 11: Implementation Review（人間/ChatGPT）

cat << 'EOF' | vdev impl-review 2026-01-19-auth-refresh --stdin
Status: DONE

Summary:
- 要約（1〜3行）

Requests:
- 修正要求（必要な場合のみ）

Verify:
- 確認方法（コマンドまたは手順）

Rollback:
- 切り戻し方針（1行）
EOF

```bash
# REPO=my-project	IMPL_REVIEW_SAVED	2026-01-19-auth-refresh	DONE
```

---

### Step 12: Final Gate Check（DONE 確認）

vdev gate 2026-01-19-auth-refresh

```bash
# REPO=my-project	DONE	2026-01-19-auth-refresh	done
# Exit code: 0
```

---

## 2. Review Loop（差戻しの往復）

### 2.1 設計差戻し（NEEDS_CHANGES）

- design-review に `Status: NEEDS_CHANGES` を書く
- vdev は status を NEEDS_PLAN に戻す（設計のやり直し）
- Claude Code が plan を修正し、vdev plan で再登録
- 再度 design-review を行う

---

### 2.2 実装差戻し（NEEDS_CHANGES）

- impl-review に `Status: NEEDS_CHANGES` を書く
- vdev は status を IMPLEMENTING に戻す（実装修正）
- Claude Code が修正し、vdev impl で再登録
- 再度 impl-review を行う

---

## 3. Warnings and Errors

### 3.1 Status 抽出失敗

Status 行が規定フォーマットに一致しない場合、コマンドは COMMAND_ERROR(1) とする。
（状態遷移は行わない）

### 3.2 前提条件違反

plan/review/start/impl/impl-review は前提条件を満たさない場合に COMMAND_ERROR(1) とする。
（状態遷移は行わない）

---

## 4. Best Practices

1. docs/plans/<topic>/ 配下を手動編集しない（BROKEN_STATE の原因になる）
2. gate は必ず次の行動を決めるために使う
3. DONE の達成感は vdev ls と vdev gate（Exit 0）で視覚化する
4. Verify は「具体コマンド＋成功条件」を必ず記録する

---

## 5. CLAUDE.md 運用ルール

### 正本の扱い

- vdev フローで使用する CLAUDE.md の正本は以下に配置する：

  ~/.vdev/CLAUDE.md

- このファイルは vdev フロー全体に共通な方針のみを記載する。

### リポジトリ側の扱い

- 各リポジトリの CLAUDE.md は正本から同期された内容であることを前提とする。
- リポジトリ内で直接編集してはならない。

### 運用上の意図

- vdev フローの変更時に複数リポジトリを手動修正する事態を避けるため、
  CLAUDE.md は単一正本運用とする。

### 同期コマンド

```bash
# 差分確認（同期しない）
vdev sync

# 強制同期
vdev sync --force
```

### vdev new 実行時の同期

- vdev new は内部で sync 相当を実行する
- 差分がある場合（--force なし）:
  - topic は作成される
  - 同期のみ失敗し exit=1
  - stderr に `vdev sync --force` の案内を出力
- --force は同期のみに作用（topic 作成の意味は変えない）
- グローバル正本（~/.vdev/CLAUDE.md）が存在しない場合:
  - topic は作成される
  - 同期は失敗し exit=1
