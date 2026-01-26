# vdev sync を claude.manifest.yaml 駆動に統一する

## 1. 目的
- `vdev sync` の同期対象と警告条件を **claude.manifest.yaml を唯一の SoT** として定義・実装する。
- 現状発生している「manifest に定義されていないファイル欠如による Warning」を解消する。
- `vdev new` / `vdev sync` 間で配布・同期の仕様を一致させ、将来的なズレと事故を防ぐ。

## 2. 問題定義
- 現在の `vdev sync` は、manifest とは無関係な固定パス（例: `system/docs/...`）を暗黙に必須としてチェックしている。
- その結果、**manifest 上は正しい状態でも Warning が出る**という仕様不整合が発生している。

## 3. 非目標（やらないこと）
- manifest に未定義のファイルを「暗黙に必須」として追加しない。
- 警告を握り潰すためだけのダミーファイル追加は行わない。

## 4. 採用方針（アーキテクチャ判断）
### 方針
- `vdev sync` は **claude.manifest.yaml に記載されたエントリのみ** を同期・検証対象とする。
- 警告・エラーは **manifest を満たせない場合に限定** する。

### 採用理由
- SoT が一意になり、`vdev new` / `vdev sync` の挙動が一致する。
- 配布物の追加・削除が manifest の差分として管理できる。
- 後工程（CLI 自律実行）での判断ブレを防げる。

### 却下案
- 固定パス期待リストを残したまま manifest を補助的に使う案  
  → SoT が二重化し、再びズレが発生するため却下。

## 5. 仕様詳細（実装契約）

### 5.1 同期対象の決定
- `claude.manifest.yaml` を読み込み、以下を同期対象とする。
  - `main` / `flow` などの file エントリ（source → dest の単一コピー）
  - directory エントリ（再帰コピー、exclude 適用）
  - `knowledges.allowlist` に列挙されたファイルのみ

### 5.2 Warning / Error の条件
- Warning または Error を出すのは次の場合のみ：
  - manifest に定義された `source` が存在しない
  - コピー処理に失敗した
- manifest に **定義されていないパスの欠如では警告を出さない**。

### 5.3 --force の意味
- `--force` は「manifest で定義された対象を上書き同期する」ことを意味する。
- manifest 外のファイルを削除・変更する権限は持たせない。

## 6. Definition of Done（完了条件）
- `vdev sync` 実行時、manifest に定義されたファイルがすべて同期される。
- manifest に未定義のファイルが存在しなくても Warning が出ない。
- manifest に定義された source を削除すると、明確な Warning または Error が出る。

## 7. Verify（検証方法）
1. 正常系  
   - 現行の `claude.manifest.yaml` を用いて `vdev sync` を実行し、Warning が出ないこと。
2. 異常系  
   - manifest に記載された source ファイルを一時的に削除し、適切な Warning/Error が出ること。
3. 回帰  
   - `vdev new` で生成された環境に対して `vdev sync` を実行し、差分が発生しないこと。

## 8. Rollback
- 修正前の `vdev sync` 実装に戻すことで即時ロールバック可能。
- manifest ファイル自体は変更しないため、影響範囲は CLI 実装に限定される。

## 9. Risk
- R1: manifest 解釈ミスによる同期漏れ  
  → Verify に allowlist / exclude のケースを含める。
- R2: 既存ユーザーの期待との差異  
  → Warning 仕様変更をリリースノートで明示。
- R3: 将来の manifest 拡張時の互換性  
  → 未知フィールドは無視する実装ルールを明記。

