Status: DONE

Summary:
impl-review で指摘した NEEDS_CHANGES（差分検出と --force の整合、ops.md と CLI 出力の不一致）はすべて解消されている。
.claude/commands および .claude/subagents の同期挙動は、既存の CLAUDE.md / vdev-flow.md と同一ポリシーに統一され、
vdev sync 全体としての一貫性が保たれた。

特に以下の点を確認した:
- 差分検出が実装され、force=false / force=true の挙動が明確に分離されている
- 既存 symlink（~/.vdev/CLAUDE.md / ~/.vdev/vdev-flow.md）が改修前と同一であることが Verify で実証されている
- ops.md と CLI 出力が同期ポリシー・警告内容について一致している
- テスト追加により、回帰と境界条件（差分あり/なし、force、有無、同期元欠損）がカバーされている

Requests:
- なし

Verify:
1. npm test が全件パスしていること（78 tests）
2. 差分検出と --force の挙動が表形式仕様どおりであること
3. ~/.vdev/CLAUDE.md が symlink であり、リンク先が改修前と同一であること
4. ~/.vdev/vdev-flow.md が symlink であり、リンク先が改修前と同一であること
5. ops.md の記述と CLI 警告・出力が一致していること

Rollback:
1. .claude/{commands,subagents} 同期ロジックを revert する
2. 関連テストと docs/ops.md の追記を revert する
