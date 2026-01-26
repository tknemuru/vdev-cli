vdev-spec.md v3.0.0 改訂（ドキュメント先行・reconcileモデル / R3）

--------------------------------
RISK LEVEL
--------------------------------
本トピックは vdev フローおよび CLI 実装の根幹に影響する
**高リスク変更（R3）**として扱う。

- vdev の状態判定モデル（SoT）を反転させる破壊的変更を含む
- 既存の vdev-cli 実装は、本 specification と不整合な状態になる
- 本トピック完了後、vdev-cli 側の追従改修が必須となる

従って、本トピックの最終確定（DESIGN_APPROVED 相当）および
後続トピックへの展開可否については **Human の明示的承認を必須**とする。

--------------------------------
目的
--------------------------------
本トピックの目的は、vdev フローの Single Source of Truth（SoT）を
meta.json 中心から 正本 md ファイル中心 へ移行し、
それを vdev-spec.md v3.0.0 として明文化することである。

本 instruction では vdev-cli の実装改修は行わない。
まず SoT（vdev-spec）を確定させ、その後に CLI を追従改修する前提とする。

--------------------------------
バージョン変更
--------------------------------
- vdev-spec.md の version を 2.0.0 から 3.0.0 に更新すること
- 本改訂は破壊的変更を含むため major version を上げる

--------------------------------
改訂方針（要約）
--------------------------------
1. 正本（Canonical）は常に md ファイル群とする
2. meta.json は派生キャッシュであり、唯一の正ではない
3. vdev gate は 状態判定 + meta 同期（reconcile）を責務とする
4. DONE / REJECTED は終端固定ではなく、常に正本状態から再導出される
5. hash 不一致はエラー条件としない
6. Status 行が規約外で状態導出不能な場合は COMMAND_ERROR（exit 1）とする
7. BROKEN_STATE は 致命的破損 に限定して縮退する

--------------------------------
具体的な修正内容（章ごと・コピペ可能）
--------------------------------

【1. version 表記の更新】
vdev-spec.md 冒頭の version を以下に変更する。
- version: 3.0.0

--------------------------------
【2. Source of Truth の再定義（2.2 完全置換）】

2.2 Source of Truth（v3.0 改訂）

vdev におけるフロー状態の正（Canonical）は、以下の正本ファイル群から導出される。

- instruction.md
- plan.md
- design-review.md
- impl.md
- impl-review.md

meta.json は、これら正本ファイル群から導出された状態・メタデータを
キャッシュとして保持する派生物であり、唯一の正ではない。

vdev gate は、正本ファイル群を読み取り、
現在の状態を導出し、必要に応じて meta.json を同期更新する。

--------------------------------
【3. meta.json の位置づけ変更（新設）】

meta.json の位置づけ（v3.0 新設）

meta.json は以下の目的のための派生キャッシュである。

- vdev gate 実行結果の保存
- 状態表示の高速化
- 監査・履歴補助（timestamps / hashes）

meta.json の内容が正本ファイル群と不整合であっても、
それ自体はエラーとはならない。

vdev gate は、正本ファイル群から導出した結果をもって
meta.json を上書き同期してよい。

--------------------------------
【4. hashes フィールドの扱い変更】

hashes フィールドの扱い（v3.0 改訂）

hashes.*Sha256 は、正本ファイルの内容を記録するための
監査・差分検知用メタデータである。

hash 不一致はエラー条件ではない。

vdev gate 実行時、存在する正本ファイルについては
SHA256 を再計算し、meta.json の hashes を同期更新してよい。

DONE / REJECTED 状態であっても例外は設けない。

--------------------------------
【5. BROKEN_STATE の再定義】

BROKEN_STATE（v3.0 改訂）

BROKEN_STATE は、状態導出や同期が不可能な致命的破損を表す。

以下の場合にのみ BROKEN_STATE とする。

- meta.json がパース不能であり、再生成もできない
- トピックディレクトリ構造が破損している等、復旧不能な状態

正本ファイルと meta.json の不整合、
または hash 不一致のみを理由に BROKEN_STATE としてはならない。

--------------------------------
【6. Status 行不正時の扱い（COMMAND_ERROR）】

Status 行の解釈とエラー（v3.0 新設）

design-review.md および impl-review.md に記載された Status 行は、
vdev が状態を導出するための入力である。

Status 行が規定の値・形式に一致せず、
状態を導出できない場合は以下とする。

- vdev gate は COMMAND_ERROR（exit code: 1）を返す
- この場合、状態遷移および meta.json 更新は行わない

--------------------------------
【7. Gate 判定ロジックの書き換え】

Gate Decision Logic（v3.0 改訂）

vdev gate は、以下の手順で判定を行う。

1. meta.json がパース不能な場合は BROKEN_STATE（exit 20）
2. 正本ファイルの存在を確認し、欠落に応じて NEEDS_* を導出
3. review ファイルが存在する場合、Status 行を解釈して状態を導出
4. Status 行が規約外の場合は COMMAND_ERROR（exit 1）
5. 導出した状態を結果として返し、可能な場合 meta.json を同期更新する

--------------------------------
【8. NEEDS_CHANGES の戻り先明文化】

NEEDS_CHANGES の扱い（v3.0 明文化）

- design-review.md に Status: NEEDS_CHANGES がある場合
  - 状態は NEEDS_PLAN に戻る

- impl-review.md に Status: NEEDS_CHANGES がある場合
  - 状態は IMPLEMENTING に戻る

--------------------------------
非目標
--------------------------------
- 本トピックでは vdev-cli の実装改修は行わない
- 本トピックでは ops.md / cheatsheet の改訂は行わない
- これらは vdev-spec v3.0.0 確定後の R3 後続トピックとして扱う

--------------------------------
完了条件（DoD）
--------------------------------
- vdev-spec.md に version 3.0.0 が明示されている
- 本 instruction に記載した全改訂内容が vdev-spec.md に反映されている
- meta.json が唯一の正であると読める記述が存在しない
- DONE / REJECTED が終端固定であると誤解される記述が存在しない
- Status 行不正時の扱いが COMMAND_ERROR として明文化されている
- 本トピックが R3 である旨が明示されている

