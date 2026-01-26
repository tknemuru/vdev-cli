# Implementation Report: vdev sync を claude.manifest.yaml 駆動に統一する

## 変更ファイル一覧

| ファイル | 変更内容 |
|---------|---------|
| `cli/package.json` | `js-yaml@4.1.1` と `@types/js-yaml@4.0.9` を依存関係に追加 |
| `cli/src/core/manifest.ts` | 新規作成: manifest パーサー（getManifestPath, readClaudeManifest, getKnowledgesAllowlist） |
| `cli/src/core/claudeMdSync.ts` | `KNOWLEDGES_ALLOWLIST` 削除、manifest から動的に allowlist 取得、KnowledgesSyncResult に manifestParseError フィールド追加 |
| `cli/src/cli.ts` | knowledges エラー表示を更新（manifestParseError 対応） |
| `cli/test/sync.test.ts` | manifest 駆動のテストに更新、manifest backup/restore 追加、新規テストケース追加 |
| `cli/ops.md` | allowlist 定義方式を「ハードコード」から「manifest 定義」に更新 |

## Verify 実行結果

### 1. ビルド

```bash
$ npm run build
> vdev-cli@2.0.0 build
> tsc
```
**結果**: 成功（exit code 0）

### 2. テスト実行

```bash
$ npm test
 ✓ test/sync.test.ts  (41 tests) 436ms
 ✓ test/gate.test.ts  (28 tests) 1593ms
 ✓ test/commands.test.ts  (23 tests) 1932ms
 ✓ test/slug.test.ts  (9 tests) 2ms
 ✓ test/hashes.test.ts  (3 tests) 1ms
 ✓ test/normalize.test.ts  (3 tests)

 Test Files  6 passed (6)
      Tests  107 passed (107)
```
**結果**: 全テストパス

### 3. 正常系: manifest で sync を実行

```bash
$ vdev sync
REPO=vdev	SYNCED	CLAUDE.md is up to date
REPO=vdev	SYNCED	vdev-flow.md is up to date
REPO=vdev	SYNCED	.claude/knowledges is up to date
Warning: .claude differs from source (system/adapters/claude)
```
**結果**: manifest に未定義のファイル（vdev-runtime-rules.md, claude-output-format.md）について Warning が出ない

### 4. 異常系: source ファイル欠如

```bash
$ mv system/docs/flow/vdev-flow.md system/docs/flow/vdev-flow.md.bak
$ vdev sync
Warning: Missing files in system/: docs/flow/vdev-flow.md
$ mv system/docs/flow/vdev-flow.md.bak system/docs/flow/vdev-flow.md
```
**結果**: 適切な Warning が出力される

### 5. 異常系: YAML パースエラー

```bash
$ echo "invalid: yaml: content" > system/registry/claude.manifest.yaml
$ vdev sync
Error: Failed to parse manifest: bad indentation of a mapping entry (1:14)
```
**結果**: Error が出力される（空 allowlist として黙って処理されない）

### 6. knowledges ディレクトリ内容確認

```bash
$ ls -la .claude/knowledges/
-rw-r--r-- 1 tk tk  21454 Jan 27 00:43 vdev-flow.md
```
**結果**: manifest の allowlist（vdev-flow.md のみ）に従って同期されている

## DoD 充足確認

- [x] `vdev sync` 実行時、manifest に定義されたファイルがすべて同期される
- [x] manifest に未定義のファイルが存在しなくても Warning が出ない
- [x] manifest に定義された source を削除すると、明確な Warning/Error が出る
- [x] manifest パースエラー時に Error が出る（空 allowlist として黙って処理しない）
- [x] 全テストがパスする（`npm test`）
- [x] `vdev new` で生成された環境に対して `vdev sync` を実行し、差分が発生しない

## 残課題・不確実点

なし
