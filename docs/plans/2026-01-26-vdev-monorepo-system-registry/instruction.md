# Goal
vdev をモノリポ化し、第一階層を `cli/ system/ evals/` に統一する。  
`system/` は「vdevフローにおける MyGPT / Claude Code の設定定義集」として、第三者にも自然な OSS 的配置（docs + registry + adapters）に再設計する。  
従来 ai-resources に固定されていた `vdev sync` / `vdev new` の同期元を、モノリポ内 `system/` に切り替える。  
さらに、リポジトリ名を `vdev` にリネームする。

# Non-Goals
- `checks/` と `prompts/` の移植（対象外）
- constitution ドキュメントの新設（今回は作らない）
- evals の実行基盤の高度化（最小の骨格追加に留める）
- 不要ファイル（後述）の無理な分類・温存（移植しない）

# Repo Layout (Target)
リポジトリ直下（第一階層）は必ず以下：
- `cli/` : vdev CLI 実装（補助ツール） + CLI運用ドキュメント
- `system/` : MyGPT / Claude Code の設定定義集（SoTドキュメント配置 + 参照/配布定義）
- `evals/` : 圧力テスト・評価ケース（将来拡張）

## cli/
- 既存 vdev-cli の実装ツリーを `cli/` 配下へ移設（言語依存の構造は維持）
- `ops.md` は `cli/ops.md` に置く（system に入れない）
- CLI の README 等がある場合も `cli/` 配下に配置

## system/ (docs + registry + adapters)
- `system/docs/` : 人間が読む正本ドキュメント（あるべき場所に配置）
  - `system/docs/flow/vdev-flow.md`（SoT。constitution は作らない）
  - `system/docs/spec/vdev-spec.md`（SoT）
  - `system/docs/rules/vdev-runtime-rules.md`
  - `system/docs/formats/claude-output-format.md`
  - `system/docs/maps/knowledge-map.md`
  - `system/docs/guides/vibe-coding-partner.md`（MyGPT knowledge として必須）
- `system/registry/` : 参照・配布の定義（manifest）
  - `system/registry/system.manifest.yaml`（MyGPT/Claude 共通：参照すべき docs 集合）
  - `system/registry/claude.manifest.yaml`（sync 配布定義：コピー元/先 + docs allowlist）
  - （将来必要なら）`system/registry/mygpt.manifest.yaml`
- `system/adapters/claude/` : Claude Code 固有資材
  - `CLAUDE.md`
  - `commands/`
  - `subagents/`
- `system/README.md` : system の目的、編集ルール、registry の意味、配布の概念を説明

## evals/
最小の骨格のみ追加：
- `evals/README.md`
- `evals/reviewer/`（空でもよい）

# Migration (Source -> Target)
前提：旧資材は ai-resources の vibe-coding-partner 相当構造から移植されるが、移植対象は厳格に絞る（不要物は移植しない）。

## Move: Claude 固有資材 -> system/adapters/claude/
- 旧 `claude/CLAUDE.md` -> `system/adapters/claude/CLAUDE.md`
- 旧 `claude/commands/` -> `system/adapters/claude/commands/`
- 旧 `claude/subagents/` -> `system/adapters/claude/subagents/`
- 旧 `claude/knowledge-manifest.txt` は廃止（registry に置換）

※ 旧 `claude/` 配下のうち、今回合意で「不要」扱いのものは移植しない（下記「Exclude」を参照）

## Move: SoT/Docs -> system/docs/
- 旧 `knowledges/vdev-flow.md` -> `system/docs/flow/vdev-flow.md`
- 旧 `knowledges/vdev-runtime-rules.md` -> `system/docs/rules/vdev-runtime-rules.md`
- 旧 `knowledges/claude-output-format.md` -> `system/docs/formats/claude-output-format.md`
- 旧 `knowledges/knowledge-map.md` -> `system/docs/maps/knowledge-map.md`
- 旧 `knowledges/vibe-coding-partner.md` -> `system/docs/guides/vibe-coding-partner.md`

`vdev-spec.md` は SoT として `system/docs/spec/vdev-spec.md` に置く：
- 旧が `knowledges/vdev-spec--vdev-cliを正本とする.txt` 等の補助テキストで存在している場合は、
  - “正本の所在/説明” を含め、`system/docs/spec/vdev-spec.md` に統合する
  - 旧 `*--vdev-cliを正本とする.txt` は削除（役目終了）

