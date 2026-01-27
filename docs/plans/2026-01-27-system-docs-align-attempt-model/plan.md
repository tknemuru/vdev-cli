# Plan: system ドキュメント一括修正（Attempt モデル対応）

## 概要

vdev-cli の Attempt モデル導入に合わせて、system 配下の正本ドキュメントを一括更新する。
旧仕様（単一 review ファイル前提、NEEDS_CHANGES → NEEDS_PLAN、hash 不一致 = BROKEN_STATE 等）を排除し、
新仕様と整合させる。

## 現状分析

### 不整合 1: NEEDS_CHANGES の状態遷移

| 項目 | 現ドキュメント | 実装 |
|------|----------------|------|
| design-review NEEDS_CHANGES | NEEDS_PLAN (11) | NEEDS_DESIGN_REVIEW (12) |
| impl-review NEEDS_CHANGES | IMPLEMENTING (14) | IMPLEMENTING (14) ✅ |

**該当箇所**:
- vdev-spec.md Section 8.1 Line 221
- vdev-spec.md Section 8.3 Lines 243-244
- CLAUDE.md Section 14.4

### 不整合 2: hash mismatch の扱い

| 項目 | 現ドキュメント | 実装 |
|------|----------------|------|
| CLAUDE.md 16.4 | hash mismatch → BROKEN_STATE | hash 不一致はエラーではない |
| vdev-spec.md 5.4 | hash 不一致はエラー条件ではない ✅ | ✅ |

### 不整合 3: Attempt モデルの記載

全ドキュメントで Attempt モデル（design-review/attempt-*.md, impl-review/attempt-*.md）への言及がない。

## 修正対象ファイル

### A) Claude Adapter（正本）

| ファイル | 修正内容 |
|----------|----------|
| system/adapters/claude/CLAUDE.md | NEEDS_CHANGES 遷移先修正、hash mismatch 修正、Attempt モデル追記 |
| system/adapters/claude/subagents/implementer.md | Attempt モデルに合わせた差戻しループ説明更新 |
| system/adapters/claude/subagents/reviewer.md | Attempt 履歴管理の説明更新 |
| system/adapters/claude/commands/vdev.md | 状態遷移表の NEEDS_DESIGN_REVIEW 修正 |

### B) Docs（SoT）

| ファイル | 修正内容 |
|----------|----------|
| system/docs/spec/vdev-spec.md | Gate Decision Table 修正、Attempt モデル追記 |
| system/docs/flow/vdev-flow.md | 状態遷移説明修正、Attempt モデル追記 |

### C) その他（影響確認のみ）

- system/adapters/claude/commands/merge.md
- system/adapters/claude/commands/push.md
- system/adapters/claude/reviewer-principles.md
- system/docs/guides/vibe-coding-partner.md

## 詳細修正内容

### 1. system/adapters/claude/CLAUDE.md

#### Section 14.4（差戻し時の状態遷移）

**現状**:
```markdown
| Design Review (`vdev review`) | NEEDS_PLAN | `vdev plan <topic> --stdin` | Implementer |
```

**修正後**:
```markdown
| Design Review (`vdev review`) | NEEDS_DESIGN_REVIEW | 新 design-review attempt 追加 | Reviewer |
```

#### Section 16.4（Hash 整合性）

**現状**:
```markdown
- DONE / REJECTED 状態では、Canonical 成果物の hash 一致が必須である
- hash mismatch が検出された場合、状態は BROKEN_STATE となる
```

**修正後**:
```markdown
- hash 不一致はエラー条件ではない（vdev-spec.md 準拠）
- vdev gate は正本から hash を再計算し meta.json を同期更新する
```

#### 新セクション追加: Attempt モデル

