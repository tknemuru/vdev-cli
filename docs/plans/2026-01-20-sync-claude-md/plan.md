# sync-claude-md 実装計画

version: 1.1.0
created: 2026-01-20
status: DRAFT

---

## 1. 概要

本計画は instruction.md に基づき、`vdev sync` コマンドの新設と `vdev new` への同期処理組み込みを実装する。

グローバル正本（`~/.vdev/CLAUDE.md`）を読み取り、repo の `CLAUDE.md` を自動生成ヘッダ付きで生成・同期する機能を提供する。

---

## 2. 実装範囲（In Scope）

1. `src/core/claudeMdSync.ts` 新規作成（同期ユーティリティ）
2. `src/commands/sync.ts` 新規作成（`vdev sync` コマンド）
3. `src/commands/new.ts` 更新（内部で sync 相当を実行）
4. `src/cli.ts` 更新（sync コマンド登録）
5. `docs/vdev-spec.md` 追記
6. `docs/ops.md` 追記
7. `test/sync.test.ts` 新規作成

---

## 3. 実装手順

### Step 1: `src/core/claudeMdSync.ts` 新規作成

以下の関数を実装する：

```typescript
// グローバル正本のパス
export function getGlobalClaudeMdPath(): string
// ~/.vdev/CLAUDE.md を返す

// グローバル正本を読み取る
export function readGlobalClaudeMd(): string | null
// ファイルが存在しない場合は null を返す

// 自動生成ヘッダ付きの repo 用 CLAUDE.md を生成
export function renderRepoClaudeMd(globalBody: string, nowIso: string): string
// ヘッダフォーマット:
// <!-- AUTO-GENERATED FILE - DO NOT EDIT -->
// <!-- Source: ~/.vdev/CLAUDE.md -->
// <!-- Last synced: <nowIso> -->
//
// <globalBody>
// 末尾改行: globalBody の末尾改行を保持し、追加しない

// 差分判定（Last synced 行を除外して比較）
export function differs(current: string | null, generated: string): boolean
// current が null の場合は true（差分あり＝新規生成必要）
// current と generated を比較する際、Last synced 行は値を無視して比較する
// 具体的には、両方の文字列から Last synced 行を除去または正規化してから比較する

// repo の CLAUDE.md を書き込む
export function writeRepoClaudeMd(repoRoot: string, generated: string): void

// repo の CLAUDE.md を読み取る
export function readRepoClaudeMd(repoRoot: string): string | null

// 同期処理のメイン関数
export interface SyncResult {
  success: boolean;
  written: boolean;        // 書き込みが行われたか
  hasDiff: boolean;        // 差分があったか（Last synced 除外後）
  globalMissing: boolean;  // グローバル正本が存在しないか
  message: string;
}

export function syncClaudeMd(repoRoot: string, force: boolean): SyncResult
```

### Step 2: `src/commands/sync.ts` 新規作成

```typescript
export interface SyncCommandResult {
  success: boolean;
  message: string;
}

export function syncCommand(force: boolean): SyncCommandResult
```

動作：
1. `process.cwd()` で repoRoot を取得（vdev 実行時のカレントディレクトリ）
2. `syncClaudeMd(repoRoot, force)` を実行
3. 結果に応じてメッセージを返す

### Step 3: `src/cli.ts` 更新

`vdev sync` コマンドを追加：
- `--force` オプションを受け付ける
- 差分検出時（forceなし）は stderr に確定メッセージを出力し exit 1
- 成功時は stdout に結果を出力し exit 0

### Step 4: `src/commands/new.ts` 更新

`newPlan` 関数の戻り値と処理を拡張：

```typescript
export interface NewResult {
  success: boolean;
  topic: string;
  path: string;
  message: string;
  syncResult?: SyncResult;  // 追加
}

export function newPlan(name: string, force?: boolean): NewResult
```

