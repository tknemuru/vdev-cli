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
│   ├── rules/      # vdev-runtime-rules.md
│   ├── formats/    # claude-output-format.md
│   ├── maps/       # knowledge-map.md
│   └── guides/     # vibe-coding-partner.md
├── registry/       # 参照・配布の定義（manifest）
│   ├── system.manifest.yaml   # 参照必須 docs 集合
│   └── claude.manifest.yaml   # 配布定義
├── adapters/       # LLM アダプター固有資材
│   └── claude/     # Claude Code 固有
│       ├── CLAUDE.md
│       ├── commands/
│       └── subagents/
└── README.md       # このファイル
```

## 編集ルール

1. **docs/ 配下は正本（SoT）**: 直接編集してよい。変更は `vdev sync` で配布される。
2. **registry/ 配下は manifest**: 配布定義を変更する場合のみ編集する。
3. **adapters/ 配下は LLM 固有資材**: Claude Code 固有の設定・コマンド・サブエージェント定義を配置する。

## registry の意味

### system.manifest.yaml

MyGPT / Claude 共通で参照すべき docs の集合を定義する。
MyGPT の knowledge upload や Claude Code の参照先として使用される。

### claude.manifest.yaml

`vdev sync` が配布するコピー元/コピー先の定義を持つ。
どのファイルをどこに配布するかを明示する。

## 配布の概念

- **正本**: system/docs/ に存在するファイル
- **配布先**: `vdev sync` により各リポジトリにコピーされるファイル
  - CLAUDE.md → リポジトリルート
  - vdev-flow.md → リポジトリルート
  - commands/, subagents/ → .claude/
  - knowledges (allowlist) → .claude/knowledges/

`.claude/knowledges/` は Claude 側の互換ディレクトリ名であり、正本は system/docs/ に存在する。