```markdown
## 17. Attempt モデル（レビュー履歴）

### 17.1 ディレクトリ構造

design-review と impl-review は Attempt（履歴）を積む:

docs/plans/<topic>/
├── design-review/
│   ├── attempt-001.md
│   └── attempt-002.md  ← 最新
├── impl-review/
│   └── attempt-001.md
├── design-review.md     （旧形式、互換用）
└── impl-review.md       （旧形式、互換用）

### 17.2 gate の解釈

- attempt ディレクトリが存在する場合: 最新 attempt のみを解釈
- attempt が無い場合: 旧単一ファイル（design-review.md / impl-review.md）を互換的に読む
- 最新 attempt の Status が NEEDS_CHANGES の場合:
  - design-review: gate は NEEDS_DESIGN_REVIEW (12) を返す
  - impl-review: gate は IMPLEMENTING (14) を返す

### 17.3 スタック回避

- NEEDS_CHANGES は新しい attempt を追加することで解消する
- 旧 attempt は履歴として残るが、gate は最新 attempt のみを見る
```

### 2. system/docs/spec/vdev-spec.md

#### Section 8.1 Gate Decision Table

**現状 Line 221**:
```
| 7 | design-review.md に Status: NEEDS_CHANGES | NEEDS_PLAN | 11 |
```

**修正後**:
```
| 7 | design-review に Status: NEEDS_CHANGES | NEEDS_DESIGN_REVIEW | 12 |
```

#### Section 8.3 NEEDS_CHANGES の扱い

**現状**:
```markdown
- design-review.md に Status: NEEDS_CHANGES がある場合
  - 状態は NEEDS_PLAN に戻る
```

**修正後**:
```markdown
- design-review（最新 attempt）に Status: NEEDS_CHANGES がある場合
  - 状態は NEEDS_DESIGN_REVIEW に戻る
  - 新しい attempt を追加することで前進する
```

#### 新セクション追加: Attempt モデル仕様

Section 8 の後に追加:

```markdown
## 8.4 Attempt モデル（v3.1 新設）

### レビュー成果物のディレクトリ構造

design-review および impl-review は Attempt（履歴）方式で管理できる。

<topic>/design-review/attempt-001.md
<topic>/design-review/attempt-002.md
<topic>/impl-review/attempt-001.md

### gate の解釈

1. attempt ディレクトリ（design-review/ または impl-review/）が存在するか確認
2. 存在する場合: attempt-*.md を列挙し、番号で最大のものを最新として採用
3. 存在しない場合: 旧単一ファイル（design-review.md / impl-review.md）を互換的に読む
4. 最新 attempt の Status を解釈して状態を導出

### 互換性

- 旧形式（単一ファイル）の topic は引き続き解釈可能
- attempt ディレクトリと旧単一ファイルが共存する場合、attempt が優先
```

### 3. system/adapters/claude/subagents/implementer.md

#### 差戻しループ対応セクション

**現状**:
```markdown
### Design Review 差戻し時（Status: NEEDS_CHANGES）

gate が NEEDS_PLAN に戻った場合:
```

**修正後**:
```markdown
### Design Review 差戻し時（Status: NEEDS_CHANGES）

gate が NEEDS_DESIGN_REVIEW に戻った場合:
（注: Attempt モデルでは、新しい design-review attempt が追加されることで前進する）
```

### 4. system/adapters/claude/commands/vdev.md

状態遷移表の NEEDS_CHANGES 行を修正。

## Verify

```bash
# 1. .claude 配下に差分が無いことを確認
git diff --name-only | grep '^\.claude/' | wc -l
# 期待: 0

# 2. 修正対象が system/ 配下のみであることを確認
git diff --name-only | grep -v '^system/' | grep -v '^docs/plans/' | wc -l
# 期待: 0

# 3. vdev-cli テストが引き続き PASS
cd cli && npm test
# 期待: 130 tests passed
```

## DoD

- [ ] 全ドキュメントで NEEDS_CHANGES → NEEDS_DESIGN_REVIEW (12) に統一
- [ ] hash mismatch がエラーではないことを CLAUDE.md に明記
- [ ] Attempt モデルの説明を CLAUDE.md / vdev-spec.md に追記
- [ ] .claude 配下に差分が無い
- [ ] system/ 配下のみが変更されている
- [ ] vdev-cli テストが PASS

## 必須ドキュメント更新要否

- docs/spec.md: **該当なし**（本プロジェクトは vdev 自体であり、vdev-spec.md が該当）
- docs/ops.md: **該当なし**
- docs/arch.md: **該当なし**

本トピックの変更対象は system/ 配下の正本ドキュメントのみ。
