# Implementation Report: vdev-cli 改修（vdev-spec v3.0.0 準拠）

## 概要

vdev gate を「状態導出 + meta 同期（reconcile）」として v3.0.0 仕様に準拠させた。

## 変更ファイル一覧

| ファイル | 変更内容 |
|---------|----------|
| `src/core/gate.ts` | v3.0.0 gate ロジックに全面置換 |
| `test/gate.test.ts` | v3 仕様のテストに全面更新 |

**.claude 配下は変更なし**（重要制約を遵守）

## 反映した改修内容

### src/core/gate.ts

1. **hash 不一致による BROKEN_STATE 判定を削除**
   - Priority 2（DONE/REJECTED + hash mismatch → BROKEN_STATE）を完全削除
   - v3 では hash 不一致はエラー条件にならない

2. **md 優先の状態導出ロジックを実装**
   - Step A: meta.json パース不能 → BROKEN_STATE (20)
   - Step B: instruction.md 欠落 → NEEDS_INSTRUCTION (10)
   - Step C: plan.md 欠落 → NEEDS_PLAN (11)
   - Step D: design-review.md 欠落 → NEEDS_DESIGN_REVIEW (12)
   - Step E: design-review.md Status 解析
     - 規約外 → COMMAND_ERROR (1)、meta.json 更新なし
     - REJECTED → REJECTED (17)
     - NEEDS_CHANGES → NEEDS_PLAN (11)
     - DESIGN_APPROVED → Step F へ
   - Step F: 実装フェーズ
     - impl-review.md あり + Status 解析
       - 規約外 → COMMAND_ERROR (1)、meta.json 更新なし
       - DONE → DONE (0)
       - NEEDS_CHANGES → IMPLEMENTING (14)
     - impl.md あり + impl-review.md なし → NEEDS_IMPL_REVIEW (16)
     - impl.md なし → meta.status を補助情報として互換的に導出

3. **reconcile（meta.json 同期更新）を実装**
   - 状態導出成功時のみ meta.json を更新
   - meta.status を導出状態に合わせる
   - timestamps.updatedAt を更新
   - 存在する md の hashes を再計算して反映
   - COMMAND_ERROR / BROKEN_STATE 時は meta.json を更新しない

4. **Status 行パーサを gate.ts 内に追加**
   - `extractDesignReviewStatus()`: DESIGN_APPROVED | REJECTED | NEEDS_CHANGES
   - `extractImplReviewStatus()`: DONE | NEEDS_CHANGES
   - 規約外の場合は null を返し、COMMAND_ERROR (1) になる

### test/gate.test.ts

1. **v2 テストを v3 テストに全面更新**
   - 「hash mismatch → BROKEN_STATE」テストを「hash mismatch でも状態を返す」テストに変更

2. **新規テストケース追加**
   - hash 不一致でも DONE を返す
   - hash 不一致でも REJECTED を返す
   - planSha256 が null でも DONE を返す
   - DONE から IMPLEMENTING への巻き戻り
   - Status 行規約外で COMMAND_ERROR、meta.json 更新なし
   - reconcile による meta.json hashes / status / timestamps 更新

## Verify 実行結果

### 1. テストスイート全実行

```bash
$ npm test

> vdev-cli@2.0.0 test
> vitest run

 ✓ test/sync.test.ts  (43 tests) 270ms
 ✓ test/gate.test.ts  (28 tests) 1289ms
 ✓ test/commands.test.ts  (23 tests) 1456ms
 ✓ test/slug.test.ts  (9 tests) 2ms
 ✓ test/hashes.test.ts  (3 tests)
 ✓ test/normalize.test.ts  (3 tests)

 Test Files  6 passed (6)
      Tests  109 passed (109)
```
**exit code: 0** - PASS

### 2. .claude 配下に差分がないこと

```bash
$ git diff --name-only .claude/
(no output)
```
**exit code: 0** - PASS

### 3. gate コマンド動作確認

```bash
$ vdev gate 2026-01-26-vdev-cli-v3-reconcile-gate
REPO=vdev-cli	NEEDS_IMPL_REPORT	2026-01-26-vdev-cli-v3-reconcile-gate	impl.md not found
```
**exit code: 15** - PASS（IMPLEMENTING 状態で impl.md がない → NEEDS_IMPL_REPORT）

## DoD 充足確認

| DoD 項目 | 状態 |
|---------|------|
| vdev gate が v3.0.0 仕様どおりに動作する | PASS |
| hash 不一致で BROKEN_STATE が出ない（DONE/REJECTED も含む） | PASS |
| Status 行規約外は COMMAND_ERROR（exit 1）で停止し、meta.json を更新しない | PASS |
| meta.json パース不能は BROKEN_STATE（exit 20） | PASS |
| テストが更新され、v3 の挙動が固定されている | PASS |
| .claude 配下に差分がない | PASS |

## ブランチ情報

- 作業ブランチ: `feature/2026-01-26-vdev-cli-v3-reconcile-gate`

## 注意事項

- 本トピックは R3（高リスク）のため、Human による最終 Approve / Merge が必要
- 既存の exit code は維持（0/10/11/12/13/14/15/16/17/20/1）
