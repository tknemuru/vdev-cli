# Plan: vdev-cli Attempt モデル導入（gate 判定更新）

## 概要

design-review / impl-review を Attempt モデルへ移行し、gate 判定ロジックを更新する。
NEEDS_CHANGES のスタックを解消し、新しい attempt 追加で前進できるフローを実現する。

## 現状分析

### 現行 gate ロジック（gate.ts）

| Step | 条件 | 結果 |
|------|------|------|
| A | meta.json パース不能 | BROKEN_STATE (20) |
| B | instruction.md 無し | NEEDS_INSTRUCTION (10) |
| C | plan.md 無し | NEEDS_PLAN (11) |
| D | design-review.md 無し | NEEDS_DESIGN_REVIEW (12) |
| E | design-review.md Status 抽出 | REJECTED/NEEDS_CHANGES/DESIGN_APPROVED |
| F | 実装フェーズ判定 | DONE/IMPLEMENTING/NEEDS_IMPL_REVIEW/DESIGN_APPROVED |

### 問題点

- design-review.md / impl-review.md は単一ファイル前提
- NEEDS_CHANGES 時に plan を修正しても、レビュー結果が残り続ける（スタック）
- ファイル削除や無効化コマンドが必要

## Attempt モデル仕様

### ディレクトリ構造

```
docs/plans/<topic>/
├── design-review/
│   ├── attempt-001.md  # 最初のレビュー
│   ├── attempt-002.md  # 修正後の再レビュー
│   └── ...
├── impl-review/
│   ├── attempt-001.md
│   └── ...
├── design-review.md     # 旧形式（互換用）
└── impl-review.md       # 旧形式（互換用）
```

### 最新 attempt の選択ルール

1. `<review-type>/attempt-*.md` をグロブで列挙
2. ファイル名の番号部分（attempt-XXX）でソート
3. 最大番号のファイルを最新として採用
4. attempt が無い場合のみ、旧単一ファイル（design-review.md / impl-review.md）を互換的に読む

### Status と gate 結果の対応

#### design-review

| 最新 attempt の Status | gate 結果 | Exit Code |
|------------------------|-----------|-----------|
| DESIGN_APPROVED | DESIGN_APPROVED または実装フェーズへ | 13 / 14 / 15 / 16 / 0 |
| REJECTED | REJECTED | 17 |
| NEEDS_CHANGES | NEEDS_DESIGN_REVIEW | 12 |
| (規約外) | COMMAND_ERROR | 1 |

**重要**: NEEDS_CHANGES は NEEDS_PLAN (11) ではなく NEEDS_DESIGN_REVIEW (12) を返す。
これにより、新しい attempt 追加で前進できる。

#### impl-review

| 最新 attempt の Status | gate 結果 | Exit Code |
|------------------------|-----------|-----------|
| DONE | DONE | 0 |
| NEEDS_CHANGES | IMPLEMENTING | 14 |
| (規約外) | COMMAND_ERROR | 1 |

## 実装タスク

### Task 1: paths.ts に attempt 用パス関数を追加

**変更ファイル**: `cli/src/core/paths.ts`

追加する関数:
- `getDesignReviewDir(topic: string): string` - design-review ディレクトリパス
- `getImplReviewDir(topic: string): string` - impl-review ディレクトリパス

### Task 2: attempt 探索ロジックの実装

**新規ファイル**: `cli/src/core/attempt.ts`

```typescript
interface AttemptResult {
  found: boolean;
  path: string | null;
  attemptNumber: number | null;
}

function findLatestAttempt(dir: string): AttemptResult
// attempt-*.md を列挙し、最大番号のファイルパスを返す
```

### Task 3: gate.ts の更新

**変更ファイル**: `cli/src/core/gate.ts`

変更内容:
1. Step D を修正: design-review ディレクトリの attempt を優先的に探索
2. Step E を修正: NEEDS_CHANGES → NEEDS_DESIGN_REVIEW (12) を返す（現行は NEEDS_PLAN (11)）
3. Step F1 を修正: impl-review ディレクトリの attempt を優先的に探索
4. 互換処理: attempt が無い場合のみ旧単一ファイルを読む

#### 修正後の Step D ロジック

