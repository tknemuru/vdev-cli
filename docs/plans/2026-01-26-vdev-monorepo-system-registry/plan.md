# Plan: vdev Monorepo System Registry

## 概要

vdev をモノリポ化し、第一階層を `cli/ system/ evals/` に統一する。
`system/` は vdev フローにおける MyGPT / Claude Code の設定定義集として、
第三者にも自然な OSS 的配置に再設計する。
従来 ai-resources に固定されていた同期元を、モノリポ内 `system/` に切り替える。
リポジトリ名を `vdev-cli` から `vdev` にリネームする。

## スコープ

### In-Scope

1. リポジトリ構造の再編（cli/ system/ evals/ の第一階層化）
2. system/docs/ への SoT ドキュメント配置
3. system/registry/ への manifest 新設
4. system/adapters/claude/ への Claude 固有資材配置
5. vdev sync / vdev new の同期元変更（ai-resources → system/）
6. ドキュメント更新（ops.md, vdev-spec.md）
7. リポジトリ名のリネーム（vdev-cli → vdev）

### Out-of-Scope

- checks/ と prompts/ の移植
- constitution ドキュメントの新設
- evals の実行基盤の高度化

## 対象ファイル

### 新規作成

- `cli/` ディレクトリ（既存 src/, dist/, node_modules/ 等を移設）
- `system/docs/flow/vdev-flow.md`
- `system/docs/spec/vdev-spec.md`
- `system/docs/rules/vdev-runtime-rules.md`
- `system/docs/formats/claude-output-format.md`
- `system/docs/maps/knowledge-map.md`
- `system/docs/guides/vibe-coding-partner.md`
- `system/registry/system.manifest.yaml`
- `system/registry/claude.manifest.yaml`
- `system/adapters/claude/CLAUDE.md`
- `system/adapters/claude/commands/*.md`
- `system/adapters/claude/subagents/*.md`
- `system/README.md`
- `evals/README.md`
- `evals/reviewer/` (空ディレクトリまたは .gitkeep)

### 変更

- `src/core/claudeMdSync.ts` → `cli/src/core/claudeMdSync.ts`（パス変更 + 同期元ロジック変更）
- `src/cli.ts` → `cli/src/cli.ts`（エラーメッセージ更新）
- `package.json` → `cli/package.json`（パス調整）
- `tsconfig.json` → `cli/tsconfig.json`
- `vitest.config.ts` → `cli/vitest.config.ts`
- `docs/ops.md` → `cli/ops.md`（同期元説明の更新）
- `docs/vdev-spec.md` → `system/docs/spec/vdev-spec.md`（ai-resources 前提の記述更新）

### 削除

- 既存の `vdev-flow.md`（ルート）→ system/docs/flow/ に移設後削除
- `.claude/knowledges/vdev-flow.md`（配布物）
- `.claude/knowledge-manifest.txt`（registry に置換）

### 移植しない（ai-resources に残存）

- `checks/`
- `prompts/`
- `allowed1.md`, `allowed2.md`, `not-allowed.md`, `existing.md`, `file.md`

## 実装手順

### Phase 1: ディレクトリ構造の準備

1. `system/docs/` ディレクトリ構造を作成
2. `system/registry/` ディレクトリを作成
3. `system/adapters/claude/` ディレクトリを作成
4. `evals/` ディレクトリを作成

### Phase 2: SoT ドキュメントの配置

1. ai-resources から以下を `system/docs/` に移設:
   - `knowledges/vdev-flow.md` → `system/docs/flow/vdev-flow.md`
   - `knowledges/vdev-runtime-rules.md` → `system/docs/rules/vdev-runtime-rules.md`
   - `knowledges/claude-output-format.md` → `system/docs/formats/claude-output-format.md`
   - `knowledges/knowledge-map.md` → `system/docs/maps/knowledge-map.md`
   - `knowledges/vibe-coding-partner.md` → `system/docs/guides/vibe-coding-partner.md`
2. `docs/vdev-spec.md` を `system/docs/spec/vdev-spec.md` に移設

### Phase 3: Registry / Manifest の作成

1. `system/registry/system.manifest.yaml` を作成（必須 docs 集合を定義）
2. `system/registry/claude.manifest.yaml` を作成（配布定義）

### Phase 4: Claude 固有資材の配置

1. ai-resources から以下を `system/adapters/claude/` に移設:
   - `claude/CLAUDE.md` → `system/adapters/claude/CLAUDE.md`
   - `claude/commands/` → `system/adapters/claude/commands/`
   - `claude/subagents/` → `system/adapters/claude/subagents/`

### Phase 5: CLI 実装の移設と変更

