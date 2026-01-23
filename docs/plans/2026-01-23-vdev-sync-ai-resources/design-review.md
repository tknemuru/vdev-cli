# Design Review: vdev sync 同期元を ai-resources に固定

## Attempt 1

### 評価サマリ

| 観点 | 評価 | コメント |
|-----|------|---------|
| instruction.md との整合性 | OK | 全要件をカバーしている |
| 必須ドキュメント更新要否 | OK | docs/ops.md の更新が明示されている |
| 変更範囲の適切性 | OK | 必要最小限の変更に抑えられている |
| エラーハンドリング | OK | 部分同期なし、明確なエラーで停止 |
| DoD の明確性 | OK | 検証可能な条件が具体的に記載 |
| Verify の具体性 | OK | コマンドと期待結果が明示されている |
| 実装手順の具体性 | OK | Step 1-6 で段階的に整理されている |

### 詳細レビュー

#### 1. 同期元パスの変更

- `~/.vdev/` → `~/projects/ai-resources/vibe-coding-partner/` への変更が明確
- 後方互換なしの判断は instruction.md と整合
- ヘッダーコメントの Source 表記更新も含まれている

#### 2. knowledges allowlist 同期

- knowledge-manifest.txt の読み込み仕様が明確
- 空行スキップは記載あり
- manifest 欠落ファイルでエラー停止の方針は instruction.md と整合

#### 3. ディレクトリ単位同期

- commands/ と subagents/ の丸ごとコピーが明示されている
- 新規ファイル追加時に vdev-cli 修正不要の要件を満たす設計

#### 4. エラーハンドリング

- ai-resources 不在、manifest 不在、欠落ファイルでエラー停止
- commands/subagents 不在は警告のみ（非致命的）という段階的な設計

#### 5. テスト戦略

- ai-resources モックディレクトリの使用
- `~/.vdev/` 参照テストの削除
- 主要条件のテストケースが列挙されている

### 懸念事項

特になし。instruction.md の要件を網羅しており、実装可能な粒度で記載されている。

### 判定

Status: DESIGN_APPROVED

設計は instruction.md の全要件を満たしており、実装手順・DoD・Verify が具体的で検証可能である。