```
1. design-review/attempt-*.md を探索
2. attempt が見つかった場合:
   - 最新 attempt の Status を読む
   - 規約外 → COMMAND_ERROR (1)
   - NEEDS_CHANGES → NEEDS_DESIGN_REVIEW (12)  ← 変更点
   - REJECTED → REJECTED (17)
   - DESIGN_APPROVED → 次へ
3. attempt が無い場合:
   - design-review.md があれば互換的に読む（現行ロジック維持）
   - design-review.md も無ければ NEEDS_DESIGN_REVIEW (12)
```

### Task 4: テスト追加

**変更ファイル**: `cli/test/gate.test.ts`

追加するテストケース:

#### A. 設計レビュー Attempt モデル

```typescript
describe('Attempt model: design-review', () => {
  it('NEEDS_CHANGES in latest attempt -> NEEDS_DESIGN_REVIEW (12)', ...);
  it('DESIGN_APPROVED in latest attempt -> DESIGN_APPROVED (13) or impl phase', ...);
  it('REJECTED in latest attempt -> REJECTED (17)', ...);
  it('invalid Status in latest attempt -> COMMAND_ERROR (1)', ...);
});
```

#### B. スタック回避

```typescript
describe('Attempt model: stack avoidance', () => {
  it('attempt-001 NEEDS_CHANGES + attempt-002 DESIGN_APPROVED -> uses attempt-002', ...);
});
```

#### C. 実装レビュー Attempt モデル

```typescript
describe('Attempt model: impl-review', () => {
  it('NEEDS_CHANGES in latest attempt -> IMPLEMENTING (14)', ...);
  it('DONE in latest attempt -> DONE (0)', ...);
  it('invalid Status in latest attempt -> COMMAND_ERROR (1)', ...);
});
```

#### D. 互換（旧単一ファイル）

```typescript
describe('Attempt model: backward compatibility', () => {
  it('no attempt dir + design-review.md exists -> reads legacy file', ...);
  it('no attempt dir + impl-review.md exists -> reads legacy file', ...);
  it('attempt dir exists but empty + legacy file exists -> reads legacy file', ...);
});
```

#### E. エラー・破損

```typescript
describe('Attempt model: errors', () => {
  it('invalid Status in latest attempt -> COMMAND_ERROR, no meta update', ...);
  it('unparseable meta.json -> BROKEN_STATE, no meta update', ...);
});
```

### Task 5: attempt.test.ts 追加

**新規ファイル**: `cli/test/attempt.test.ts`

attempt 探索ロジックの単体テスト:
- 番号ソートが正しいこと
- ゼロ埋めと非ゼロ埋めの混在時の挙動
- 空ディレクトリ時の挙動
- ディレクトリ不存在時の挙動

## Verify（必須）

```bash
# 1. 全テスト実行
cd cli && npm test

# 2. .claude 配下に差分が無いことを確認
git diff --name-only | grep '^\.claude/' | wc -l
# 期待: 0

# 3. 手動シナリオ検証
# テスト用 topic を作成し、attempt-001.md を追加して gate が正しく解釈することを確認
```

## 変更ファイル一覧

| ファイル | 変更種別 |
|----------|----------|
| cli/src/core/paths.ts | 修正（関数追加） |
| cli/src/core/attempt.ts | 新規 |
| cli/src/core/gate.ts | 修正 |
| cli/test/gate.test.ts | 修正（テスト追加） |
| cli/test/attempt.test.ts | 新規 |

## DoD（完了条件）

- [ ] gate が Attempt モデルで最新 attempt のみを解釈する
- [ ] NEEDS_CHANGES がスタックしない（design-review で NEEDS_DESIGN_REVIEW を返す）
- [ ] Status 規約外は COMMAND_ERROR (exit 1) で停止し meta を更新しない
- [ ] meta.json パース不能は BROKEN_STATE (exit 20) で停止し meta を更新しない
- [ ] 旧 topic（単一 review ファイル）を暫定互換で解釈できる
- [ ] .claude 配下に差分が無い
- [ ] 全テスト PASS

## 必須ドキュメント更新要否

- docs/spec.md: **更新不要**（vdev-cli の内部実装変更、外部仕様は変わらない）
- docs/ops.md: **更新不要**（運用手順に変更なし）
- docs/arch.md: **更新不要**（設計境界・判断に変更なし）

instruction.md に明記の通り、ドキュメント修正は本トピックでは行わない（別トピック）。

## DB / スキーマ

本プロジェクトは DB を持たないため、対象外。
