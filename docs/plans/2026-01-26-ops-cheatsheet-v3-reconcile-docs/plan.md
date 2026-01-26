# Plan: ops.md / vdev-cli-cheatsheet.md 追従改訂（vdev-spec v3.0.0）

## Risk Assessment

**Risk Level: R2（中リスク）**

- 運用手順（ops）とコマンド早見表（cheatsheet）の SoT を更新
- 日々の実行手順に直接影響
- vdev-cli 実装改修は含まない（ドキュメントのみ）

## 重要制約（絶対遵守）

- **.claude 配下のファイルは絶対に修正しない**（コピー・同期生成物のため）
- 修正対象は **正本ファイルのみ**
- .claude 配下に差分が生じてはならない

## Outcome

vdev-spec v3.0.0 の世界観（正本=md / meta.json は派生 / gate は状態導出 / CLI 非必須）に合わせて、
正本ドキュメントを追従改訂する。

## 正本ファイルの特定

| ドキュメント | 正本パス | 備考 |
|-------------|---------|------|
| ops.md | `docs/ops.md`（本リポジトリ） | vdev-cli が SoT |
| vdev-cli-cheatsheet.md | `~/projects/ai-resources/vibe-coding-partner/knowledges/vdev-cli-cheatsheet.md` | ai-resources が SoT |

**注意**: `.claude/knowledges/vdev-cli-cheatsheet.md` はコピーであり、修正対象外。

## 変更対象外（明示的除外）

- vdev-cli の実装改修
- vdev-spec.md の改修（別トピック完了済み）
- `.claude/` 配下の全ファイル

## 変更内容

### ops.md（docs/ops.md）の改訂

#### A. セクション 4.1「手動編集禁止」を v3 追従版に置換

**変更前**:
```
### 4.1 手動編集禁止

以下のファイル・ディレクトリを直接編集しない:
- `docs/plans/<topic>/` 配下のファイル
- `meta.json`

手動編集は BROKEN_STATE の原因となる。
```

**変更後**:
```
### 4.1 正本と編集ポリシー（v3 追従）

- docs/plans/<topic>/ 配下の md は Canonical（正本）であり、直接編集してよい
- .claude 配下のコピー生成物は修正対象外とする
- vdev の各サブコマンドは必須手続きではない（補助）
- 状態確認と次アクション判断は vdev gate を入口に行う
- Status 行が規約外の場合は COMMAND_ERROR（exit 1）となるため、テンプレに従うこと
```

#### B. セクション 2.8「DONE」の注意点を v3 追従

**変更前**:
```
**注意点**:
- 全ファイルのハッシュ整合が必須
- ハッシュ不整合がある場合は BROKEN_STATE
```

**変更後**:
```
**注意点**:
- 完了状態（読み取り専用）
```

#### C. セクション 2.10「BROKEN_STATE」の原因を v3 追従

**変更前**:
```
**代表的な原因**:
- meta.json の手動編集
- ファイルの直接編集によるハッシュ不整合
- meta.json のパース失敗
```

**変更後**:
```
**代表的な原因**:
- meta.json のパース失敗
- トピックディレクトリ構造の破損
```

#### D. セクション 3「差戻し時の挙動」を v3 追従

差戻し手順を「正本 md 更新 → gate 確認」中心に更新。

### vdev-cli-cheatsheet.md（ai-resources 正本）の改訂

#### 1. 冒頭に v3.0.0 追従メモを追加

タイトル直下に以下を追加:
```
## v3.0.0 追従メモ

- 正本は docs/plans/<topic>/ 配下の md である
- .claude 配下のファイルはコピーであり修正禁止
- vdev サブコマンドは任意の補助である
- gate は状態確認の入口である
- Status 行が規約外の場合は COMMAND_ERROR（exit 1）
```

## 必須ドキュメント更新判断

| ドキュメント | 更新要否 | 理由 |
|-------------|---------|------|
| docs/ops.md | **更新対象** | 本トピックの主成果物（正本） |
| ai-resources/.../vdev-cli-cheatsheet.md | **更新対象** | 本トピックの主成果物（正本） |
| .claude/knowledges/vdev-cli-cheatsheet.md | **更新禁止** | コピーであり正本ではない |

## Verify

1. **ops.md: 手動編集禁止記述の除去確認**
   ```bash
   grep -n "手動編集禁止" docs/ops.md || echo "Not found (expected)"
   ```
   期待結果: 該当なし

2. **ops.md: v3 追従の正本宣言確認**
   ```bash
   grep -n "Canonical\|正本" docs/ops.md
   ```
   期待結果: 該当あり

3. **ops.md: ハッシュ整合必須の除去確認**
   ```bash
   grep -n "ハッシュ整合が必須\|ハッシュ不整合.*BROKEN" docs/ops.md || echo "Not found (expected)"
   ```
   期待結果: 該当なし

4. **cheatsheet（正本）: v3 追従メモ確認**
   ```bash
   grep -n "v3.0.0\|正本" ~/projects/ai-resources/vibe-coding-partner/knowledges/vdev-cli-cheatsheet.md
   ```
   期待結果: 冒頭に v3 宣言が含まれる

5. **.claude 配下に差分がないことの確認**
   ```bash
   git diff --name-only .claude/ || echo "No changes (expected)"
   ```
   期待結果: 差分なし

## DoD（Definition of Done）

- [ ] 修正はすべて正本ファイルに対して行われている
- [ ] .claude 配下ファイルに差分が存在しない
- [ ] ops.md が vdev-spec v3.0.0 と整合している
- [ ] vdev-cli-cheatsheet.md（正本）が vdev-spec v3.0.0 と整合している

## 手順

1. docs/ops.md を改訂（本リポジトリ内）
   - セクション 4.1 を v3 追従版に置換
   - セクション 2.8, 2.10 を v3 追従に更新
   - セクション 3 を v3 追従に更新
2. ~/projects/ai-resources/vibe-coding-partner/knowledges/vdev-cli-cheatsheet.md を改訂
   - 冒頭に v3 宣言を追加
3. Verify コマンドを実行し、全項目 PASS を確認
4. impl.md を作成
