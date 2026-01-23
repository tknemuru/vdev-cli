目的
- 前トピックの同期仕様不整合（claude 配下の reviewer-principles.md 等が各 repo に配布されない）を修正する
- vdev-cli の vdev sync において、ai-resources/vibe-coding-partner/claude 配下を「実質まるごと」同期できるようにする
- 追加ファイル発生時に vdev-cli 修正が不要である状態を保証する

前提
- 後方互換なし方針を維持する（~/.vdev/ は一切参照しない）
- 同期元は ai-resources 固定とする
  - ~/projects/ai-resources/vibe-coding-partner/claude/
  - ~/projects/ai-resources/vibe-coding-partner/knowledges/
- knowledges 側の allowlist（knowledge-manifest.txt）仕様は変更しない
  - manifest は ai-resources 側 vibe-coding-partner/claude/knowledge-manifest.txt に存在する

スコープ
- 対象リポジトリ：vdev-cli のみ
- 対象機能：vdev sync（claude 資産の同期範囲修正）
- 本トピックで行わないこと
  - ai-resources 側のファイル追加・修正
  - knowledges allowlist の内容変更
  - 他サブコマンドの仕様変更
  - ~/.vdev/ の削除（運用作業）

問題の定義（修正対象）
- 現行の同期仕様では、claude/ 配下の同期対象が CLAUDE.md / commands/ / subagents/ に限定されており、
  claude/ 直下に追加されたファイル（例：reviewer-principles.md）が各 repo に同期されない。
- その結果、CLAUDE.md / subagents/reviewer.md が参照している reviewer-principles.md が repo 側に存在せず、参照導線が切れる。

修正後の同期仕様（確定）

1) claude 配下の同期は「CLAUDE.md を除き、ディレクトリまるごと」を基本とする
- 同期元：ai-resources/vibe-coding-partner/claude/
- 同期先（repo 側）：
  - claude/CLAUDE.md は repo root に配置：<repo>/CLAUDE.md
  - claude/ 配下のその他すべて（ファイル・ディレクトリ）は repo 側 .claude/ に再帰コピーする：<repo>/.claude/
    - 対象に含まれる例：
      - commands/（.claude/commands/）
      - subagents/（.claude/subagents/）
      - reviewer-principles.md（.claude/reviewer-principles.md）
      - knowledge-manifest.txt（.claude/knowledge-manifest.txt）
      - 将来追加される任意ファイル（vdev-cli 修正不要で同期されること）

2) 同期のフィルタリング（claude 側）
- claude 配下については原則フィルタしない（ディレクトリまるごと同期）
- ただし CLAUDE.md のみは例外扱いで repo root に配置し、.claude/ 側には二重配置しない（重複回避）
  - もし実装都合で二重配置が避けられない場合は、DoD/Verify で明示し、混乱が起きないよう説明を追加する
  - 原則は二重配置しない

3) knowledges 側の同期は既存方針を維持
- allowlist は ai-resources 側の claude/knowledge-manifest.txt から読む
- 同期先は repo 側 .claude/knowledges/
- allowlist にない knowledges ファイルは同期しない

実装上の制約
- ファイル名の個別ハードコードを追加しない（reviewer-principles.md を特別扱いしない）
- 追加ファイルが claude/ 直下に増えても、自動的に同期される設計にする
- 失敗時は明確なエラーで停止し、部分同期を黙って成功扱いしない
- 既存の vdev sync の差分検出や --force 等の挙動がある場合は破壊しない（ただし同期対象の拡張により差分は増えうる）

完了条件（DoD）
- vdev sync 実行後、repo 側に reviewer-principles.md が配置されている（.claude/reviewer-principles.md）
- vdev sync が ai-resources の claude/ 配下新規ファイルを、vdev-cli 修正なしで同期できる
- claude/ 配下の同期が CLAUDE.md / commands / subagents に限定されていない（「CLAUDE.md を除きまるごと」になっている）
- knowledges allowlist の仕様と同期先（.claude/knowledges/）は従来方針どおり維持されている
- ~/.vdev/ は引き続き一切参照しない（後方互換なし）

検証（Verify）
- 自動テスト（可能なら）を追加・更新し、最低限以下を機械的に検証する
  - claude/ 直下ファイル（reviewer-principles.md 等）が .claude/ に同期される
  - claude/commands と claude/subagents がディレクトリ再帰コピーされる
  - CLAUDE.md が repo root に同期される
  - knowledges は allowlist のみ .claude/knowledges/ に同期される
  - ~/.vdev/ を参照していない（参照パス不在）
- テストがない場合は、最小限の統合テストまたはスナップショット検証を追加して上記条件を担保する

ロールバック
- 本トピックの変更を git revert で取り消せば、claude 直下ファイルの同期が行われない旧挙動に戻る
