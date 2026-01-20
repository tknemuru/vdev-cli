# sync-claude-md — CLAUDE.md グローバル正本 + repo同期（--force 対応）

version: 1.0.0
created: 2026-01-20
status: DRAFT

---

## 確定仕様（最終合意）※本トピックの実装はこの仕様に完全準拠する

### グローバル正本（Single Source of Truth）
- 正本: `~/.vdev/CLAUDE.md`（※実体は symlink）
- 参照元実体（symlink のリンク先）:
  - `~/projects/ai-resources/vibe-coding-partner/claude/CLAUDE.md`

### repo 内配置
- 配置先: `<repo_root>/CLAUDE.md`
- 内容: 正本（`~/.vdev/CLAUDE.md`）を自動同期（上書き）
- 手編集は想定しない（自動生成ヘッダで明示）

---

## 事故防止の最低限ガード（必須）

repo 内 `CLAUDE.md` の先頭に **自動生成ヘッダ**を必ず付与する：

- 自動生成であること
- 正本の参照先（`~/.vdev/CLAUDE.md`）
- 最終同期日時
- 「手編集しない」注意書き

（ヘッダは毎回生成・更新される。本文は正本の内容で置換される）

---

## コマンド仕様（確定）

### 1) `vdev sync`
目的: repo の `CLAUDE.md` をグローバル正本に揃える（ただしデフォルトは事故防止で停止）

#### デフォルト挙動（--force なし）
- `<repo_root>/CLAUDE.md` が存在し、かつ **正本と差分があればエラーで停止**
- **上書きはしない**
- exit code = 1
- stderr に理由を表示

#### `vdev sync --force`
- 差分があっても **常に上書き**（自動生成ヘッダ付き）
- exit code = 0（成功）

---

### 2) `vdev new`
目的: topic 作成（+必要なら CLAUDE.md 同期も行う）

#### 必須要件
- topic 作成・meta 初期化は **必ず実行**（同期結果に関わらず）

#### 内部動作
- `vdev new` は内部で **`vdev sync` 相当**を実行する（repo_root の CLAUDE.md 同期）

#### 差分がある場合
- `--force` なし:
  - CLAUDE.md 同期のみ失敗
  - stderr に理由と `vdev sync --force` 案内を出す
  - exit code = 1
  - ただし topic 作成は完了していること（意味論は変えない）

- `--force` あり:
  - 同期のみ `--force` 扱いで上書き（topic 作成の意味は一切変えない）
  - exit code = 0（成功）

#### 重要（確定）
- `--force` は **同期にのみ作用**
- topic 作成の意味は一切変えない

---

## 表示メッセージ（推奨・確定）

差分検出時（forceなし）は必ず以下を stderr に出す：

ERROR: CLAUDE.md differs from global rules (source=~/.vdev/CLAUDE.md)
Hint: run 'vdev sync --force' to overwrite repo CLAUDE.md

---

## 実装スコープ

### In Scope
- `vdev sync` コマンド新設（--force 対応）
- `vdev new` に「同期処理」を組み込み（内部で sync 相当実行）
- グローバル正本 `~/.vdev/CLAUDE.md` を読み、repo の `CLAUDE.md` を生成/更新（自動生成ヘッダ付き）
- 差分検出（ヘッダ含めた最終生成結果との比較）と停止/上書きの挙動
- ドキュメント（vdev-spec.md / ops.md）に **削らず追記**で反映
- テスト追加

### Out of Scope
- `~/.vdev/CLAUDE.md` symlink 作成自体の自動化（手動作成でOK）
- 既存トピックの扱い
- plan のコピペ効率化

---

## 設計詳細（推奨）

### 1) 同期で生成する repo 側内容
repo `CLAUDE.md` の最終内容は次の合成で作る：

1) 自動生成ヘッダ（固定フォーマット）
2) 正本 `~/.vdev/CLAUDE.md` の本文（丸ごと）

※差分判定は「repo 側の現在内容」と「上記の生成結果」を比較して行う。