## Exclude (Do NOT migrate)
ユーザー合意により、以下は移植対象外（存在しても取り込まない）：
- `checks/` 全て（移植しない）
- `prompts/` 全て（移植しない）
- 以下の不要ファイル（内容不明/不要のため）
  - `allowed1.md`
  - `allowed2.md`
  - `not-allowed.md`
  - `existing.md`
  - `file.md`
- その他、上の “Move” に明示されていないファイルは原則移植しない（必要になったら後続 topic で追加）

# Registry / Manifest (New)
`system/registry/` に manifest を新設し、参照/配布の SoT をここに集約する。

## system.manifest.yaml
- MyGPT/Claude 共通で参照すべき docs の集合を定義
- 少なくとも以下を “必須” として含める：
  - `system/docs/flow/vdev-flow.md`
  - `system/docs/spec/vdev-spec.md`
  - `system/docs/rules/vdev-runtime-rules.md`
  - `system/docs/formats/claude-output-format.md`
  - `system/docs/maps/knowledge-map.md`
  - `system/docs/guides/vibe-coding-partner.md`（MyGPT knowledge）

## claude.manifest.yaml
- `vdev sync` が配布するコピー元/コピー先の定義を持つ
- docs の配布対象 allowlist（system.manifest と整合）を持つ
- `.claude/knowledges` という配布先ディレクトリ名は互換のため維持してよい（ただし system/docs とは別概念として説明）

# vdev sync / vdev new changes
現状の「同期元（固定）: ~/projects/ai-resources/...」を廃止し、同期元をモノリポ内 `system/` に変更する。

## vdev sync
- 同期元: `<repo-root>/system/`
- `system/registry/claude.manifest.yaml` を SoT として配布を行う
- 配布要件（最低限）：
  - `system/adapters/claude/CLAUDE.md` -> `<target-repo>/CLAUDE.md`
  - `system/adapters/claude/commands/*` -> `<target-repo>/.claude/commands/*`
  - `system/adapters/claude/subagents/*` -> `<target-repo>/.claude/subagents/*`
  - `system/docs/**` のうち allowlist に含まれるもの -> `<target-repo>/.claude/knowledges/**`
  - `system/docs/flow/vdev-flow.md` -> `<target-repo>/vdev-flow.md`
- 既存の差分判定ポリシー（exit code/警告/特別扱い等）は可能な限り維持し、参照元パスだけを変更する

## vdev new
- 仕様どおり「sync と同等の同期」を実行するが、同期元は上記と同じ `<repo-root>/system/` を参照する
- --force の扱い等、既存仕様を崩さない

# Documentation updates
- `cli/ops.md`（= 旧 ops.md）内の “ai-resources を同期元とする” 記述を更新し、同期元がモノリポ `system/` であることを明記する
- `system/docs/spec/vdev-spec.md`（SoT）内の “ai-resources 前提” の記述も同様に更新する
- 文章中に “knowledges（= system/docs の保管場所）” という概念が混ざらないようにし、
  - 正本は `system/docs/`
  - 配布先の `.claude/knowledges` は “Claude側の互換ディレクトリ名”
  として用語を切り分ける

# Repo rename
- リポジトリ名を `vdev-cli` から `vdev` にリネームする
- README/CI/パス参照/ドキュメント内の名称やリンクを更新する（可能な範囲で）
- ディレクトリ名 `cli/` は維持（第一階層の合意）

# Acceptance Criteria
- repo 直下が `cli/ system/ evals/` の第一階層になっている
- `system/docs/flow/vdev-flow.md` と `system/docs/spec/vdev-spec.md` が存在し、SoT が自然な場所に置かれている
- `system/registry/system.manifest.yaml` と `system/registry/claude.manifest.yaml` が存在し、
  - `vibe-coding-partner.md` が knowledge として manifest に明示されている
  - 旧 `knowledge-manifest.txt` に依存しない
- `vdev sync` / `vdev new` が ai-resources を参照せずに動作する
- `cli/ops.md` が存在し、同期元の説明が最新化されている
- 以下はリポ内に移植されていない：
  - `checks/`、`prompts/`
  - `allowed1.md`、`allowed2.md`、`not-allowed.md`、`existing.md`、`file.md`
- 既存の `vdev gate` を含むコマンド群の挙動に回帰がない（最低限のテスト/手動確認を実施）

# Implementation Notes
- manifest のスキーマは最小でよい（配布元パス/配布先パス/allowlist/必須集合が表現できれば十分）
- 互換のため `.claude/knowledges` への配布は維持してよいが、system/docs と概念的に混同しない設計・説明にする
