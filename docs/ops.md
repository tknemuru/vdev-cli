# vdev Operations Guide（v2.0）

## 1. はじめに

### 1.1 本ドキュメントの目的

本ドキュメントは vdev-cli の運用ガイドである。
状態（gate）別の許可操作、CLI 固有の注意点、同期・初期化コマンドの挙動を説明する。

### 1.2 本ドキュメントが扱わないこと

以下は本ドキュメントの対象外とする。別途定義されたフロー仕様を参照すること。

- 実行主体・責務分担
- レビューや承認の意思決定プロセス
- 例外時の介入・履歴管理・統制ポリシー
- マージ・リリース等の上位判断

### 1.3 参照先

- CLI 仕様: vdev-spec.md
- フロー仕様: 別途定義されたフロー仕様を参照

---

## 2. 状態別操作リファレンス

vdev gate の出力を確認し、現在の状態に応じた操作を行う。

```bash
vdev gate <topic>
```

### 2.1 NEEDS_INSTRUCTION（Exit Code: 10）

**意味**: instruction.md が未登録

**許可コマンド**:
```bash
echo "..." | vdev instruction <topic> --stdin
```

**注意点**:
- topic が存在しない場合は先に `vdev new` を実行する

---

### 2.2 NEEDS_PLAN（Exit Code: 11）

**意味**: plan.md が未登録

**許可コマンド**:
```bash
cat plan.md | vdev plan <topic> --stdin
```

**注意点**:
- instruction.md が存在しない場合は COMMAND_ERROR(1)

---

### 2.3 NEEDS_DESIGN_REVIEW（Exit Code: 12）

**意味**: design-review.md が未登録

**許可コマンド**:
```bash
cat design-review.md | vdev review <topic> --stdin
```

**Status 抽出パターン**: `^Status:\s*(DESIGN_APPROVED|REJECTED|NEEDS_CHANGES)\s*$`

**注意点**:
- plan.md が存在しない場合は COMMAND_ERROR(1)
- Status 行が規定フォーマットに一致しない場合は COMMAND_ERROR(1)

---

### 2.4 DESIGN_APPROVED（Exit Code: 13）

**意味**: 設計承認済み、実装開始可能

**許可コマンド**:
```bash
vdev start <topic>
```

**注意点**:
- start 実行前に実装を行わない
- start 実行後、状態は IMPLEMENTING に遷移する

---

### 2.5 IMPLEMENTING（Exit Code: 14）

**意味**: 実装中

**許可コマンド**:
```bash
cat impl.md | vdev impl <topic> --stdin
```

**注意点**:
- status が IMPLEMENTING 以外の場合は COMMAND_ERROR(1)
- impl.md 登録後、状態は NEEDS_IMPL_REVIEW に遷移する

---

### 2.6 NEEDS_IMPL_REPORT（Exit Code: 15）

**意味**: impl.md が未登録（実装完了報告待ち）

**許可コマンド**:
```bash
cat impl.md | vdev impl <topic> --stdin
```

**注意点**:
- 状態 IMPLEMENTING において impl.md が未登録の場合に gate がこの状態を返す

---

### 2.7 NEEDS_IMPL_REVIEW（Exit Code: 16）

**意味**: impl-review.md が未登録

**許可コマンド**:
```bash
cat impl-review.md | vdev impl-review <topic> --stdin
```

**Status 抽出パターン**: `^Status:\s*(DONE|NEEDS_CHANGES)\s*$`

**注意点**:
- impl.md が存在しない場合は COMMAND_ERROR(1)
- Status 行が規定フォーマットに一致しない場合は COMMAND_ERROR(1)

---

### 2.8 DONE（Exit Code: 0）

**意味**: 完了

**許可コマンド**: なし（読み取り専用）

**注意点**:
- 全ファイルのハッシュ整合が必須
- ハッシュ不整合がある場合は BROKEN_STATE

---

### 2.9 REJECTED（Exit Code: 17）

**意味**: 設計却下

**許可コマンド**: なし

**対応方法**:
- topic を破棄するか、新規 topic を作成する

---

### 2.10 BROKEN_STATE（Exit Code: 20）

**意味**: 整合性エラー

**許可コマンド**: なし

**代表的な原因**:
- meta.json の手動編集
- ファイルの直接編集によるハッシュ不整合
- meta.json のパース失敗

**対応方法**:
- CLI による修復コマンドは提供されない
- topic を破棄し、新規作成を推奨

---

## 3. 差戻し時の挙動

### 3.1 設計差戻し（NEEDS_CHANGES）

design-review に `Status: NEEDS_CHANGES` が記載された場合:

