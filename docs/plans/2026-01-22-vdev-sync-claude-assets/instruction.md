[Context]
本トピックは vdev-cli リポジトリにおいて、vdev sync の配布ペイロードを拡張し、各リポジトリへ Claude 資産（.claude/commands と .claude/subagents）を配布できるようにする。
ai-resources 側で作成済みの canonical（commands / subagents / CLAUDE.md / vdev-flow.md）を前提とし、vdev-cli 側は「同期・配布の仕組み」だけを実装する。

現行運用の二層構造は維持する:
- ~/.vdev/CLAUDE.md と ~/.vdev/vdev-flow.md は論理参照点であり、実体は ai-resources 側（symlink 前提）
- vdev sync は ~/.vdev/ 配下を配布元として、各 repo にコピー配布する

[Non-Goals]
1. ai-resources リポジトリの内容変更は行わない。
2. vdev の状態機械・コマンド体系・出力フォーマットを変更しない。
3. 新しい設定ファイル形式や外部公開の仕組みを追加しない。
4. 既存の symlink 構造（~/.vdev/CLAUDE.md, ~/.vdev/vdev-flow.md）を変更・破壊しない。

[Source of Truth]
1. vdev CLI 仕様: vdev-spec.md
2. 運用レシピ: ops.md
3. canonical ファイルの実体: ai-resources（vdev-cli は ~/.vdev を配布元として扱う）

[Target State]
A. 配布元（~/.vdev）
1. ~/.vdev/CLAUDE.md（ai-resources への symlink が維持されている）
2. ~/.vdev/vdev-flow.md（ai-resources への symlink が維持されている）
3. ~/.vdev/.claude/commands/（実体ディレクトリ）
4. ~/.vdev/.claude/subagents/（実体ディレクトリ）

B. vdev sync 実行後の各リポジトリ
1. <repo>/CLAUDE.md（コピー）
2. <repo>/vdev-flow.md（コピー）
3. <repo>/.claude/commands/（コピー）
4. <repo>/.claude/subagents/（コピー）

[Design Decisions]
1. vdev sync の配布元は引き続き ~/.vdev とする。
2. ~/.vdev/CLAUDE.md / ~/.vdev/vdev-flow.md の symlink 構造は不変とする。
3. .claude 配下はコピー配布とし、symlink は生成しない。
4. 既存同期対象（CLAUDE.md / vdev-flow.md）を回帰させない。

[Tasks]

[Task 1: Locate current sync implementation]
- vdev sync の実装箇所と既存同期対象の定義を特定する。

[Task 2: Extend sync payload]
- ~/.vdev/.claude/commands → <repo>/.claude/commands を追加
- ~/.vdev/.claude/subagents → <repo>/.claude/subagents を追加
- 既存同期対象を破壊しないことを最優先とする。

[Task 3: Define ~/.vdev/.claude population rules]
- ~/.vdev/.claude/{commands,subagents} が欠けている場合の挙動を明確化する。
- ai-resources の場所を vdev-cli にハードコードしない。

[Task 4: Update ops documentation]
- 同期対象の追加内容を明記する。
- ~/.vdev/.claude の準備・復旧手順を明文化する。

[Tests]
- 追加同期対象がコピーされること。
- 既存の CLAUDE.md / vdev-flow.md 同期が壊れていないこと。
- 同期元欠損時の挙動が仕様通りであること。

[Verify]
1. 既存 symlink の非破壊確認（必須）
   - ls -l ~/.vdev/CLAUDE.md が symlink であること
   - ls -l ~/.vdev/vdev-flow.md が symlink であること
   - リンク先が ai-resources 側の正本を指していること
2. 同期元確認
   - ls -la ~/.vdev/.claude/commands
   - ls -la ~/.vdev/.claude/subagents
3. 任意 repo で vdev sync 実行後の確認
   - ls -R .claude/commands
   - ls -R .claude/subagents
   - ls -la CLAUDE.md
   - ls -la vdev-flow.md

[Rollback]
- sync 対象追加を revert
- ops ドキュメント追記を revert

[Completion Criteria]
1. vdev sync が .claude/commands と .claude/subagents を repo にコピーできる。
2. 既存の CLAUDE.md / vdev-flow.md 同期が回帰していない。
3. **~/.vdev/CLAUDE.md および ~/.vdev/vdev-flow.md の symlink が改修前と同一であることが確認されている。**
4. 同期元（~/.vdev/.claude）が欠けた場合の挙動が明確で、運用ドキュメントに記載されている。
