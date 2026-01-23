目的
- vdev-cli の vdev sync を改修し、同期元を ai-resources（vibe-coding-partner）に固定する
- ~/.vdev/（symlink含む）を一切参照しない（後方互換なし）
- Claude Code に渡す資産（claude/）はディレクトリ単位で同期し、knowledges/ は allowlist（knowledge-manifest.txt）で絞って同期する
- 追加ファイルが発生しても vdev-cli の修正を最小化する（ファイル単位ハードコードを廃止）

前提
- 同期元リポ（ai-resources）には以下が存在する
  - vibe-coding-partner/claude/ （CLAUDE.md / commands/ / subagents/ / knowledge-manifest.txt 等）
  - vibe-coding-partner/knowledges/ （各 md）
- knowledge-manifest.txt は別トピックで追加済み（vibe-coding-partner/claude/knowledge-manifest.txt）

スコープ
- 対象リポジトリ：vdev-cli のみ
- 対象機能：vdev sync（同期元の探索・コピー仕様）
- 本トピックで行わないこと
  - ai-resources 側ファイルの追加・修正
  - ~/.vdev/ の削除（運用作業は別）
  - vdev の他サブコマンドの仕様変更

同期仕様（確定）

1) 同期元（Source）
- 同期元は ai-resources を固定とする
  - ~/projects/ai-resources/vibe-coding-partner/claude/
  - ~/projects/ai-resources/vibe-coding-partner/knowledges/
- ~/.vdev/ は一切参照しない
- 同期元が見つからない／必要ファイルが不足している場合は、明確なエラーで停止する（黙ってスキップしない）

2) 同期先（Destination）
- 同期対象リポジトリ（実行ディレクトリの git root）に以下の配置でコピーする
  - repo root / CLAUDE.md
  - repo root / .claude/commands/ （claude/commands/ を丸ごと）
  - repo root / .claude/subagents/ （claude/subagents/ を丸ごと）
  - repo root / .claude/knowledges/ （allowlist のみ）
- 既存ファイルは上書きする（vdev sync の責務として同期先を正本に揃える）

3) knowledges の allowlist（Manifest）
- allowlist は ai-resources 側の以下から読む
  - vibe-coding-partner/claude/knowledge-manifest.txt
- フォーマットは 1 行 1 ファイル名（拡張子込み）とし、空行は無視する
- 各行は vibe-coding-partner/knowledges/ 配下のファイル名として解釈する（相対パス、ワイルドカードは不許可）
- allowlist に記載されたファイルが knowledges/ に存在しない場合はエラーで停止する（同期欠落を許容しない）
- allowlist で選ばれた knowledges ファイルを repo 側 .claude/knowledges/ にコピーする

4) claude ディレクトリの同期（丸ごと）
- ai-resources 側 vibe-coding-partner/claude/ のうち、以下を丸ごとコピーする
  - CLAUDE.md（repo root に配置）
  - commands/（repo root/.claude/commands/ に配置）
  - subagents/（repo root/.claude/subagents/ に配置）
- claude/ 配下に新しいファイルやディレクトリが追加されても、上記コピーで自然に同期されるようにする

実装上の制約
- ハードコードで「特定ファイル名を1つずつ同期する」方式を避ける（ディレクトリコピー＋manifestで表現する）
- 既存の vdev sync の差分検出・--force 等の挙動がある場合、破壊しない（ただし ~/.vdev 参照は撤去する）
- 失敗時は部分同期のまま黙って終了しない（エラーで停止し、原因を明示する）

完了条件（DoD）
- vdev sync が ~/.vdev/ を一切参照しない（コード上・挙動上）
- vdev sync が ai-resources/vibe-coding-partner/claude を同期元として扱い、CLAUDE.md / commands / subagents を所定位置へ同期できる
- vdev sync が knowledge-manifest.txt を読み、allowlist の knowledges のみを .claude/knowledges/ に同期できる
- allowlist の欠落（存在しないファイル名）や同期元不足で確実にエラー停止できる
- 新しい claude 配下ファイル（例：reviewer-principles.md）追加時に vdev-cli の修正なしで同期できることが担保される

検証（Verify）
- vdev-cli のテストがある場合は追加・更新し、以下を検証する
  - ~/.vdev/ を参照しないこと（参照パスの不在）
  - ai-resources が見つからない場合にエラーになること
  - manifest 未存在／manifest 記載ファイル未存在でエラーになること
  - commands/subagents がディレクトリ単位で同期されること
  - allowlist の knowledges だけが .claude/knowledges/ に同期されること
  - CLAUDE.md が repo root に同期されること
- テストがない場合は、最小限の自動検証（ユニットまたはスナップショット）を追加して上記の主要条件を機械的に担保する

ロールバック
- 本トピックの変更を git revert で取り消せば、vdev sync は改修前の挙動に戻る
- ただし本トピックでは ~/.vdev 後方互換を廃止しているため、ロールバック時は旧運用（~/.vdev 参照）が復活する点を明記する
