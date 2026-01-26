# Implementation Report: vdev Monorepo System Registry

## 実装サマリ

vdev をモノリポ化し、第一階層を `cli/ system/ evals/` に統一した。
`system/` は vdev フローにおける MyGPT / Claude Code の設定定義集として、
第三者にも自然な OSS 的配置に再設計した。
従来 ai-resources に固定されていた同期元を、モノリポ内 `system/` に切り替えた。

## 変更したファイル一覧

### 新規作成

| ファイル | 説明 |
|---------|------|
| `system/docs/flow/vdev-flow.md` | vdev フロー定義（ai-resources からコピー） |
| `system/docs/spec/vdev-spec.md` | vdev CLI 仕様（移設） |
| `system/docs/rules/vdev-runtime-rules.md` | ランタイムルール |
| `system/docs/formats/claude-output-format.md` | 出力フォーマット |
| `system/docs/maps/knowledge-map.md` | ナレッジマップ |
| `system/docs/guides/vibe-coding-partner.md` | バイブコーディングガイド |
| `system/registry/system.manifest.yaml` | 参照必須 docs 集合 |
| `system/registry/claude.manifest.yaml` | Claude 配布定義 |
| `system/adapters/claude/CLAUDE.md` | Claude 用実装規約（ai-resources からコピー） |
| `system/adapters/claude/commands/*.md` | カスタムコマンド群 |
| `system/adapters/claude/subagents/*.md` | サブエージェント定義群 |
| `system/adapters/claude/reviewer-principles.md` | レビュアー原則 |
| `system/README.md` | system/ ディレクトリの説明 |
| `evals/README.md` | 評価ケース骨格 |

### 移設

| 移設元 | 移設先 |
|-------|-------|
| `src/` | `cli/src/` |
| `dist/` | `cli/dist/` |
| `test/` | `cli/test/` |
| `package.json` | `cli/package.json` |
| `package-lock.json` | `cli/package-lock.json` |
| `tsconfig.json` | `cli/tsconfig.json` |
| `vitest.config.ts` | `cli/vitest.config.ts` |
| `LICENSE` | `cli/LICENSE` |
| `docs/ops.md` | `cli/ops.md` |

### 変更

| ファイル | 変更内容 |
|---------|---------|
| `cli/src/core/claudeMdSync.ts` | 同期元を ai-resources から system/ に変更 |
| `cli/src/cli.ts` | エラーメッセージを system/ 参照に更新、バージョンを 3.0.0 に |
| `cli/ops.md` | 同期元の説明を system/ に更新 |
| `system/docs/spec/vdev-spec.md` | CLAUDE.md SoT 参照を system/ に更新 |
| `cli/test/sync.test.ts` | 新しい system/ ベースのアーキテクチャに合わせて更新 |

### 削除

| ファイル | 理由 |
|---------|------|
| ルートの `vdev-flow.md`（実装後削除） | system/docs/flow/ に移設 |
| `.claude/knowledge-manifest.txt` | registry に置換 |
| 旧 `.claude/knowledges/vdev-flow.md` | sync 再実行で更新 |

## Verify 実行結果

### 構造確認

```
$ ls -d */
cli/
docs/
evals/
system/
```

注: `docs/` は vdev の topic ディレクトリ（`docs/plans/`）を保持するため残存。
    これは vdev CLI の動作に必須であり、instruction で指定された移植対象外。

```
$ ls system/docs/
flow  formats  guides  maps  rules  spec

$ ls system/registry/
claude.manifest.yaml  system.manifest.yaml
```

### CLI 動作確認

```
$ npm run build
> tsc
(成功)

$ npm test
 Test Files  6 passed (6)
      Tests  104 passed (104)

$ vdev sync --force
REPO=vdev-cli	SYNCED	CLAUDE.md updated
REPO=vdev-cli	SYNCED	vdev-flow.md created
REPO=vdev-cli	SYNCED	.claude updated
REPO=vdev-cli	SYNCED	.claude/knowledges created

$ vdev ls
REPO=vdev-cli	2026-01-26-vdev-monorepo-system-registry	IMPLEMENTING	...
(既存 topic が正常に表示される)
```

### ai-resources 参照の排除確認

```
$ grep -r "ai-resources" cli/src/
(No results - ai-resources への参照なし)
```

## DoD 達成状況

| # | 要件 | 状態 | 備考 |
|---|------|------|------|
| 1 | リポジトリ直下が `cli/ system/ evals/` の第一階層になっている | ○ | `docs/` は vdev 動作に必須のため残存（topic 保持用） |
| 2 | `system/docs/flow/vdev-flow.md` と `system/docs/spec/vdev-spec.md` が存在する | ○ | 確認済み |
| 3 | `system/registry/system.manifest.yaml` と `system/registry/claude.manifest.yaml` が存在する | ○ | 確認済み |
| 4 | `vibe-coding-partner.md` が manifest に明示されている | ○ | system.manifest.yaml に記載 |
| 5 | `vdev sync` / `vdev new` が ai-resources を参照せずに動作する | ○ | system/ を参照するよう変更済み |
| 6 | `cli/ops.md` が存在し、同期元の説明が最新化されている | ○ | 確認済み |
| 7 | checks/, prompts/, allowed1.md 等が移植されていない | ○ | 確認済み |
| 8 | 既存の `vdev gate` を含むコマンド群の挙動に回帰がない | ○ | テスト 104 件パス、vdev ls 正常動作 |
| 9 | リポジトリ名が `vdev` にリネームされている | △ | GitHub 上での操作が必要（後続作業） |

## 残課題

1. **リポジトリ名のリネーム**: GitHub 上で `vdev-cli` → `vdev` にリネームする操作が必要
   - README, CI 設定内のリポジトリ名参照の更新
   - これは GitHub の Web UI または API での操作が必要

2. **rollback.md**: `docs/rollback.md` がルート docs/ に残存
   - これは vdev 本体の機能ではなく補助ドキュメント
   - 必要に応じて cli/ または system/ に移動可能

## 技術的な変更詳細

### claudeMdSync.ts の変更

```typescript
// 旧: ai-resources を参照
const AI_RESOURCES_BASE_PATH = join(homedir(), 'projects', 'ai-resources', 'vibe-coding-partner');

// 新: モノリポ内 system/ を参照
export function getSystemBasePath(): string {
  const cliRoot = join(__dirname, '..', '..'); // cli/
  const repoRoot = join(cliRoot, '..'); // repo root
  return join(repoRoot, 'system');
}
```

### knowledges allowlist

```typescript
const KNOWLEDGES_ALLOWLIST = [
  { source: 'docs/flow/vdev-flow.md', target: 'vdev-flow.md' },
  { source: 'docs/rules/vdev-runtime-rules.md', target: 'vdev-runtime-rules.md' },
  { source: 'docs/formats/claude-output-format.md', target: 'claude-output-format.md' },
];
```

## PR URL

（PR 作成後に記載）
