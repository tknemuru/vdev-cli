system ドキュメント一括修正：Attemptモデル・CLI簡素化後の前提統一（.claude編集禁止を明示）

--------------------------------
RISK LEVEL
--------------------------------
本トピックは Claude / vdev 運用の根幹ドキュメント（SoT/手順/役割定義）を一括更新するため、
運用・自律オーケストレーションに直接影響する **高リスク変更（R3）** とする。

最終 Approve / Merge は Human が実施する。

--------------------------------
最重要制約（絶対遵守）
--------------------------------
- 作業は **main ブランチから作成した feature ブランチ** 上で行うこと
- 今回は **ドキュメント修正のみ**（vdev-cli 実装・テストは変更しない）
- 「一度ですべて整合させる」前提：部分修正や段階的適用は禁止

- **.claude 配下のファイルはすべてコピー生成物である**
  - vdev sync 等により自動生成・上書きされる
  - **絶対に編集してはならない**
  - 調査対象・修正対象のいずれにも含めない
  - 差分が発生した場合は不正とみなす

- 修正対象は、提示された system 配下の **正本ドキュメントのみ** とする
- 既に削除済の旧パス（ai-resources/vibe-coding-partner/*）は参照・修正しない

--------------------------------
目的
--------------------------------
Attemptモデル導入および vdev-cli 簡素化後の実装状態に合わせて、
system 配下のドキュメント全体で **前提・用語・成果物パス・差戻しループ・役割分担** を統一し、
旧仕様（単一reviewファイル前提／vdev plan/impl必須／hash強制／削除で無効化等）を完全排除する。

--------------------------------
共通の前提（全ドキュメントで必ず一致させる）
--------------------------------

SoT方針（明文化必須）
- SoT は「正本 md + 最新レビュー Attempt」により構成される
- SoT は完全な変更履歴の保存を責務に含めない（Git履歴を前提条件にしない）
- 正本（Canonical Artifacts）は単一正本・上書き（Attemptは積まない）
  - instruction.md
  - plan.md
  - impl.md
- 意思決定（Decision Artifacts）は Attempt を積む（レビューのみ）
  - design-review/attempt-XXX.md
  - impl-review/attempt-XXX.md
- gate は常に「最新 attempt のみ」を解釈する

状態遷移（統一）
- design review 最新attemptが NEEDS_CHANGES:
  - 次アクションは再 design review
  - gate は NEEDS_DESIGN_REVIEW を返す
- impl review 最新attemptが NEEDS_CHANGES:
  - 次アクションは実装修正
  - gate は IMPLEMENTING を返す

CLI位置づけ（統一）
- vdev-cli は必須操作ではなく補助ツール
- gate は状態確認・同期の入口
- vdev plan/impl/review/impl-review を必須と誤解させる記述を排除

エラー概念（統一）
- Status 行が規約外で導出不能な場合は COMMAND_ERROR（exit 1）
- BROKEN_STATE は致命的破損（例: パース不能）に限定
- hash 不一致はエラー条件ではない

--------------------------------
修正対象ファイル（正本のみ）
--------------------------------
以下を **同一トピックで一括修正**する。

A) Claude Adapter（Claude が直接参照する正本）
- system/adapters/claude/CLAUDE.md
- system/adapters/claude/reviewer-principles.md
- system/adapters/claude/subagents/implementer.md
- system/adapters/claude/subagents/reviewer.md
- system/adapters/claude/commands/README.md
- system/adapters/claude/commands/vdev.md
- system/adapters/claude/commands/merge.md（影響があれば）
- system/adapters/claude/commands/push.md（影響があれば）
- system/adapters/claude/commands/pclip.md（影響があれば）
- system/adapters/claude/commands/iclip.md（影響があれば）
※ **.claude/** 配下は一切含めない

B) Docs（SoT / フロー / ガイド）
- system/docs/flow/vdev-flow.md
- system/docs/spec/vdev-spec.md
- system/docs/guides/vibe-coding-partner.md
- system/README.md（参照があれば）

C) ChatGPT Adapter（必要な場合のみ）
- system/adapters/chatgpt/system-instruction.md
- system/registry/chatgpt.manifest.yaml
- system/registry/claude.manifest.yaml
※ review成果物パス／CLI必須性／hash強制等に触れている場合のみ修正

--------------------------------
（以下、各ファイルの具体修正指示・横断チェック・作業手順・DoD は前版 instruction と同一）
--------------------------------

完了条件（DoD）補足
--------------------------------
- .claude 配下に **一切の差分が存在しない**
- 正本ドキュメントのみが変更されている
- Attemptモデル・SoT方針・状態遷移が全ドキュメントで一致している

