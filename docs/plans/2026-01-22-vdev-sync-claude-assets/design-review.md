Status: DESIGN_APPROVED

Summary:
本 Plan は、vdev-cli リポジトリにおける責務（vdev sync の配布ペイロード拡張）にスコープを厳密に限定できており、
ai-resources 側の canonical 定義と明確に分離されている。
特に以下の点が評価できる。

- ~/.vdev を配布元とする既存二層構造（論理SoT / 物理正本）を一切崩さない設計であること
- 既存の symlink（~/.vdev/CLAUDE.md / ~/.vdev/vdev-flow.md）を **Non-Goals・Verify・Completion Criteria の三箇所で明示的に保護**していること
- 同期対象追加による回帰リスク（既存同期の破壊）を、設計段階で強く抑制していること
- ai-resources の場所を vdev-cli にハードコードしないという、将来の運用変更に耐える判断

また、必須ドキュメント更新要否が implicit に整理されており、vibe-coding-partner.md の Design Review ゲート要件とも整合している。

Requests:
- なし（現時点で修正要求なし）

Verify:
1. ~/.vdev/CLAUDE.md が symlink であり、リンク先が改修前と同一であること
2. ~/.vdev/vdev-flow.md が symlink であり、リンク先が改修前と同一であること
3. ~/.vdev/.claude/commands および ~/.vdev/.claude/subagents が同期元として存在すること
4. vdev sync 実行後、repo に以下がコピーされていること
   - .claude/commands
   - .claude/subagents
   - CLAUDE.md
   - vdev-flow.md
5. CLAUDE.md / vdev-flow.md の既存同期挙動が回帰していないこと

Rollback:
1. vdev sync の同期対象追加を revert する
2. ops.md の追記を revert する
