# Plan: vdev sync 同期元を ai-resources に固定

## 概要

vdev sync の同期元を `~/.vdev/` から `~/projects/ai-resources/vibe-coding-partner/` に変更し、
knowledges の allowlist 同期機能を追加する。

## Risk Assessment

**R2（中リスク）**

- 既存機能の仕様変更（後方互換なし）
- テストコードの大幅な書き換えが必要
- ai-resources リポジトリへの依存が発生

## 必須ドキュメント更新要否

| ドキュメント | 更新要否 | 理由 |
|-------------|---------|------|
| docs/spec.md | 対象外 | 存在しない |
| docs/ops.md | **要** | 同期元パス・セットアップ手順の変更 |
| docs/arch.md | 対象外 | 存在しない |

## 変更ファイル一覧

### 1. src/core/claudeMdSync.ts

**変更内容:**

1. `getAiResourcesBasePath()` 関数を追加
   - `~/projects/ai-resources/vibe-coding-partner/` を返す
   - 存在確認付き

2. `getGlobalClaudeMdPath()` を修正
   - `~/.vdev/CLAUDE.md` → `ai-resources/vibe-coding-partner/claude/CLAUDE.md`

3. `getGlobalVdevFlowPath()` を修正
   - `~/.vdev/vdev-flow.md` → `ai-resources/vibe-coding-partner/knowledges/vdev-flow.md`

4. `getGlobalClaudeDir()` を修正
   - `~/.vdev/.claude/` → `ai-resources/vibe-coding-partner/claude/`

5. `renderRepoClaudeMd()` のヘッダーコメントを更新
   - `Source: ~/.vdev/CLAUDE.md` → `Source: ~/projects/ai-resources/vibe-coding-partner/claude/CLAUDE.md`

6. 同様に `renderRepoVdevFlow()` のヘッダーコメントを更新

7. `getKnowledgeManifestPath()` 関数を追加
   - `ai-resources/vibe-coding-partner/claude/knowledge-manifest.txt` を返す

8. `readKnowledgeManifest()` 関数を追加
   - manifest を読み込み、ファイル名リストを返す
   - 空行・コメント行をスキップ

9. `getKnowledgesSourceDir()` 関数を追加
   - `ai-resources/vibe-coding-partner/knowledges/` を返す

10. `syncKnowledges()` 関数を追加
    - manifest を読み込む
    - 各ファイルが knowledges/ に存在することを確認（なければエラー）
    - allowlist のファイルのみを `.claude/knowledges/` にコピー

### 2. src/commands/sync.ts

**変更内容:**

1. `syncKnowledges()` を呼び出しに追加
2. `SyncCommandResult` に `knowledgesResult` を追加
3. knowledges 同期結果をログ出力

### 3. src/commands/new.ts

**変更内容:**

1. `newPlan()` で `syncKnowledges()` を呼び出し
2. 結果オブジェクトに `knowledgesResult` を追加

### 4. src/cli.ts

**変更内容:**

1. sync コマンドの出力に knowledges 同期結果を追加
2. 同期元が見つからない場合のエラーメッセージを更新

### 5. test/sync.test.ts

**変更内容:**

1. テスト用の ai-resources モックディレクトリ構造を用意
2. `~/.vdev/` 参照テストを削除
3. 以下のテストケースを追加/更新:
   - ai-resources が存在しない場合のエラー確認
   - manifest が存在しない場合のエラー確認
   - manifest に記載されたファイルが knowledges/ にない場合のエラー確認
   - allowlist のファイルのみが同期されることの確認
   - commands/subagents がディレクトリ単位で同期されることの確認

### 6. docs/ops.md

**変更内容:**

1. 「5.1 vdev new」「5.2 vdev sync」のグローバル正本パスを更新
2. 「5.3 vdev-flow.md のセットアップ」セクションを削除（symlink 不要）
3. 「5.4 .claude 資産」の配布元パスを更新
4. 新規セクション「5.5 knowledges の同期」を追加

## 実装手順

### Step 1: 同期元パス関数の追加・修正

`src/core/claudeMdSync.ts` で:

1. `AI_RESOURCES_BASE_PATH` 定数を定義
2. `getAiResourcesBasePath()` を追加（存在確認付き）
3. 既存の `getGlobal*Path()` 関数を新しいパスに変更
4. ヘッダーコメント生成関数を更新

### Step 2: knowledges 同期機能の追加

`src/core/claudeMdSync.ts` で:

1. `KnowledgesSyncResult` インターフェースを追加
2. `getKnowledgeManifestPath()` を追加
3. `readKnowledgeManifest()` を追加（パース処理）
4. `getKnowledgesSourceDir()` を追加
5. `syncKnowledges()` を追加（allowlist 検証 + コピー）

### Step 3: コマンド層の更新

`src/commands/sync.ts`:
- `syncKnowledges()` 呼び出しを追加

`src/commands/new.ts`:
- `syncKnowledges()` 呼び出しを追加

### Step 4: CLI 出力の更新

`src/cli.ts`:
- knowledges 同期結果の表示を追加
- エラーメッセージのパス表記を更新

### Step 5: テストの更新

`test/sync.test.ts`:
- ai-resources モックディレクトリのセットアップ/クリーンアップ
- 既存テストの参照パスを更新
- 新規テストケースを追加

### Step 6: ドキュメント更新

`docs/ops.md`:
- 同期元パス・セットアップ手順を更新

## エラーハンドリング方針

| 状況 | 挙動 |
|-----|------|
| ai-resources ディレクトリが存在しない | エラーで停止、明確なメッセージ |
| claude/CLAUDE.md が存在しない | エラーで停止 |
| knowledge-manifest.txt が存在しない | エラーで停止 |
| manifest 記載ファイルが knowledges/ にない | エラーで停止（欠落ファイル名を表示） |
| commands/ または subagents/ が存在しない | 警告のみ（非致命的） |

## DoD（Definition of Done）

1. **~/.vdev/ 参照の完全撤去**
   - コード上に `~/.vdev` への参照がない
   - テストコードに `~/.vdev` への参照がない

2. **ai-resources からの同期動作**
   - CLAUDE.md が `ai-resources/vibe-coding-partner/claude/CLAUDE.md` から同期される
   - vdev-flow.md が `ai-resources/vibe-coding-partner/knowledges/vdev-flow.md` から同期される
   - commands/ が `ai-resources/vibe-coding-partner/claude/commands/` から同期される
   - subagents/ が `ai-resources/vibe-coding-partner/claude/subagents/` から同期される

3. **knowledges allowlist 同期**
   - knowledge-manifest.txt を読み込める
   - allowlist のファイルのみが `.claude/knowledges/` に同期される
   - manifest 記載ファイルが存在しない場合にエラーで停止する

4. **エラーハンドリング**
   - ai-resources 不在でエラー停止
   - manifest 不在でエラー停止
   - 欠落ファイルでエラー停止（部分同期なし）

5. **テスト**
   - 全テストが pass する
   - 上記 DoD を検証するテストケースが存在する

6. **ドキュメント**
   - docs/ops.md が更新されている

## Verify

```bash
# ビルド成功
npm run build

# テスト全 pass
npm test

# ~/.vdev への参照がないことを確認
grep -r "\.vdev" src/ test/ --include="*.ts" | grep -v "ai-resources" | grep -v "node_modules"
# → 結果が空であること

# 実際の同期動作確認（ai-resources が存在する環境で）
vdev sync --force
# → 正常終了、CLAUDE.md / vdev-flow.md / commands / subagents / knowledges が同期されること
```
