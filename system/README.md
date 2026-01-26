# system/

vdev フローにおける MyGPT / Claude Code の設定定義集。

## 目的

- vdev フローに必要なドキュメント・設定を一元管理する
- 第三者にも自然な OSS 的配置を提供する
- `vdev sync` / `vdev new` の同期元として機能する

## ディレクトリ構成

```
system/
├── docs/           # 人間が読む正本ドキュメント（SoT）
│   ├── flow/       # vdev-flow.md（フロー定義）
│   ├── spec/       # vdev-spec.md（CLI 仕様）
│   └── guides/     # vibe-coding-partner.md
├── registry/       # 参照・配布の定義（manifest）
│   ├── claude.manifest.yaml    # Claude 配布定義（vdev sync 用）
│   └── chatgpt.manifest.yaml   # ChatGPT(MyGPT) 手動設定定義
├── adapters/       # LLM アダプター固有資材
│   ├── claude/     # Claude Code 固有
│   │   ├── CLAUDE.md
│   │   ├── commands/
│   │   └── subagents/
│   └── chatgpt/    # ChatGPT(MyGPT) 固有
│       └── system-instruction.md
└── README.md       # このファイル
```

## 編集ルール

1. **docs/ 配下は正本（SoT）**: 直接編集してよい。変更は `vdev sync` で配布される。
2. **registry/ 配下は manifest**: 配布定義を変更する場合のみ編集する。
3. **adapters/ 配下は LLM 固有資材**: Claude Code / ChatGPT 固有の設定を配置する。

## registry の意味

### claude.manifest.yaml

`vdev sync` が配布するコピー元/コピー先の定義を持つ。
どのファイルをどこに配布するかを明示する。

### chatgpt.manifest.yaml

ChatGPT(MyGPT/GPTs) の人手設定を repo の SoT として管理する。
vdev sync の配布対象ではなく、人手で設定すべき内容を明記する。

## 配布の概念

- **正本**: system/docs/ に存在するファイル
- **配布先**: `vdev sync` により各リポジトリにコピーされるファイル
  - CLAUDE.md → リポジトリルート
  - vdev-flow.md → リポジトリルート
  - commands/, subagents/ → .claude/
  - knowledges (allowlist) → .claude/knowledges/

`.claude/knowledges/` は Claude 側の互換ディレクトリ名であり、正本は system/docs/ に存在する。
