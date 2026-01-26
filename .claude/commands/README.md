# Claude Custom Commands – Onboarding Guide

このディレクトリは **Claude Code の Custom Slash Commands** を、
**git 管理された知識資産として再利用する**ためのものです。

本 README は、リポジトリを clone した開発者が
**同一の Claude Code 体験（/vdev 等）を即座に再現できること**を目的とします。

---

## 目的

- Claude への定型指示（例：`CLAUDE.md に従って plan / 実装を行う`）を
  **コピペ不要で呼び出せる**ようにする
- vdev / vibe-coding の前提・判断を **SSOT（Single Source of Truth）** として git 管理する
- 個人環境でも、将来チーム環境でも **同じ運用が再現可能**であること

---

## 前提条件

- Claude Code（CLI）がインストール済みであること
- `~/.claude/` ディレクトリが存在すること（なければ自動作成されます）

---

## セットアップ手順（初回のみ）

### 1. このリポジトリを clone

```bash
git clone <this-repo-url> ~/projects/ai-resources/vibe-coding-partner
```

> ⚠️ パスは例です。**clone 先は任意ですが、以降の symlink 先と一致させてください。**

---

### 2. 既存の Claude commands を退避（必要な場合）

すでに `~/.claude/commands` が存在する場合は、念のため退避します。

```bash
mv ~/.claude/commands ~/.claude/commands.bak
```

---

### 3. シンボリックリンクを作成

```bash
ln -s \
  ~/projects/ai-resources/vibe-coding-partner/claude/commands \
  ~/.claude/commands
```

これにより、Claude Code からは **通常の Custom Commands として認識**されます。

---

### 4. 動作確認

Claude Code を起動し、以下を確認してください。

```text
/help
```

- `/vdev`
- `/vdev-plan`
- `/vdev-impl`

など、このディレクトリ内の `.md` ファイル名が
**Slash Command として一覧表示**されていれば成功です。

---

## 運用ルール（重要）

### ✅ このディレクトリでやってよいこと

- vdev フロー用の定型指示・ガード文言を `.md` として追加
- `/vdev-review` や `/vdev-fix` など、新しい gate / 用途のコマンドを追加
- 文言の改善・進化を PR / commit として議論

### ❌ やってはいけないこと

- commands/*.md 内で **相対パス参照**を使うこと
  - Claude Code 実行時の cwd は保証されません
- 実装詳細・コード生成をここに書くこと
  - ここは **「Claude が迷わないための前提注入レイヤー」** です

---

## 設計思想（Why this exists）

- 人間は「何を・なぜ」を決める
- Claude は「どう実装するか」を実行する
- この commands 層は、
  **Claude が vdev ルールを破らないための“環境側ガード”**です

この README と commands/*.md があることで、
**誰が clone しても同じ Vibe Coding 体験が再現される**状態を目指しています。

---

## トラブルシューティング

- `/help` にコマンドが出ない
  - symlink が正しく張られているか `ls -l ~/.claude` を確認
- command 名が期待と違う
  - `.md` ファイル名がそのまま `/command-name` になります

---

Happy Vibe Coding 🚀

