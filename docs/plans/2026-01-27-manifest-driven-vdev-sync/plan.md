# Plan: vdev sync を claude.manifest.yaml 駆動に統一する

## 1. Overview

### 1.1 目的
- `vdev sync` の同期対象と警告条件を **claude.manifest.yaml を唯一の SoT** として定義・実装する
- ハードコードされた `KNOWLEDGES_ALLOWLIST` 等を削除し、manifest から動的に読み込む
- `vdev new` / `vdev sync` 間で配布・同期の仕様を一致させる

### 1.2 現状分析

**現在の問題**:
- `claudeMdSync.ts` の `KNOWLEDGES_ALLOWLIST` がハードコードされている
  - manifest に存在しない `vdev-runtime-rules.md`, `claude-output-format.md` を含む
- `claude.manifest.yaml` を実際に読み込む仕組みがない
- 各同期関数が個別のハードコードされたパスを使用している

**現在のコード構造**:
```
cli/src/
├── commands/
│   ├── sync.ts      # syncCommand() - 個別関数を呼び出し
│   └── new.ts       # newPlan() - 同様に個別関数を呼び出し
└── core/
    └── claudeMdSync.ts  # syncClaudeMd(), syncVdevFlow(), syncClaudeDir(), syncKnowledges()
```

## 2. 実装方針

### 2.1 YAML パーサー依存関係の追加

`js-yaml` パッケージを依存関係として追加する。

**選定理由**:
- npm weekly downloads 5000万以上の実績
- TypeScript 型定義（@types/js-yaml）が利用可能
- 軽量でシンプルな API

### 2.2 Manifest 読み込みモジュールの新規作成

`cli/src/core/manifest.ts` を新規作成し、以下を実装:
- `claude.manifest.yaml` のパース
- 同期対象エントリの取得
- 型定義
- エラーハンドリング

### 2.3 Manifest 読み込み失敗時の挙動定義

| ケース | 挙動 | 理由 |
|-------|------|------|
| manifest ファイルが存在しない | Warning を出力し、空の allowlist として扱う | 後方互換性維持。manifest 未導入のリポジトリでもエラーにしない |
| YAML パースエラー | Error を出力し、syncKnowledges を失敗として扱う | 設定ミスを検出するため、黙って空にしてはならない |
| `knowledges.allowlist` キーが存在しない | Warning を出力し、空の allowlist として扱う | manifest 内で knowledges を定義しないユースケースを許容 |

### 2.4 同期ロジックの統一

`claudeMdSync.ts` を以下のように改修:
- `KNOWLEDGES_ALLOWLIST` を削除
- manifest から動的に同期対象を取得
- 既存の個別関数（`syncClaudeMd`, `syncVdevFlow`, `syncClaudeDir`, `syncKnowledges`）は manifest 駆動に変更

### 2.5 警告・エラー条件の変更

- manifest に定義された source が存在しない → Warning/Error
- manifest に未定義のパスの欠如 → 警告しない

## 3. 実装手順

### Step 0: 依存関係の追加

**ファイル**: `cli/package.json`

```bash
cd cli && npm install js-yaml && npm install -D @types/js-yaml
```

**変更内容**:
```json
{
  "dependencies": {
    "commander": "^12.0.0",
    "js-yaml": "^4.1.0"
  },
  "devDependencies": {
    "@types/js-yaml": "^4.0.9",
    "@types/node": "^20.10.0",
    "typescript": "^5.3.0",
    "vitest": "^1.0.0"
  }
}
```

### Step 1: Manifest パーサーの作成

**ファイル**: `cli/src/core/manifest.ts`

```typescript
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import * as yaml from 'js-yaml';
import { getSystemBasePath } from './claudeMdSync';

interface ManifestEntry {
  source: string;
  dest: string;
  description?: string;
  exclude?: string[];
}

interface KnowledgesAllowlistItem {
  source: string;
  target: string;
}

interface KnowledgesEntry {
  dest: string;
  allowlist: KnowledgesAllowlistItem[];
  description?: string;
}

interface ClaudeManifest {
  version: string;
  main?: ManifestEntry;
  flow?: ManifestEntry;
  claude_dir?: ManifestEntry;
  knowledges?: KnowledgesEntry;
}

interface ManifestReadResult {
  manifest: ClaudeManifest | null;
  error: 'FILE_NOT_FOUND' | 'PARSE_ERROR' | null;
  errorMessage?: string;
}

export function getManifestPath(): string {
  return join(getSystemBasePath(), 'registry', 'claude.manifest.yaml');
}

export function readClaudeManifest(): ManifestReadResult {
  const manifestPath = getManifestPath();
  
  // ケース 1: ファイルが存在しない
  if (!existsSync(manifestPath)) {
    return {
      manifest: null,
      error: 'FILE_NOT_FOUND',
      errorMessage: `Manifest file not found: ${manifestPath}`,
    };
  }

  try {
    const content = readFileSync(manifestPath, 'utf8');
    const manifest = yaml.load(content) as ClaudeManifest;
    return { manifest, error: null };
  } catch (e) {
    // ケース 2: YAML パースエラー
    return {
      manifest: null,
      error: 'PARSE_ERROR',
      errorMessage: `Failed to parse manifest: ${e instanceof Error ? e.message : String(e)}`,
    };
  }
}

export function getKnowledgesAllowlist(): { 
  allowlist: KnowledgesAllowlistItem[]; 
  warning?: string;
  error?: string;
} {
  const result = readClaudeManifest();
  
  // ファイルが存在しない場合は Warning + 空 allowlist
  if (result.error === 'FILE_NOT_FOUND') {
    return {
      allowlist: [],
      warning: result.errorMessage,
    };
  }
  
  // パースエラーの場合は Error
  if (result.error === 'PARSE_ERROR') {
    return {
      allowlist: [],
      error: result.errorMessage,
    };
  }
  
  // ケース 3: knowledges.allowlist キーが存在しない
  if (!result.manifest?.knowledges?.allowlist) {
    return {
      allowlist: [],
      warning: 'knowledges.allowlist not defined in manifest',
    };
  }
  
  return { allowlist: result.manifest.knowledges.allowlist };
}
```

