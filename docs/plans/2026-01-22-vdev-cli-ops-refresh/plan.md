# Plan: vdev-cli ops.md 刷新

## Summary

ops.md を「vdev-cli の運用ガイド」として再定義する。Step 番号ベースの構成を廃止し、状態（gate）駆動の構成に改める。役割名・プロセス名・介入ルール等のフロー仕様依存を排除する。

## Scope

- 対象ファイル: `docs/ops.md`
- 変更種別: 全面改稿

## Prerequisites

- vdev-spec.md（CLI 仕様の SoT）
- 現行 ops.md の内容を参照可能であること

## Implementation Steps

### Step 1: ドキュメント位置づけの明示

ops.md 冒頭に以下を記載する:

1. 「本ドキュメントの目的」
   - vdev-cli の運用上の注意点・状態別の許可操作を説明する
2. 「本ドキュメントが扱わないこと」
   - 実行主体・責務分担
   - レビューや承認の意思決定プロセス
   - 例外時の介入・履歴管理・統制ポリシー
   - マージ・リリース等の上位判断
3. 「参照先」
   - CLI 仕様: vdev-spec.md
   - フロー仕様: 別途定義されたフロー仕様を参照

### Step 2: 状態別操作リファレンスの作成

各状態について以下を記述する:

| 状態 | CLI 視点の意味 | 許可コマンド |
|------|----------------|-------------|
| NEEDS_INSTRUCTION | instruction.md が未登録 | `vdev instruction` |
| NEEDS_PLAN | plan.md が未登録 | `vdev plan` |
| NEEDS_DESIGN_REVIEW | design-review.md が未登録 | `vdev review` |
| DESIGN_APPROVED | 設計承認済み、実装開始可能 | `vdev start` |
| IMPLEMENTING | 実装中 | `vdev impl` |
| NEEDS_IMPL_REPORT | impl.md が未登録 | `vdev impl` |
| NEEDS_IMPL_REVIEW | impl-review.md が未登録 | `vdev impl-review` |
| DONE | 完了 | なし（読み取り専用） |
| REJECTED | 設計却下 | topic 再作成または破棄 |
| BROKEN_STATE | 整合性エラー | 手動修復不可、破棄を推奨 |

各状態について:
- 状態の意味（CLI 視点）
- 許可される vdev コマンド
- 代表的なエラーや注意点

### Step 3: 差戻し（NEEDS_CHANGES）時の挙動説明

以下を記述する:

1. design-review で NEEDS_CHANGES が返った場合
   - status は NEEDS_PLAN に戻る
   - plan.md を修正後、`vdev plan` で再登録
   - `vdev review` で再レビュー

2. impl-review で NEEDS_CHANGES が返った場合
   - status は IMPLEMENTING に戻る
   - 実装を修正後、`vdev impl` で再登録
   - `vdev impl-review` で再レビュー

3. CLI が保証しない範囲
   - 差戻し回数の管理
   - レビュー履歴の追跡

### Step 4: CLI 固有の運用情報

以下を整理して記述する:

1. **BROKEN_STATE**
   - 代表例: meta.json の手動編集、hash 不整合
   - 回復不能性: CLI による修復コマンドなし
   - 推奨対応: topic を破棄し再作成

2. **手動編集禁止**
   - `docs/plans/<topic>/` 配下の直接編集禁止
   - meta.json の手動書き換え禁止

3. **stdin / 改行コード**
   - CRLF → LF に自動正規化
   - --stdin フラグ必須

4. **vdev sync**
   - ~/.vdev/CLAUDE.md からの同期
   - --force による強制上書き
   - 差分検出時の exit code 1

5. **vdev new**
   - 内部で sync 相当を実行
   - slug の正規化ルール

6. **.claude 資産の同期**
   - ~/.vdev/.claude/ からのコピー
   - 同期失敗は exit code に影響しない

### Step 5: 構成の整理と不要セクションの削除

1. 以下を削除:
   - Daily Workflow セクション（Step 1〜12 構成）
   - 「公式フロー」「DONE までの唯一手順」表現

2. セクション構成を以下に再編:
   1. はじめに（位置づけ・非対象・参照先）
   2. 状態別操作リファレンス
   3. 差戻し時の挙動
   4. CLI 運用上の注意点
   5. 同期・初期化コマンド

## DoD (Definition of Done)

1. ops.md が状態駆動（gate → allowed actions）の構成になっている
2. 特定の役割名・登場人物名・プロセス名が書かれていない
3. Step 番号ベースの章立てが存在しない
4. vdev-spec.md の状態機械・コマンド仕様と矛盾がない
5. フロー仕様変更を想定しても ops.md の内容が破綻しない構造である

## Verify

```bash
# ops.md 内に役割名・プロセス名がないことを確認
grep -i -E "(claude|human|reviewer|chatgpt)" docs/ops.md || echo "OK: No role names found"

# Step 番号表現がないことを確認
grep -E "^### Step [0-9]" docs/ops.md || echo "OK: No step-based structure"

# 「公式フロー」「唯一」等の表現がないことを確認
grep -i -E "(公式フロー|唯一)" docs/ops.md || echo "OK: No exclusive expressions"
```

## Risks

- 現行 ops.md の利用者が混乱する可能性
  - 対策: 目次構成を明確にし、状態→操作の対応を一覧化

## Rollback

```bash
git checkout HEAD -- docs/ops.md
```

## Document Update Assessment

| ドキュメント | 更新要否 | 理由 |
|-------------|---------|------|
| docs/spec.md | 不要 | 本 topic は CLI の ops.md のみを対象とする。vdev-spec.md は変更しない |
| docs/ops.md | 必要 | 本 topic の改修対象 |
| docs/arch.md | 不要 | アーキテクチャ上の変更なし |