動作変更：
1. topic 作成・meta 初期化は最初に必ず実施（従来通り）
2. topic 作成後に `syncClaudeMd(process.cwd(), force)` を実行
3. topic 作成は成功、同期結果を `syncResult` に格納
4. 同期が差分で止まる場合でも topic 作成済み
5. `--force` は同期のみに作用
6. グローバル正本が存在しない場合も topic 作成は完了し、同期のみ失敗

### Step 5: `src/cli.ts` 更新（new コマンド）

`vdev new` コマンドに `--force` オプションを追加：
- topic 作成は常に実行
- 同期が差分で失敗（forceなし）→ stderr にメッセージ、exit 1
- グローバル正本が存在しない場合 → topic は作成済み、stderr にメッセージ、exit 1
- 同期成功（forceあり含む）→ exit 0

### Step 6: `docs/vdev-spec.md` 追記

セクション 9 に以下を追加：

```markdown
### 9.11 vdev sync

repo の CLAUDE.md をグローバル正本に同期する。

vdev sync [--force]

動作：
1. ~/.vdev/CLAUDE.md（グローバル正本）を読み取る
2. 自動生成ヘッダ付きで repo 用 CLAUDE.md を生成
3. 差分判定を行う（Last synced 行は比較対象から除外）

デフォルト挙動（--force なし）：
- 差分があれば stderr にエラーメッセージを出力し exit 1
- 上書きは行わない

--force 指定時：
- 差分があっても常に上書き
- exit 0

Exit Codes：
- 0: 成功
- 1: 差分検出（forceなし）またはエラー
```

また、9.1 vdev new の説明に同期処理の記述を追加：

```markdown
動作（追加）：
5. グローバル正本（~/.vdev/CLAUDE.md）から repo の CLAUDE.md を同期
   - --force なし: 差分があれば同期のみ失敗（topic は作成済み）、exit 1
   - --force あり: 差分があっても上書き、exit 0
   - グローバル正本が存在しない場合: topic は作成済み、同期失敗、exit 1
```

### Step 7: `docs/ops.md` 追記

セクション 5 を拡張：

```markdown
### 同期コマンド

# 差分確認（同期しない）
vdev sync

# 強制同期
vdev sync --force

### vdev new 実行時の同期

- vdev new は内部で sync 相当を実行する
- 差分がある場合（--force なし）:
  - topic は作成される
  - 同期のみ失敗し exit=1
  - stderr に `vdev sync --force` の案内を出力
- --force は同期のみに作用（topic 作成の意味は変えない）
- グローバル正本（~/.vdev/CLAUDE.md）が存在しない場合:
  - topic は作成される
  - 同期は失敗し exit=1
```

### Step 8: `test/sync.test.ts` 新規作成

以下のテストケースを実装：

1. repo に CLAUDE.md なし → `syncClaudeMd` → 生成される（written=true）
2. repo に差分あり → `syncClaudeMd(force=false)` → hasDiff=true, written=false
3. repo に差分あり → `syncClaudeMd(force=true)` → hasDiff=true, written=true
4. グローバル正本なし → `syncClaudeMd` → globalMissing=true, success=false
5. `newPlan` で topic 作成が行われること（同期失敗でも topic が作られている）
6. `newPlan(name, true)` で差分があっても上書きされる
7. **Last synced のみ異なる場合は差分なし扱い**
   - repo に生成済み CLAUDE.md があり、本文は同一で Last synced のみ異なる場合
   - `syncClaudeMd(force=false)` が `hasDiff=false`, `written=false` になること
   - exit 0 相当（success=true）

---

## 4. 自動生成ヘッダ仕様

repo の `CLAUDE.md` 先頭に付与するヘッダ：

```
<!-- AUTO-GENERATED FILE - DO NOT EDIT -->
<!-- Source: ~/.vdev/CLAUDE.md -->
<!-- Last synced: 2026-01-20T10:00:00+09:00 -->

```

