# Instruction: ChatGPT/Claude manifest の再編と不要ドキュメント削除

## Risk Classification
- **R3（High）**
- 理由:
  - Claude / ChatGPT 両方の入力定義（manifest）を変更する
  - 参照される SoT / ドキュメント構成自体を削除・再編する
  - 誤ると以後の自律オーケストレーションや人手設定が破綻する可能性がある
- 方針:
  - 実装・レビューは自律で進めてよいが、
  - **最終 DONE 判定後の PR merge は Human が実施する**

## Goal / Outcome
モノリポ `system/` 配下で、以下を達成する。

1) ChatGPT(MyGPT) の人手設定（手動インプット）を repo 管理するための manifest を追加する  
2) Claude 配布定義（claude.manifest.yaml）を「Claude knowledges = vdev-flow.md のみ」に最小化する  
3) `system.manifest.yaml` を削除し、参照されなくなった docs を削除する  
4) README を最新構成に整合させる  
5) `vibe-coding-partner.md` は今回は残す（別タスクで CLAUDE.md へ部分移管する）

## Non-Goals / Constraints
- `system/adapters/chatgpt/system-instruction.md` は **既に手動追加済み**。今回の変更対象外（中身も変更しない）
- `system/docs/guides/vibe-coding-partner.md` は削除しない（今回残置）
- `system/adapters/claude/CLAUDE.md`、`.claude/commands`、`.claude/subagents` など Claude 側の資産内容は変更しない（manifest と README の整合以外に触れない）
- 新規の機能追加・UI追加・外部公開・DB拡張などは一切行わない

## Scope (Files)
### Add
- `system/registry/chatgpt.manifest.yaml`

### Modify
- `system/registry/claude.manifest.yaml`
- `system/README.md`

### Delete
- `system/registry/system.manifest.yaml`
- `system/docs/formats/claude-output-format.md`
- `system/docs/rules/vdev-runtime-rules.md`
- `system/docs/maps/knowledge-map.md`

## Required Changes (Detailed)
### 1) system/registry/chatgpt.manifest.yaml を追加
目的: ChatGPT(MyGPT/GPTs) の人手設定を repo の SoT として管理する。

要件:
- 「人手で設定すべきもの」を明記する（vdev sync の配布対象ではないこと）
- System Instruction の参照先は必ず:
  - `adapters/chatgpt/system-instruction.md`
- Knowledge uploads（ChatGPT側にアップロード/参照させるもの）は最小化し、必須は:
  - `docs/flow/vdev-flow.md`
- 余計な項目や過剰な運用手順の肥大化は避け、最小でよい

### 2) system/registry/claude.manifest.yaml を更新（knowledges最小化）
- `.claude/knowledges/` の allowlist は **`docs/flow/vdev-flow.md` のみ**にする
- `docs/rules/vdev-runtime-rules.md` と `docs/formats/claude-output-format.md` の配布設定（allowlist 記載）が存在する場合は削除する
- `main` の CLAUDE.md 配布、`flow` の vdev-flow.md 配布、`claude_dir`（commands/subagents）配布は既存の意図を崩さない

### 3) system.manifest.yaml の削除
- `system/registry/system.manifest.yaml` を削除する
- README から当該ファイルへの言及も削除し、代わりに `chatgpt.manifest.yaml` の説明を入れる

### 4) 参照されなくなった docs の削除
以下 3 ファイルを削除する:
- `system/docs/formats/claude-output-format.md`
- `system/docs/rules/vdev-runtime-rules.md`
- `system/docs/maps/knowledge-map.md`

削除後の整合:
- `claude.manifest.yaml` の allowlist から参照が消えていること
- README や他ドキュメントから参照されていないこと（残っていたら必要最小の修正で参照を除去）

### 5) system/README.md の更新
- `registry/` の説明を以下に更新する:
  - `claude.manifest.yaml`: Claude 配布定義（vdev sync 用）
  - `chatgpt.manifest.yaml`: ChatGPT(MyGPT) 手動設定定義（人手作業の SoT）
- `system.manifest.yaml` への説明・図示は削除
- `adapters/chatgpt/` の存在（system-instruction の置き場所）を明記
- docs については、今回削除したファイル群を前提とした説明に更新（必要最小）

## Verify
- `git status` が想定どおり（追加/更新/削除の対象ファイルのみ変更）であること
- `system/registry/claude.manifest.yaml` の knowledges allowlist が `docs/flow/vdev-flow.md` のみになっていること
- `system/registry/chatgpt.manifest.yaml` が存在し、参照先パスが `adapters/chatgpt/system-instruction.md` になっていること
- `system/registry/system.manifest.yaml` が削除されていること
- 指定の docs 3ファイルが削除されていること
- `system/README.md` が現構成と矛盾しないこと（system.manifest 参照が残っていないこと）
- `system/docs/guides/vibe-coding-partner.md` が残っていること

## Rollback
- 変更を取り消す場合は、追加ファイルを削除し、削除ファイルを復元し、manifest/README を元に戻す（git revert または該当 commit の取り消し）

