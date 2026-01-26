# Plan: vdev-cli 改修（vdev-spec v3.0.0 準拠）

## Risk Assessment

**Risk Level: R3（高リスク）**

- gate の判定モデルを meta.json 中心から md 中心へ反転する根幹改修
- DONE / REJECTED を終端固定にしない（再導出・巻き戻し可能）
- 既存運用・既存テスト・既存 topic の解釈に影響
- Human の明示承認を必須とする

## 重要制約（絶対遵守）

- .claude 配下のファイルは修正しない
- vdev-spec v3.0.0 / ops / cheatsheet は確定済みの前提
- 既存の exit code（0/10/11/12/13/14/15/16/17/20/1）は維持
- 新規サブコマンド追加・外部公開・DB 拡張・要件外機能追加は禁止

## Outcome

vdev gate を「状態導出 + meta 同期（reconcile）」として v3.0.0 仕様に準拠させる。

## 現行実装の把握（Task 1 完了）

### 主要ファイル構成

| ファイル | 責務 |
|---------|------|
| `src/core/gate.ts` | Gate Decision Table（checkGate 関数） |
| `src/core/meta.ts` | meta.json 読み書き |
| `src/core/hashes.ts` | SHA256 計算 |
| `src/core/errors.ts` | Exit Code 定義 |
| `src/commands/review.ts` | Status 抽出（design-review） |
| `src/commands/impl-review.ts` | Status 抽出（impl-review） |

### 現行の BROKEN_STATE 判定（v2）

```typescript
// src/core/gate.ts:66-83
if (meta.status === 'DONE') {
  if (!allHashesMatch(meta, topic)) {
    return { exitCode: BROKEN_STATE, status: 'BROKEN_STATE', ... }
  }
}
if (meta.status === 'REJECTED') {
  if (!designHashesMatch(meta, topic)) {
    return { exitCode: BROKEN_STATE, status: 'BROKEN_STATE', ... }
  }
}
```

**問題点**: hash 不一致で BROKEN_STATE を返している（v3 では禁止）

## 変更内容

### Task 2: v3.0.0 gate ロジックへ置換

**変更ファイル**: `src/core/gate.ts`

#### 2.1 hash 不一致による BROKEN_STATE 判定を削除

現行の優先度 2「status in (DONE, REJECTED) かつ hash 不一致 → BROKEN_STATE」を削除

#### 2.2 md 優先の状態導出ロジックを実装

```
1. meta.json がパース不能 → BROKEN_STATE (20)
2. instruction.md がない → NEEDS_INSTRUCTION (10)
3. plan.md がない → NEEDS_PLAN (11)
4. design-review.md がない → NEEDS_DESIGN_REVIEW (12)
5. design-review.md の Status 行が規約外 → COMMAND_ERROR (1)
6. Status: REJECTED → REJECTED (17)
7. Status: NEEDS_CHANGES → NEEDS_PLAN (11)
8. Status: DESIGN_APPROVED の場合:
   - impl-review.md がある場合:
     - Status 行が規約外 → COMMAND_ERROR (1)
     - Status: DONE → DONE (0)
     - Status: NEEDS_CHANGES → IMPLEMENTING (14)
   - impl-review.md がなく impl.md がある → NEEDS_IMPL_REVIEW (16)
   - impl.md がない場合:
     - meta.status が IMPLEMENTING 系 → NEEDS_IMPL_REPORT (15) or IMPLEMENTING (14)
     - それ以外 → DESIGN_APPROVED (13)
```

#### 2.3 reconcile（meta.json 同期更新）を実装

状態導出成功時のみ:
- meta.status を導出状態に合わせる
- timestamps.updatedAt を更新
- 存在する md の hashes を再計算して反映

COMMAND_ERROR / BROKEN_STATE 時は meta.json を更新しない

### Task 3: Status 行パーサの厳格化

**変更ファイル**: `src/core/gate.ts`（新規追加の Status 抽出関数）

- design-review.md / impl-review.md の Status 行を gate 内で抽出
- 規約外の場合は COMMAND_ERROR (1) を返す
- 既存の extractStatus 関数を参考に実装

### Task 4: テスト更新・追加

**変更ファイル**: `tests/gate.test.ts`（または新規テストファイル）

#### 新規テストケース

1. **hash 不一致でも BROKEN_STATE にならない**
   - DONE 状態で hash を手動変更しても、gate は DONE を返す

2. **DONE 後の巻き戻り**
   - impl-review.md を NEEDS_CHANGES に変更 → IMPLEMENTING を返す

3. **Status 行規約外で exit 1**
   - design-review.md に不正な Status 行 → COMMAND_ERROR
   - impl-review.md に不正な Status 行 → COMMAND_ERROR
   - meta.json が更新されないことを確認

4. **meta.json パース不能で exit 20**
   - meta.json を壊す → BROKEN_STATE

5. **instruction/plan/design-review 欠落の exit code が従来どおり**
   - 既存テストの維持

## 必須ドキュメント更新判断

| ドキュメント | 更新要否 | 理由 |
|-------------|---------|------|
| docs/vdev-spec.md | 更新不要 | 別トピック完了済み |
| docs/ops.md | 更新不要 | 別トピック完了済み |
| .claude/* | 修正禁止 | コピー生成物 |

## Verify

1. **テストスイート全実行**
   ```bash
   cd /home/tk/projects/vdev-cli && npm test
   ```
   期待結果: 全テスト PASS

2. **hash 不一致でも BROKEN_STATE にならない確認**
   - サンプル topic で DONE 状態を作成
   - meta.json の hash を手動変更
   - `vdev gate <topic>` が DONE を返すこと

3. **Status 行規約外で exit 1 確認**
   - design-review.md に `Status: INVALID` を記載
   - `vdev gate <topic>` が exit 1 を返すこと

4. **.claude 配下に差分がないこと**
   ```bash
   git diff --name-only .claude/ || echo "No changes (expected)"
   ```

## DoD（Definition of Done）

- [ ] vdev gate が v3.0.0 仕様どおりに動作する
- [ ] hash 不一致で BROKEN_STATE が出ない（DONE/REJECTED も含む）
- [ ] Status 行規約外は COMMAND_ERROR（exit 1）で停止し、meta.json を更新しない
- [ ] meta.json パース不能は BROKEN_STATE（exit 20）
- [ ] テストが更新され、v3 の挙動が固定されている
- [ ] .claude 配下に差分がない

## 手順

1. `src/core/gate.ts` を v3.0.0 仕様に改修
2. Status 行抽出関数を gate.ts に追加
3. reconcile ロジック（meta.json 同期）を追加
4. テストを更新・追加
5. テストスイート全実行
6. ローカルシナリオ検証
7. impl.md 作成