- HTMLコメント形式（Markdownレンダリングに影響しない）
- 4行目は空行
- その後にグローバル正本の本文を結合
- **Last synced 行は差分判定の比較対象から除外する**（監査用途のみ）
- 書き込み時は Last synced を常に現在時刻（nowIso）で更新する

---

## 5. 差分判定仕様（確定）

差分判定は以下のルールで行う：

1. **Last synced 行を除外して比較する**
   - `<!-- Last synced: ... -->` 行は値を無視して比較
   - 具体的には、両方の文字列から Last synced 行を除去または正規化してから比較

2. **current が null の場合は差分あり**
   - repo に CLAUDE.md が存在しない場合は新規生成が必要

3. **末尾改行の扱い**
   - globalBody の末尾改行をそのまま保持する
   - renderRepoClaudeMd は追加の末尾改行を付与しない
   - これにより改行揺れによる差分発生を防ぐ

---

## 6. エラーメッセージ仕様

差分検出時（forceなし）の stderr 出力（確定仕様）：

```
ERROR: CLAUDE.md differs from global rules (source=~/.vdev/CLAUDE.md)
Hint: run 'vdev sync --force' to overwrite repo CLAUDE.md
```

グローバル正本が存在しない場合：

```
ERROR: Global CLAUDE.md not found (~/.vdev/CLAUDE.md)
```

---

## 7. 変更ファイル一覧

| ファイル | 操作 |
|----------|------|
| src/core/claudeMdSync.ts | 新規作成 |
| src/commands/sync.ts | 新規作成 |
| src/commands/new.ts | 更新 |
| src/cli.ts | 更新 |
| docs/vdev-spec.md | 追記 |
| docs/ops.md | 追記 |
| test/sync.test.ts | 新規作成 |

---

## 8. DoD（Definition of Done）

- [ ] `~/.vdev/CLAUDE.md` を正本として repo の `CLAUDE.md` を生成できる（自動生成ヘッダ付与）
- [ ] `vdev sync` は差分時に停止し、確定メッセージを stderr に出す（exit=1）
- [ ] `vdev sync --force` は常に上書き（exit=0）
- [ ] `vdev new` は topic を必ず作り、内部で同期を試みる
- [ ] `vdev new` は差分があると同期のみ失敗し exit=1（topic は作成済み）
- [ ] `vdev new --force` は同期のみ force 扱いで上書きし exit=0
- [ ] グローバル正本が存在しない場合、topic 作成は完了し同期のみ失敗（exit=1）
- [ ] Last synced のみ異なる場合は差分なし扱い（テストで担保）
- [ ] docs を削らず追記で更新
- [ ] テストが追加され `npm test` が通る

---

## 9. Verify

```bash
# ビルド
npm run build

# テスト
npm test

# 手動検証: 差分検出（forceなし）
./dist/cli.js sync
echo $?  # 期待: 1（差分あり時）

# 手動検証: 強制同期
./dist/cli.js sync --force
echo $?  # 期待: 0
cat CLAUDE.md | head -5  # ヘッダ確認

# 手動検証: new（差分がある場合）
./dist/cli.js new test-sync-check
echo $?  # 期待: 1（同期失敗）
ls docs/plans/ | grep test-sync-check  # 期待: topic は存在

# 手動検証: new --force
./dist/cli.js new test-sync-force --force
echo $?  # 期待: 0
```

---

## 10. 注意事項

- `~/.vdev/CLAUDE.md` の symlink 作成自体は本実装のスコープ外（手動作成前提）
- **差分判定は Last synced 行を除外して比較する**（監査用途のタイムスタンプが恒常的な差分を生まないようにするため）
- **書き込み時は Last synced を常に現在時刻で更新する**
- **repo_root は vdev 実行時のカレントディレクトリ（`process.cwd()`）とする**（git root 探索は行わない）
- **末尾改行方針**: globalBody の末尾改行を保持し、追加しない（改行揺れによる差分発生を防ぐ）
- `--force` は同期にのみ作用し、topic 作成の意味論は一切変えない