1. status は NEEDS_PLAN に戻る
2. plan.md を修正し、`vdev plan` で再登録
3. `vdev review` で再レビュー

### 3.2 実装差戻し（NEEDS_CHANGES）

impl-review に `Status: NEEDS_CHANGES` が記載された場合:

1. status は IMPLEMENTING に戻る
2. 実装を修正し、`vdev impl` で再登録
3. `vdev impl-review` で再レビュー

### 3.3 CLI が保証しない範囲

- 差戻し回数の管理
- レビュー履歴の追跡

---

## 4. CLI 運用上の注意点

### 4.1 手動編集禁止

以下のファイル・ディレクトリを直接編集しない:

- `docs/plans/<topic>/` 配下のファイル
- `meta.json`

手動編集は BROKEN_STATE の原因となる。

### 4.2 stdin と改行コード

- 全 stdin 入力は保存時に CRLF → LF に変換される
- --stdin フラグは必須

### 4.3 gate による行動判断

`vdev gate` は次の行動を決めるために使用する。
gate の出力と exit code を確認し、状態に応じた操作を行う。

---

## 5. 同期・初期化コマンド

### 5.1 vdev new

新しい topic を作成する。

```bash
vdev new <name> [--force]
```

**動作**:
1. `<name>` を slug 化し、日付プレフィックスを付与
2. `docs/plans/<topic>/` ディレクトリを作成
3. meta.json を初期状態（NEEDS_INSTRUCTION）で作成
4. ai-resources から同期を試行（CLAUDE.md, vdev-flow.md, commands, subagents, knowledges）

**--force の効果**:
- 差分があっても上書きする（topic 作成は常に実行）

**slug 正規化ルール**:
- 大文字 → 小文字
- 特殊文字・スペース → ハイフン
- 連続ハイフン → 単一ハイフン
- 先頭・末尾のハイフン → 削除
- 最大長: 48 文字
- 空文字列 → `untitled`

### 5.2 vdev sync

ai-resources から各種資産を同期する。

```bash
vdev sync [--force]
```

**同期元（固定）**:
```
~/projects/ai-resources/vibe-coding-partner/
├── claude/
│   ├── CLAUDE.md          → repo root/CLAUDE.md
│   ├── commands/          → repo root/.claude/commands/
│   ├── subagents/         → repo root/.claude/subagents/
│   └── knowledge-manifest.txt
└── knowledges/
    ├── vdev-flow.md       → repo root/vdev-flow.md
    └── *.md               → repo root/.claude/knowledges/ (allowlist のみ)
```

**デフォルト動作**（--force なし）:
- CLAUDE.md に差分があれば stderr にエラーを出力し exit 1
- その他の資産は差分があっても警告のみ（exit code に影響しない）

**--force 指定時**:
- 差分があっても常に上書き
- exit 0

**差分判定**:
- Last synced 行は比較対象から除外

### 5.3 .claude 資産（commands / subagents）の同期

**配布元の構成**:
```
~/projects/ai-resources/vibe-coding-partner/claude/
├── commands/
│   └── *.md
└── subagents/
    └── *.md
```

**同期ポリシー**:
- 差分なし: 何もしない
- 差分あり + --force なし: 警告のみ（上書きしない）
- 差分あり + --force あり: 上書き
- 同期先が存在しない: 新規作成（--force 不要）

**注意点**:
- 同期元が存在しない場合は警告のみ（exit code には影響しない）
- .claude 資産の同期失敗は exit code に影響しない

### 5.4 knowledges の同期（allowlist 方式）

**配布元**:
```
~/projects/ai-resources/vibe-coding-partner/
├── claude/
│   └── knowledge-manifest.txt  (allowlist)
└── knowledges/
    └── *.md
```

**同期先**:
```
repo root/.claude/knowledges/
```

**allowlist（knowledge-manifest.txt）の形式**:
- 1 行 1 ファイル名（拡張子込み）
- 空行は無視
- `#` で始まる行はコメントとして無視

**同期ポリシー**:
- manifest に記載されたファイルのみを同期する
- manifest に記載されたファイルが knowledges/ に存在しない場合はエラーで停止
- 同期先に余分なファイルがある場合は削除される（--force 時）

**注意点**:
- manifest が存在しない場合は警告のみ
- knowledges の同期失敗は exit code に影響しない

---

## 6. vdev ls

全 topic をリスト表示する。

```bash
vdev ls
```

**出力フォーマット**:
```
REPO=<repo>	<topic>	<status>	<title>	<updatedAt>
```

**ソート**: updatedAt 降順

**Broken Topic**: status に BROKEN_STATE を表示
