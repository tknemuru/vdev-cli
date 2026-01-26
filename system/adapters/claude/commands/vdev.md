# 自律オーケストレーター（vdev）

現在の `vdev gate` と PR 状態に基づいて、次に実行すべきアクションを判断し、
適切なロール（Implementer / Reviewer）を起動する。

## 入力要件

- `<topic>`: vdev topic 名（必須）

例: `vdev gate 2026-01-22-example-topic`

## 責務境界

vdev コマンドは **副作用を持たない**（状態判定と委譲のみ）。
PR 作成等の副作用はロール（Implementer/Reviewer）に委譲する。

## 実行手順

### 1. Gate 状態の取得

```bash
vdev gate <topic>
```

Exit Code と状態を取得する。

### 2. 状態に応じた分岐

| Gate 状態 | Exit Code | アクション |
|----------|-----------|-----------|
| NEEDS_INSTRUCTION | 10 | 「instruction.md 作成待ち（Human）」と出力し停止 |
| NEEDS_PLAN | 11 | Implementer を起動（plan.md 作成） |
| NEEDS_DESIGN_REVIEW | 12 | Reviewer を起動（Plan Review → Design Review） |
| DESIGN_APPROVED | 13 | `vdev start <topic>` 実行後、Implementer を起動 |
| IMPLEMENTING | 14 | Implementer を起動（実装継続） |
| NEEDS_IMPL_REPORT | 15 | Implementer を起動（impl.md 作成） |
| NEEDS_IMPL_REVIEW | 16 | Reviewer を起動（Impl Review） |
| DONE | 0 | DONE 分岐処理へ |
| REJECTED | 17 | 「設計却下により終了」と出力し停止 |
| BROKEN_STATE | 20 | 「状態不整合、Human による修復が必要」と出力し停止 |

### 3. DONE 分岐処理

DONE の場合、PR 検出とリスク分類に基づいて処理を行う。

#### 3.1 PR 検出

```bash
gh pr view --json number,url
```

- **PR 未検出**: 「PR が存在しません。Implementer として PR を作成してください」と出力し、Implementer を起動して停止
- **PR 検出成功**: リスク分類判定へ進む

#### 3.2 リスク分類の判定

優先順位:

1. **PR ラベル**: `gh pr view --json labels` で `risk:R1`, `risk:R2`, `risk:R3` を確認
2. **PR 本文**: `gh pr view --json body` で `^Risk:\s*(R[123])\s*$` を検索
3. **vdev 成果物**: instruction.md / plan.md の Risk Assessment セクションを確認

いずれも見つからない場合:
- R2 として扱う
- `gh pr edit <PR_NUMBER> --add-label "risk:R2"` でラベルを付与
- 「リスク分類: フォールバックにより R2 を適用」と記録

#### 3.3 リスク分類別の処理

**R1/R2 の場合:**

1. 必須チェック確認:
   ```bash
   gh pr checks <PR_NUMBER>
   ```
2. 全チェック pass の場合:
   ```bash
   gh pr merge <PR_NUMBER> --merge
   ```
3. チェック失敗の場合:
   - 「必須チェック失敗、Implementer に修正を委譲」と出力
   - Implementer を起動

**R3 の場合:**

- 「R3 のため Human による最終 Approve / Merge を待機」と出力し停止

## ロール起動

Implementer / Reviewer を起動する際は、`.claude/subagents/` 配下の定義に従って実行する:

- **Implementer**: `.claude/subagents/implementer.md`
- **Reviewer**: `.claude/subagents/reviewer.md`
