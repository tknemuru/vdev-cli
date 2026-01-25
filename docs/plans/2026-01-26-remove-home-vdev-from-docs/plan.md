# Plan: ~/.vdev 参照の削除

## Goal

vdev-cli の運用ドキュメントから廃止済みの `~/.vdev` 運用記述を削除し、現行運用と矛盾しない説明に修正する。

## Scope

### 修正対象

1. **docs/vdev-spec.md**（3 箇所）
   - 行 190: vdev new の動作説明における `~/.vdev/CLAUDE.md` 参照
   - 行 403: vdev sync の動作説明における `~/.vdev/CLAUDE.md` 参照
   - 行 475: CLAUDE.md 管理方針における Source of Truth の記述

### 修正対象外

以下は変更しない。

1. **docs/ops.md** - 既に ai-resources 参照に更新済み、`~/.vdev` 参照なし
2. **docs/rollback.md** - `~/.vdev` 参照なし
3. **docs/plans/ 配下の過去トピック成果物** - 履歴として当時の文脈を保持

## Work Items

### Task 1: docs/vdev-spec.md のセクション 9.1 修正

**対象**: vdev new コマンド説明（行 186-203）

**変更内容**:
- `~/.vdev/CLAUDE.md（グローバル正本）` を `ai-resources` 参照に変更
- sync の動作説明を現行実装に合わせる

**Before** (行 190):
```
5. グローバル正本（~/.vdev/CLAUDE.md）から repo の CLAUDE.md を同期
```

**After**:
```
5. ai-resources から repo の CLAUDE.md およびその他資産を同期（vdev sync と同等）
```

### Task 2: docs/vdev-spec.md のセクション 9.11 修正

**対象**: vdev sync コマンド説明（行 396-418）

**変更内容**:
- `~/.vdev/CLAUDE.md` 参照を削除
- 現行の ai-resources 同期方式を反映

**Before** (行 403):
```
1. ~/.vdev/CLAUDE.md（グローバル正本）を読み取る
```

**After**:
```
1. ai-resources 配下の資産を読み取る
```

### Task 3: docs/vdev-spec.md のセクション 14 修正

**対象**: CLAUDE.md 管理方針（行 467-492）

**変更内容**:
- セクション 14.1 の Source of Truth から `~/.vdev/CLAUDE.md` 記述を削除
- 現行の ai-resources 参照方式を反映
- 「symlink 前提」などの旧運用前提を削除

**Before** (行 473-478):
```
### 14.1 Source of Truth

- CLAUDE.md の唯一の正（Source of Truth）は以下とする：

  ~/.vdev/CLAUDE.md

- このファイルは vdev フロー全体に共通な方針のみを記載し、
  リポジトリ固有のルールは含めない。
```

**After**:
```
### 14.1 Source of Truth

- CLAUDE.md の唯一の正（Source of Truth）は ai-resources リポジトリ内に存在する。
- vdev sync により各リポジトリへ同期される。
- このファイルは vdev フロー全体に共通な方針のみを記載し、
  リポジトリ固有のルールは含めない。
```

**Before** (行 480-485):
```
### 14.2 配布・同期方針

- 各リポジトリのルートに配置される CLAUDE.md は、
  上記 Source of Truth の **同期コピー** として扱う。
- vdev は CLAUDE.md の内容解釈や編集を行わない。
```

**After**（変更なし）:
```
### 14.2 配布・同期方針

- 各リポジトリのルートに配置される CLAUDE.md は、
  上記 Source of Truth の **同期コピー** として扱う。
- vdev は CLAUDE.md の内容解釈や編集を行わない。
```

**Before** (行 487-492):
```
### 14.3 設計原則

- CLAUDE.md は「コピーソース方式」を避けるため、
  単一正本を中心とした運用を前提とする。
- vdev-spec.md / ops.md の更新により CLAUDE.md の内容が変わることはあるが、
  各リポジトリ固有の判断で改変してはならない。
```

**After**（変更なし - 「単一正本」は ai-resources を指すため維持可能）

## Non-Goals

1. vdev CLI 実装の変更
2. docs/plans/ 配下の過去トピック成果物の変更
3. 新規セクション・説明の追加

## Verify

```bash
# 1. docs/ 配下（plans/ 除く）で ~/.vdev 参照がないこと
grep -r "~/.vdev" docs/vdev-spec.md docs/ops.md docs/rollback.md

# 2. 期待結果: 何も出力されない

# 3. symlink 参照がないこと（docs/ 配下、plans/ 除く）
grep -r "symlink" docs/vdev-spec.md docs/ops.md docs/rollback.md

# 4. 期待結果: 何も出力されない

# 5. 修正した文書を目視確認し、文脈が自然であることを確認
```

## DoD（Definition of Done）

1. docs/vdev-spec.md から `~/.vdev` 参照が削除されている
2. docs/vdev-spec.md から symlink 前提の説明が削除されている
3. 読者が `~/.vdev` 前提のセットアップを行うよう誤誘導されない
4. 文書内の文脈が自然で、整合性が保たれている
5. Verify コマンドで残存なしを確認
