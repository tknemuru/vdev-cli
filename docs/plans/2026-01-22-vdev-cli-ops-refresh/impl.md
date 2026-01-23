# Implementation Report: vdev-cli ops.md 刷新

## Summary

ops.md を「vdev-cli の運用ガイド」として全面改稿した。Step 番号ベースの構成を廃止し、状態（gate）駆動の構成に改めた。

## Files Changed

| ファイル | 変更内容 |
|---------|---------|
| docs/ops.md | 全面改稿 |

## Implementation Details

### 構成変更

旧構成:
- Daily Workflow（Step 1〜12）
- Review Loop
- Warnings and Errors
- Best Practices
- CLAUDE.md / vdev-flow.md 運用ルール

新構成:
1. はじめに（位置づけ・非対象・参照先）
2. 状態別操作リファレンス（10 状態すべてを網羅）
3. 差戻し時の挙動
4. CLI 運用上の注意点
5. 同期・初期化コマンド
6. vdev ls

### 状態別操作リファレンス

全 10 状態について以下を記述:
- NEEDS_INSTRUCTION（Exit Code: 10）
- NEEDS_PLAN（Exit Code: 11）
- NEEDS_DESIGN_REVIEW（Exit Code: 12）
- DESIGN_APPROVED（Exit Code: 13）
- IMPLEMENTING（Exit Code: 14）
- NEEDS_IMPL_REPORT（Exit Code: 15）
- NEEDS_IMPL_REVIEW（Exit Code: 16）
- DONE（Exit Code: 0）
- REJECTED（Exit Code: 17）
- BROKEN_STATE（Exit Code: 20）

各状態について:
- CLI 視点の意味
- 許可コマンド
- 注意点/エラー

## Verify Results

### 役割名・プロセス名の検出

```bash
$ grep -i -E "(claude|human|reviewer|chatgpt)" docs/ops.md || echo "OK: No role names found"
# 結果: CLAUDE.md および .claude（ファイル名・ディレクトリ名）がマッチ
# 判定: これらは役割名ではなくファイル名であり、DoD「特定の役割名・登場人物名・プロセス名が書かれていない」は満たしている
```

### Step 番号構造の検出

```bash
$ grep -E "^### Step [0-9]" docs/ops.md || echo "OK: No step-based structure"
# 結果: OK: No step-based structure
# 判定: ✅ Step 番号ベースの章立てが存在しない
```

### 排他的表現の検出

```bash
$ grep -i -E "(公式フロー|唯一)" docs/ops.md || echo "OK: No exclusive expressions"
# 結果: OK: No exclusive expressions
# 判定: ✅ 「公式フロー」「唯一」等の表現がない
```

### vdev-spec.md との整合性

| 観点 | 確認結果 |
|------|----------|
| 状態一覧 | ✅ 10 状態すべてが vdev-spec.md セクション 6 と一致 |
| Exit Code | ✅ 各状態の Exit Code が vdev-spec.md セクション 7 と一致 |
| 許可コマンド | ✅ 各状態の許可コマンドが vdev-spec.md セクション 9 と整合 |

## DoD Verification

| DoD 項目 | 確認結果 |
|---------|----------|
| 状態駆動（gate → allowed actions）の構成 | ✅ セクション 2 で全状態を網羅 |
| 特定の役割名・登場人物名・プロセス名が書かれていない | ✅ ファイル名以外に役割名なし |
| Step 番号ベースの章立てが存在しない | ✅ grep 結果で確認済み |
| vdev-spec.md の状態機械・コマンド仕様と矛盾がない | ✅ 10 状態すべて整合 |
| フロー仕様変更を想定しても ops.md の内容が破綻しない構造 | ✅ フロー仕様への依存を排除 |

## Risks

なし

## Rollback

```bash
git checkout HEAD -- docs/ops.md
```
