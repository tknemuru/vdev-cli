# Plan: vdev sync claude 配下「まるごと同期」修正

## 概要

現行の vdev sync は `claude/` 配下の同期対象を `CLAUDE.md`, `commands/`, `subagents/` に限定している。
本修正では、claude/ 配下を「CLAUDE.md を除きディレクトリまるごと」同期する設計に変更し、
将来追加されるファイル（例: reviewer-principles.md）が vdev-cli 修正なしで同期されるようにする。

## 現状分析

### 現行の同期実装（src/core/claudeMdSync.ts）

| 同期対象 | 関数 | 同期先 |
|---------|------|-------|
| CLAUDE.md | `syncClaudeMd()` | repo root |
| commands/ | `syncClaudeCommands()` | .claude/commands/ |
| subagents/ | `syncClaudeSubagents()` | .claude/subagents/ |
| knowledges | `syncKnowledges()` | .claude/knowledges/ （allowlist 方式） |
| vdev-flow.md | `syncVdevFlow()` | repo root |

**問題点**: `commands/`, `subagents/` は個別関数でハードコードされており、
claude/ 直下に新規追加されたファイル（reviewer-principles.md 等）は同期されない。

## 修正方針

### 設計変更

1. **claude/ 配下の同期を単一関数に統合**
   - 新関数 `syncClaudeDir()` を追加
   - CLAUDE.md を除く claude/ 配下すべて（ファイル・ディレクトリ）を .claude/ に再帰コピー
   - 既存の `syncClaudeCommands()`, `syncClaudeSubagents()` は削除または非推奨化

2. **CLAUDE.md の特別扱い**
   - CLAUDE.md は従来通り `syncClaudeMd()` で repo root に配置
   - `syncClaudeDir()` では CLAUDE.md を除外し、二重配置を回避

3. **knowledges の同期は変更なし**
   - allowlist 方式を維持（knowledge-manifest.txt 参照）
   - 同期先は .claude/knowledges/ のまま

## 変更対象ファイル

| ファイル | 変更内容 |
|---------|---------|
| src/core/claudeMdSync.ts | `syncClaudeDir()` 追加、`syncClaudeCommands()` / `syncClaudeSubagents()` 削除 |
| src/commands/sync.ts | `syncClaudeDir()` を呼び出すよう修正、commandsResult / subagentsResult を claudeDirResult に統合 |
| src/commands/new.ts | 同上（sync.ts と同様の修正） |
| test/sync.test.ts | 新しい同期仕様に合わせてテスト更新 |

## 実装詳細

### 1. syncClaudeDir() の実装

```typescript
export interface ClaudeDirSyncResult {
  success: boolean;
  written: boolean;
  hasDiff: boolean;
  sourceMissing: boolean;
  message: string;
}

export function syncClaudeDir(repoRoot: string, force: boolean): ClaudeDirSyncResult {
  const srcDir = getGlobalClaudeDir();  // ~/projects/ai-resources/vibe-coding-partner/claude/

  if (!existsSync(srcDir)) {
    return { success: false, ..., sourceMissing: true, message: '...' };
  }

  const destDir = join(repoRoot, '.claude');

  // srcDir の内容を destDir にコピー（CLAUDE.md を除外）
  // 差分検出、force フラグ対応は既存の syncClaudeCommands() と同様のロジック
}
```

### 2. CLAUDE.md 除外ロジック

`copyDirRecursive()` を拡張し、除外パターンを引数で受け取れるようにする：

```typescript
export function copyDirRecursive(
  src: string,
  dest: string,
  excludePatterns: string[] = []  // 例: ['CLAUDE.md']
): void {
  // ...
  for (const entry of entries) {
    if (excludePatterns.includes(entry)) continue;
    // ...
  }
}
```

### 3. directoriesDiffer() の拡張

差分検出時も同様に除外パターンを考慮：

```typescript
export function directoriesDiffer(
  srcDir: string,
  destDir: string,
  excludePatterns: string[] = []
): boolean {
  // ...
}
```

### 4. sync.ts / new.ts の修正

```typescript
// Before
const commandsResult = syncClaudeCommands(repoRoot, force);
const subagentsResult = syncClaudeSubagents(repoRoot, force);

// After
const claudeDirResult = syncClaudeDir(repoRoot, force);
```

## 必須ドキュメント更新要否

| ドキュメント | 更新要否 | 理由 |
|------------|---------|------|
| docs/spec.md | 不要 | 外部仕様（vdev sync の挙動）は実質同じ（同期対象が増えるだけ） |
| docs/ops.md | 不要 | 運用手順に変更なし |
| docs/arch.md | 不要 | 設計境界に変更なし |

## DoD（完了条件）

1. vdev sync 実行後、repo 側に reviewer-principles.md が配置されている（.claude/reviewer-principles.md）
2. vdev sync が ai-resources の claude/ 配下新規ファイルを、vdev-cli 修正なしで同期できる
3. claude/ 配下の同期が CLAUDE.md / commands / subagents に限定されていない
4. CLAUDE.md は repo root に配置され、.claude/ には二重配置されない
5. knowledges allowlist の仕様と同期先（.claude/knowledges/）は従来方針どおり維持されている
6. ~/.vdev/ は引き続き一切参照しない

## Verify（検証手順）

### 自動テスト（test/sync.test.ts）

以下のテストケースを追加・更新：

1. **claude/ 直下ファイルの同期テスト**
   - ソース側に reviewer-principles.md を配置
   - vdev sync 後、.claude/reviewer-principles.md に同期されることを確認

2. **commands/ subagents/ の再帰コピーテスト**
   - 従来通りディレクトリ再帰コピーされることを確認

3. **CLAUDE.md 二重配置回避テスト**
   - vdev sync 後、CLAUDE.md が repo root にのみ存在し、.claude/CLAUDE.md は存在しないことを確認

4. **将来ファイル対応テスト**
   - ソース側に新規ファイル（例: future-file.md）を追加
   - vdev sync 後、.claude/future-file.md に同期されることを確認

5. **knowledges allowlist テスト（既存テスト維持）**
   - allowlist にないファイルは同期されないことを確認

6. **~/.vdev/ 非参照テスト**
   - コード内に ~/.vdev/ への参照がないことを grep で確認

### 手動検証

```bash
# ビルド
npm run build

# テスト実行
npm test

# 実際の同期テスト（別リポジトリで実行）
cd ~/projects/some-other-repo
vdev sync --force
ls -la .claude/
# reviewer-principles.md が存在することを確認
# CLAUDE.md が .claude/ 配下に存在しないことを確認
```

## リスク分類

**R2（中）**: 既存の同期ロジックを統合・変更するため、後方互換性への影響がある。
ただし、同期対象が増える方向の変更であり、機能削除ではないため中リスク。

## ロールバック

本トピックの変更を `git revert` で取り消せば、従来の限定的同期（CLAUDE.md / commands / subagents のみ）に戻る。
