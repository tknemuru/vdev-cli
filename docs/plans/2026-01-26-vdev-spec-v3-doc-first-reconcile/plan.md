# Plan: vdev-spec.md v3.0.0 改訂（ドキュメント先行・reconcile モデル）

## Risk Assessment

**Risk Level: R3（高リスク）**

- vdev の状態判定モデル（SoT）を根本から変更する破壊的変更
- 既存 vdev-cli 実装との不整合が発生する
- 本 spec 確定後、vdev-cli 側の追従改修が必須
- Human の明示的承認を必須とする

## Outcome

vdev-spec.md を version 3.0.0 に改訂し、以下のパラダイムシフトを明文化する：

1. **正本（Canonical）は md ファイル群**であり、meta.json は派生キャッシュ
2. **vdev gate は状態導出 + reconcile** を行う（meta.json を同期更新）
3. **hash 不一致はエラー条件ではない**（reconcile で同期するため）
4. **BROKEN_STATE は致命的破損に限定**（パース不能・構造破損のみ）
5. **Status 行不正は COMMAND_ERROR**（exit 1）

## 実装範囲

### 変更対象ファイル

- `docs/vdev-spec.md`

### 変更箇所（instruction.md 記載順）

#### 1. version 表記の更新
- 冒頭の `version: 2.0.0` → `version: 3.0.0`

#### 2. Source of Truth の再定義（2.2 完全置換）
- 現行の 2.2 を削除し、instruction.md 記載の内容で置換
- 「meta.json を唯一の正とする」記述を削除
- 「正本ファイル群から状態を導出」に変更

#### 3. meta.json の位置づけ変更（新設）
- 2.2 の後に新セクションを追加
- meta.json を「派生キャッシュ」として定義
- 不整合自体はエラーではないことを明記

#### 4. hashes フィールドの扱い変更
- セクション 5.3 付近に追記または新セクション追加
- hash 不一致はエラー条件ではないことを明記
- vdev gate 実行時に SHA256 を再計算・同期更新することを明記

#### 5. BROKEN_STATE の再定義
- セクション 6 の BROKEN_STATE 説明を改訂
- 「meta.json パース不能」「構造破損」に限定
- 「hash 不一致のみを理由に BROKEN_STATE としない」を明記

#### 6. Status 行不正時の扱い（COMMAND_ERROR）
- セクション 9.4 / 9.7 付近に追記または新セクション追加
- Status 行が規定外の場合は COMMAND_ERROR（exit 1）を明記

#### 7. Gate Decision Table の書き換え
- セクション 8 を全面改訂
- 優先度 2「hash 不一致 → BROKEN_STATE」を削除
- 優先度 11「hash 一致条件」を削除
- 新しい判定ロジックを instruction.md の記載通りに適用

#### 8. NEEDS_CHANGES の戻り先明文化
- セクション 9.4 / 9.7 に追記
- design-review.md の NEEDS_CHANGES → NEEDS_PLAN
- impl-review.md の NEEDS_CHANGES → IMPLEMENTING

### 変更対象外（明示的除外）

- vdev-cli の実装改修（後続トピック）
- ops.md / cheatsheet の改訂（後続トピック）

## 必須ドキュメント更新判断

| ドキュメント | 更新要否 | 理由 |
|-------------|---------|------|
| docs/spec.md | N/A | 本リポジトリに該当なし（vdev-spec.md が相当） |
| docs/ops.md | 更新不要 | 本トピックでは対象外（後続トピック） |
| docs/arch.md | N/A | 本リポジトリに該当なし |
| docs/vdev-spec.md | **更新対象** | 本トピックの主成果物 |

## Verify

1. **version 確認**
   ```bash
   grep -n "^version:" docs/vdev-spec.md
   ```
   期待結果: `version: 3.0.0`

2. **旧 SoT 記述の除去確認**
   ```bash
   grep -n "唯一の正" docs/vdev-spec.md
   ```
   期待結果: 該当なし（exit 1）、または「唯一の正ではない」という否定形のみ

3. **hash 不一致エラー記述の除去確認**
   ```bash
   grep -n "hash.*不一致.*BROKEN" docs/vdev-spec.md
   ```
   期待結果: 該当なし（exit 1）

4. **COMMAND_ERROR の Status 行不正記述確認**
   ```bash
   grep -n "COMMAND_ERROR" docs/vdev-spec.md
   ```
   期待結果: Status 行不正時の扱いが記載されている

5. **Gate Decision Table の改訂確認**
   - 優先度 2（hash 不一致 → BROKEN_STATE）が存在しないこと
   - 優先度 11（hash 一致条件）が存在しないこと

## DoD（Definition of Done）

- [ ] vdev-spec.md に version 3.0.0 が明示されている
- [ ] instruction.md に記載した全 8 項目の改訂内容が反映されている
- [ ] 「meta.json が唯一の正」と読める記述が存在しない
- [ ] 「DONE / REJECTED が終端固定」と誤解される記述が存在しない
- [ ] Status 行不正時の COMMAND_ERROR が明文化されている
- [ ] 本トピックが R3 である旨は instruction.md に既に明示されている

## 手順

1. docs/vdev-spec.md を開く
2. instruction.md 記載の 8 項目を順次反映
3. Verify コマンドを実行し、全項目 PASS を確認
4. impl.md を作成