### 2) repo_root の決定
- `vdev` を実行しているカレントを repo_root とみなす（現行 vdev の前提に合わせる）
- 必要なら将来拡張で root 探索（git rev-parse）も検討するが、本トピックでは必須にしない

### 3) exit code
- `vdev sync`:
  - 差分あり・forceなし → 1
  - 成功（forceあり含む）→ 0
- `vdev new`:
  - topic 作成は常に実施
  - 同期が差分で失敗（forceなし）→ 1
  - 同期成功（forceあり含む）→ 0

---

## 実装タスク（DoD 直結）

### A) コア（同期ユーティリティ）
- `src/core/claudeMdSync.ts`（新規）
  - `readGlobalClaudeMd(): string`（`~/.vdev/CLAUDE.md` を読む）
  - `renderRepoClaudeMd(globalBody: string, nowIso: string): string`（ヘッダ付与して生成）
  - `differs(current: string | null, generated: string): boolean`
  - `writeRepoClaudeMd(repoRoot: string, generated: string): void`

ヘッダの必須要素：
- AUTO-GENERATED の明示
- source: `~/.vdev/CLAUDE.md`
- lastSyncedAt: <timestamp>
- DO NOT EDIT の注意

### B) `vdev sync` コマンド
- `src/commands/sync.ts`（新規）
  - `--force` オプション
  - forceなしで差分検出 → stderr に確定メッセージ → exit 1
  - forceあり → 常に上書き → exit 0

### C) `vdev new` への組み込み
- `src/commands/new.ts`（または該当）を更新
  - topic 作成・meta 初期化は最初に必ず実施
  - その後に同期処理を実行
  - 同期が差分で止まる場合（forceなし）でも、topic 作成済みであること
  - `vdev new --force` は「同期のみ force」として伝播

### D) docs（削らず追記）
- `docs/vdev-spec.md`
  - `vdev sync` 仕様追加
  - `vdev new` が内部で同期を行うこと（ただし topic 作成の意味論は不変）
  - `--force` が同期限定であること
- `docs/ops.md`
  - グローバル正本の場所（`~/.vdev/CLAUDE.md`）と symlink 前提
  - `vdev sync` の通常/force の使い分け
  - `vdev new` 実行時に差分があると exit=1 になるが topic は作られる点

### E) tests
- `test/sync.test.ts`（新規推奨）または既存に追加
  - 1) repo に CLAUDE.md なし → `vdev sync` → 生成される（0）
  - 2) repo に差分あり → `vdev sync` → 1（上書きされない）
  - 3) repo に差分あり → `vdev sync --force` → 0（上書きされる）
  - 4) `vdev new` で topic 作成が行われること（同期失敗でも topic が作られている）
  - 5) `vdev new --force` で差分があっても上書きされ exit 0

---

## 受け入れ条件（DoD）

- [ ] `~/.vdev/CLAUDE.md` を正本として repo の `CLAUDE.md` を生成できる（自動生成ヘッダ付与）
- [ ] `vdev sync` は差分時に停止し、確定メッセージを stderr に出す（exit=1）
- [ ] `vdev sync --force` は常に上書き（exit=0）
- [ ] `vdev new` は topic を必ず作り、内部で同期を試みる
- [ ] `vdev new` は差分があると同期のみ失敗し exit=1（topic は作成済み）
- [ ] `vdev new --force` は同期のみ force 扱いで上書きし exit=0
- [ ] docs を削らず追記で更新
- [ ] テストが追加され `npm test` が通る

---

## Verify（例）

# 差分検出（forceなし）
vdev sync
echo $?

# 強制同期
vdev sync --force
echo $?

# new: topic は必ず作られる（差分がある場合は exit=1 でも topic が存在）
vdev new sync-claude-md
echo $?
ls -la docs/plans/sync-claude-md 2>/dev/null || true

# new: force は同期のみ強制
vdev new sync-claude-md-force --force
echo $?
