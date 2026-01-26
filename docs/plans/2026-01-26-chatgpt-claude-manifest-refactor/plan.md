# Plan: ChatGPT/Claude manifest の再編と不要ドキュメント削除

## Risk Classification

- **R3（High）**
- 理由: instruction.md に記載のとおり（manifest 変更、SoT 構成変更、自律オーケストレーション破綻リスク）
- 方針: 実装・レビューは自律で進め、最終 DONE 判定後の PR merge は Human が実施

## Summary

モノリポ `system/` 配下で、ChatGPT 手動設定用 manifest の追加、Claude 配布定義の最小化、不要ファイルの削除、README の整合を行う。

## Prerequisites

- `system/adapters/chatgpt/system-instruction.md` が既に存在すること（instruction では「手動追加済み」と記載されているが、現時点で存在しない場合は Human に確認する）

## Implementation Steps

### Step 1: chatgpt.manifest.yaml の作成

**対象ファイル**: `system/registry/chatgpt.manifest.yaml`（新規作成）

**内容**:
- ChatGPT(MyGPT/GPTs) の人手設定を repo の SoT として管理するための manifest
- vdev sync の配布対象ではなく、人手で設定すべきものを明記
- System Instruction 参照先: `adapters/chatgpt/system-instruction.md`
- Knowledge uploads: `docs/flow/vdev-flow.md` のみ（最小化）

### Step 2: claude.manifest.yaml の更新

**対象ファイル**: `system/registry/claude.manifest.yaml`

**変更内容**:
- knowledges allowlist から以下を削除:
  - `docs/rules/vdev-runtime-rules.md`
  - `docs/formats/claude-output-format.md`
- knowledges allowlist を `docs/flow/vdev-flow.md` のみにする
- main, flow, claude_dir の配布設定は維持（既存の意図を崩さない）

### Step 3: system.manifest.yaml の削除

**対象ファイル**: `system/registry/system.manifest.yaml`

**アクション**: ファイルを削除

### Step 4: 不要 docs の削除

**対象ファイル**（すべて削除）:
- `system/docs/formats/claude-output-format.md`
- `system/docs/rules/vdev-runtime-rules.md`
- `system/docs/maps/knowledge-map.md`

**整合確認**:
- claude.manifest.yaml から参照が消えていること（Step 2 で対応済み）
- README から参照がないこと（Step 5 で対応）

### Step 5: README.md の更新

**対象ファイル**: `system/README.md`

**変更内容**:
1. registry/ の説明を更新:
   - `claude.manifest.yaml`: Claude 配布定義（vdev sync 用）
   - `chatgpt.manifest.yaml`: ChatGPT(MyGPT) 手動設定定義（人手作業の SoT）
2. `system.manifest.yaml` への言及を削除
3. `adapters/chatgpt/` の存在（system-instruction の置き場所）を明記
4. docs の構成説明から削除対象（formats/, rules/, maps/）を除去

## Required Document Update Assessment

| ドキュメント | 更新要否 | 理由 |
|-------------|---------|------|
| docs/spec.md | 不要 | 本変更は vdev CLI の外部仕様に影響しない |
| docs/ops.md | 不要 | 運用手順に影響しない |
| docs/arch.md | 不要 | 設計境界に影響しない（manifest 定義の整理のみ） |

## DoD (Definition of Done)

1. `system/registry/chatgpt.manifest.yaml` が存在し、正しい参照先を持つ
2. `system/registry/claude.manifest.yaml` の knowledges allowlist が `docs/flow/vdev-flow.md` のみ
3. `system/registry/system.manifest.yaml` が削除されている
4. `system/docs/formats/claude-output-format.md` が削除されている
5. `system/docs/rules/vdev-runtime-rules.md` が削除されている
6. `system/docs/maps/knowledge-map.md` が削除されている
7. `system/README.md` が現構成と整合している
8. `system/docs/guides/vibe-coding-partner.md` が残っている

## Verify

```bash
# 1. 追加ファイルの存在確認
test -f system/registry/chatgpt.manifest.yaml && echo "PASS: chatgpt.manifest.yaml exists"

# 2. claude.manifest.yaml の knowledges allowlist 確認
grep -A 5 "allowlist:" system/registry/claude.manifest.yaml | grep -q "vdev-flow.md" && echo "PASS: vdev-flow.md in allowlist"
grep -A 5 "allowlist:" system/registry/claude.manifest.yaml | grep -qv "vdev-runtime-rules.md" && echo "PASS: vdev-runtime-rules.md not in allowlist"
grep -A 5 "allowlist:" system/registry/claude.manifest.yaml | grep -qv "claude-output-format.md" && echo "PASS: claude-output-format.md not in allowlist"

# 3. 削除ファイルの確認
! test -f system/registry/system.manifest.yaml && echo "PASS: system.manifest.yaml deleted"
! test -f system/docs/formats/claude-output-format.md && echo "PASS: claude-output-format.md deleted"
! test -f system/docs/rules/vdev-runtime-rules.md && echo "PASS: vdev-runtime-rules.md deleted"
! test -f system/docs/maps/knowledge-map.md && echo "PASS: knowledge-map.md deleted"

# 4. 残すべきファイルの確認
test -f system/docs/guides/vibe-coding-partner.md && echo "PASS: vibe-coding-partner.md preserved"

# 5. README から system.manifest.yaml への参照がないこと
! grep -q "system.manifest.yaml" system/README.md && echo "PASS: No reference to system.manifest.yaml in README"

# 6. git status で変更対象の確認
git status --short system/
```

## Rollback

変更を取り消す場合:
```bash
git checkout HEAD -- system/
```
追加ファイル（chatgpt.manifest.yaml）は手動で削除する。

## Out of Scope

- `system/adapters/chatgpt/system-instruction.md` の内容変更
- `system/docs/guides/vibe-coding-partner.md` の変更・削除
- `system/adapters/claude/CLAUDE.md` の内容変更
- `.claude/commands`, `.claude/subagents` の変更