### Step 2: syncKnowledges の改修

**ファイル**: `cli/src/core/claudeMdSync.ts`

- `KNOWLEDGES_ALLOWLIST` 定数を削除
- `getKnowledgesAllowlist()` を使用して manifest から動的に取得
- manifest パースエラー時は `success: false` を返す

### Step 3: 他の sync 関数の改修（オプション）

今回のスコープ外として、以下は従来通りハードコードを維持:
- `syncClaudeMd()` - manifest の `main` に対応
- `syncVdevFlow()` - manifest の `flow` に対応
- `syncClaudeDir()` - manifest の `claude_dir` に対応

**理由**: 
- instruction.md で指示された問題は「manifest に定義されていないファイル欠如による Warning」
- 現在の Warning 原因は `KNOWLEDGES_ALLOWLIST` のハードコード
- 他の関数は manifest と整合している

### Step 4: テストの更新

**ファイル**: `cli/test/sync.test.ts`

- manifest パーサーのユニットテスト追加
  - ファイルが存在しない場合のテスト
  - パースエラー時のテスト
  - knowledges.allowlist が存在しない場合のテスト
- `syncKnowledges` のテストを manifest 駆動に更新
- manifest が存在しない場合のフォールバック動作テスト

### Step 5: ドキュメント更新

**ファイル**: `cli/ops.md`

- 「allowlist（ハードコード）」の記述を「allowlist（manifest 定義）」に変更
- manifest ファイルの参照先を明示

## 4. 変更ファイル一覧

| ファイル | 変更内容 |
|---------|---------|
| `cli/package.json` | `js-yaml` と `@types/js-yaml` を依存関係に追加 |
| `cli/src/core/manifest.ts` | 新規作成: manifest パーサー |
| `cli/src/core/claudeMdSync.ts` | `KNOWLEDGES_ALLOWLIST` 削除、manifest 参照に変更 |
| `cli/test/sync.test.ts` | manifest 駆動のテストに更新 |
| `cli/ops.md` | ドキュメント更新 |

## 5. Definition of Done

- [ ] `vdev sync` 実行時、manifest に定義されたファイルがすべて同期される
- [ ] manifest に未定義のファイルが存在しなくても Warning が出ない
- [ ] manifest に定義された source を削除すると、明確な Warning/Error が出る
- [ ] manifest パースエラー時に Error が出る（空 allowlist として黙って処理しない）
- [ ] 全テストがパスする（`npm test`）
- [ ] `vdev new` で生成された環境に対して `vdev sync` を実行し、差分が発生しない

## 6. Verify

```bash
# 0. 依存関係のインストール
cd cli && npm install

# 1. ビルド
npm run build

# 2. テスト実行
npm test

# 3. 正常系: 現行の manifest で sync を実行し Warning が出ないこと
vdev sync

# 4. 異常系: manifest に記載された source ファイルを一時的に削除し、
#    適切な Warning/Error が出ること
mv system/docs/flow/vdev-flow.md system/docs/flow/vdev-flow.md.bak
vdev sync  # Warning が出ることを確認
mv system/docs/flow/vdev-flow.md.bak system/docs/flow/vdev-flow.md

# 5. 異常系: manifest ファイルを壊して YAML パースエラーを発生させる
cp system/registry/claude.manifest.yaml system/registry/claude.manifest.yaml.bak
echo "invalid: yaml: content" > system/registry/claude.manifest.yaml
vdev sync  # Error が出ることを確認（空 allowlist として黙って処理されないこと）
mv system/registry/claude.manifest.yaml.bak system/registry/claude.manifest.yaml

# 6. 回帰: vdev new で生成された環境に対して vdev sync を実行し、差分が発生しないこと
vdev new test-regression-check --force
vdev sync
# .claude/knowledges/ の内容が manifest の allowlist と一致することを確認
ls -la .claude/knowledges/
```

## 7. Risk Assessment

- **R1（低）**: manifest 解釈ミスによる同期漏れ
  - 対策: Verify に allowlist / exclude のケースを含める
- **R2（中）**: 既存ユーザーの期待との差異
  - 対策: Warning 仕様変更をリリースノートで明示（今回は vdev 自体のリポジトリなので影響限定的）

## 8. 必須ドキュメント更新要否

| ドキュメント | 更新要否 | 理由 |
|-------------|---------|------|
| docs/spec.md | 不要 | CLI 仕様は vdev-spec.md として system/docs/spec/ に存在。今回の変更は内部実装の変更であり、外部仕様に影響しない |
| docs/ops.md | 不要 | ops.md は cli/ops.md として存在。更新必要（上記 Step 5） |
| docs/arch.md | 不要 | 存在しない。今回の変更はアーキテクチャ判断を伴わない |

## 9. Rollback

- 修正前の `claudeMdSync.ts` に戻すことで即時ロールバック可能
- manifest ファイル自体は変更しないため、影響範囲は CLI 実装に限定
- `js-yaml` 依存関係を削除し、`KNOWLEDGES_ALLOWLIST` を復元することで完全ロールバック
