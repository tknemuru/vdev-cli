# 目的（Purpose）
vdev sync によってコピーされるファイル（例：CLAUDE.md や関連ディレクトリ）を、
git 管理対象から完全に外す。

これにより、
- 古い断面ファイルが repo に残り続ける問題を解消する
- 「断面保存（snapshot 保存）」方針を正式に廃止する

---

## 背景 / 判断（Background / Decision）
- これまで vdev sync 由来のコピーを git 管理し、断面保存を試みていた
- しかし Claude Code はこれらを「今回の改修対象外」と判断するため、
  git 上のコピーが更新されず古くなっていた
- 断面保存の運用コストが高く、信頼性も低い
- よって方針を転換し、**sync コピーは生成物（ephemeral）として扱い、git 管理しない**

---

## スコープ（Scope）

### 対象（In-scope）
- vdev sync によって生成・コピーされるファイルおよびディレクトリ
  - 例：CLAUDE.md、コピーされた subagent 定義、checklist 等

### 対象外（Out-of-scope）
- 正本（canonical source）
- vdev の SoT 成果物
  - instruction.md
  - plan.md
  - design-review.md
  - impl.md
  - impl-review.md

---

## 作業内容（Tasks）

### 1. sync コピー物の特定
- vdev sync により生成されており、現在 git 管理されているファイル／ディレクトリを洗い出す
- 再生成可能であることが明確なもののみを対象とする（保守的に判断する）

### 2. git 管理から削除
- repo から完全に削除してよい場合：
  - `git rm` / `git rm -r` を使用する
- ローカルには残したいが、git 管理は不要な場合：
  - `git rm --cached` / `git rm -r --cached` を使用する

### 3. .gitignore への追加
- 特定した sync コピー物を .gitignore に追加する
- できるだけ限定的なパターンを書く（過度に広い glob は避ける）
- 今後 vdev sync を実行しても git 差分が出ないことを目的とする

### 4. コミット
- 以下を 1 コミットにまとめる：
  - sync コピー物の git 管理削除
  - .gitignore の更新
- 意図が分かるコミットメッセージを付ける
  - 例：「vdev sync 由来ファイルを git 管理対象から除外」

---

## Definition of Done（完了条件）
- sync コピー物が git 管理対象から外れている
- .gitignore により再追加されない
- vdev sync を再実行しても `git status` がクリーンなままである
- CI / テスト / 開発フローが破綻していない

---

## Verify（検証）
1. 変更後に `git status` を確認し、意図した削除のみが staged されていること
2. `vdev sync` を実行する
3. 再度 `git status` を確認し、sync コピー物が表示されないこと
4. 必要なテストや開発コマンドを実行し、依存がないことを確認する

---

## Rollback（切り戻し）
- 問題が発生した場合：
  - 当該コミットを revert する
  - もしくは .gitignore から必要最小限の項目を外し、再度 git 管理に戻す

---

## Risk（リスク）
- R2: 一部ツールや CI が、repo 内に存在する sync コピー物に暗黙依存している可能性
  - 対策：Verify を必ず実施する
- R1: .gitignore の指定が広すぎる
  - 対策：ignore ルールは最小限・明示的に書く

---

## 備考（Notes）
- 本 instruction では、断面保存・参照情報ファイルの作成は行わない
- vdev sync 由来のファイルはすべて「再生成可能な一時成果物」として扱う
