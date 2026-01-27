# Implementation Report: system ドキュメント一括修正（Attempt モデル対応）

## 概要

vdev-cli の Attempt モデル導入に合わせて、system 配下の正本ドキュメントを更新した。

## 変更ファイル一覧

| ファイル | 変更内容 |
|----------|----------|
| system/adapters/claude/CLAUDE.md | Section 14.4 状態遷移表修正、Section 16.4 hash mismatch 修正、Section 17 Attempt モデル追加 |
| system/docs/spec/vdev-spec.md | Section 8.1 Gate Decision Table 修正、Section 8.3 NEEDS_CHANGES 説明修正、Section 8.4 Attempt モデル追加 |
| system/adapters/claude/subagents/implementer.md | 差戻しループ説明を Attempt モデルに更新 |
| system/adapters/claude/subagents/reviewer.md | Attempt 履歴セクションを Attempt モデルに更新 |
| system/docs/flow/vdev-flow.md | Section 2.3, 4.2, 5.2, 5.3, Appendix A を Attempt モデルに更新 |

## Verify 結果

### 1. .claude 配下に差分が無いことを確認

```bash
$ git diff --name-only | grep '^\.claude/' | wc -l
0
```

**結果**: PASS（.claude 配下に差分なし）

### 2. 修正対象が system/ 配下のみであることを確認

```bash
$ git diff --name-only | grep -v '^system/' | grep -v '^docs/plans/' | wc -l
0
```

**結果**: PASS（system/ 配下のみ変更）

### 3. vdev-cli テストが引き続き PASS

```bash
$ cd cli && npm test

 ✓ test/sync.test.ts  (41 tests) 265ms
 ✓ test/gate.test.ts  (42 tests) 2372ms
 ✓ test/commands.test.ts  (23 tests) 1541ms
 ✓ test/attempt.test.ts  (9 tests) 6ms
 ✓ test/slug.test.ts  (9 tests) 2ms
 ✓ test/hashes.test.ts  (3 tests)
 ✓ test/normalize.test.ts  (3 tests)

 Test Files  7 passed (7)
      Tests  130 passed (130)
```

**結果**: PASS（130 tests passed）

## DoD 達成根拠

- [x] 全ドキュメントで NEEDS_CHANGES → NEEDS_DESIGN_REVIEW (12) に統一
- [x] hash mismatch がエラーではないことを CLAUDE.md に明記
- [x] Attempt モデルの説明を CLAUDE.md / vdev-spec.md に追記
- [x] .claude 配下に差分が無い
- [x] system/ 配下のみが変更されている
- [x] vdev-cli テストが PASS

## 残課題

なし