1. 既存 CLI 実装を `cli/` に移設:
   - `src/` → `cli/src/`
   - `dist/` → `cli/dist/`
   - `test/` → `cli/test/`
   - `package.json` → `cli/package.json`
   - `package-lock.json` → `cli/package-lock.json`
   - `tsconfig.json` → `cli/tsconfig.json`
   - `vitest.config.ts` → `cli/vitest.config.ts`
   - `LICENSE` → `cli/LICENSE`
   - `docs/ops.md` → `cli/ops.md`
2. `claudeMdSync.ts` の同期元ロジックを変更:
   - `AI_RESOURCES_BASE_PATH` を削除
   - `getSystemBasePath()` を新設（モノリポ内 system/ を参照）
   - 各同期関数のソースパスを更新
3. エラーメッセージ・ヒント文言を更新

### Phase 6: ドキュメント更新

1. `cli/ops.md` の同期元説明を更新
2. `system/docs/spec/vdev-spec.md` の ai-resources 前提記述を更新
3. `system/README.md` を作成（system の目的・編集ルール・registry の説明）
4. `evals/README.md` を作成（骨格のみ）

### Phase 7: クリーンアップ

1. ルートの `vdev-flow.md` を削除
2. `.claude/knowledge-manifest.txt` を削除
3. 不要ファイル（`file.md`, `future-feature.md` 等）を削除
4. `node_modules/` はルートに残さない（cli/ 配下のみ）

### Phase 8: リポジトリ名のリネーム

1. GitHub 上でリポジトリ名を `vdev-cli` → `vdev` に変更
2. README, CI, ドキュメント内の名称・リンクを更新

## Verify

### 構造確認

```bash
# 第一階層が cli/ system/ evals/ のみであること
ls -la | grep -E '^d' | awk '{print $NF}' | sort
# Expected: cli evals system (+ .git)

# system/docs 構造確認
ls -R system/docs/

# registry 存在確認
ls system/registry/
```

### CLI 動作確認

```bash
cd cli && npm run build && npm test

# sync コマンドが system/ を参照すること
vdev sync --force
# Expected: system/ からの同期成功メッセージ

# new コマンドが動作すること
vdev new test-topic --force
vdev gate test-topic
# Expected: NEEDS_INSTRUCTION
```

### 既存機能の回帰確認

```bash
# 既存 topic の gate が正常動作すること
vdev ls
vdev gate 2026-01-26-vdev-monorepo-system-registry
```

## DoD（Definition of Done）

1. リポジトリ直下が `cli/ system/ evals/` の第一階層になっている
2. `system/docs/flow/vdev-flow.md` と `system/docs/spec/vdev-spec.md` が存在する
3. `system/registry/system.manifest.yaml` と `system/registry/claude.manifest.yaml` が存在する
4. `vibe-coding-partner.md` が manifest に明示されている
5. `vdev sync` / `vdev new` が ai-resources を参照せずに動作する
6. `cli/ops.md` が存在し、同期元の説明が最新化されている
7. 以下がリポ内に移植されていない:
   - `checks/`, `prompts/`
   - `allowed1.md`, `allowed2.md`, `not-allowed.md`, `existing.md`, `file.md`
8. 既存の `vdev gate` を含むコマンド群の挙動に回帰がない
9. リポジトリ名が `vdev` にリネームされている

## Risk Assessment

- **Risk Level**: R2（中）
- **理由**:
  - 既存の vdev sync / vdev new の動作に影響を与える
  - ファイル移動が多く、パス参照の修正漏れリスクがある
  - リポジトリ名変更は外部参照に影響する可能性がある
- **緩和策**:
  - 各 Phase で Verify を実行し、段階的に確認する
  - 既存テストで回帰を検出する
  - リポジトリ名変更は最終段階で実施

## 必須ドキュメント更新要否

| ドキュメント | 更新要否 | 理由 |
|------------|---------|------|
| docs/spec.md (vdev-spec.md) | 要 | ai-resources 前提の記述を更新、配置場所を system/docs/spec/ に変更 |
| docs/ops.md | 要 | 同期元の説明を ai-resources → system/ に更新、配置場所を cli/ops.md に変更 |
| docs/arch.md | 不要 | 本リポジトリに arch.md は存在しない |

## 備考

- manifest のスキーマは最小でよい（配布元パス/配布先パス/allowlist/必須集合が表現できれば十分）
- `.claude/knowledges` への配布は互換のため維持してよいが、system/docs と概念的に混同しない設計・説明にする
- `vdev-spec--vdev-cliを正本とする.txt` 等の補助テキストは移植せず、system/docs/spec/vdev-spec.md に統合する
