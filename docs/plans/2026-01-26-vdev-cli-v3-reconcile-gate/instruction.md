vdev-cli 改修（vdev-spec v3.0.0 準拠：正本=md / gate=reconcile / CLI非必須）

--------------------------------
RISK LEVEL
--------------------------------
本トピックは vdev の状態判定とゲート挙動を変更する根幹改修であり、
高リスク変更（R3）として扱う。

- gate の判定モデルを meta.json 中心から md 中心へ反転する
- DONE / REJECTED を終端固定にしない（再導出・巻き戻し可能）
- 既存運用・既存テスト・既存 topic の解釈に影響する

従って、本トピックの最終承認およびマージは Human の明示承認を必須とする。

--------------------------------
重要制約（絶対遵守）
--------------------------------
- .claude 配下のファイルはコピー（同期生成物）であり、絶対に修正してはならない
- 修正対象は vdev-cli の実装コードおよびそのテストのみ
- vdev-spec v3.0.0 / ops / cheatsheet はすでに確定済みの前提で、仕様を実装に反映する
- 新規サブコマンド追加、外部公開、DB 拡張、要件外の機能追加は禁止
- 既存の exit code（0/10/11/12/13/14/15/16/17/20/1）は維持する

--------------------------------
目的
--------------------------------
vdev-spec v3.0.0 の SoT に合わせて vdev-cli を改修する。
特に vdev gate を「状態導出 + meta 同期（reconcile）」として実装し直す。

--------------------------------
スコープ（今回やること）
--------------------------------
- vdev gate の判定ロジックを v3.0.0 に置き換える
- meta.json は派生キャッシュとして、gate が同期更新してよい実装に変更
- hash 不一致はエラー条件にしない（DONE / REJECTED も例外なし）
- review ファイルの Status 行が規約外で導出不能な場合、COMMAND_ERROR（exit 1）で終了し、
  状態遷移・meta 更新を行わない
- BROKEN_STATE（exit 20）は「meta.json がパース不能」等の致命的破損に限定する
- テストを更新・追加して、v3.0.0 の期待挙動を固定する

--------------------------------
非目標（今回やらないこと）
--------------------------------
- vdev-spec / ops / cheatsheet の再改訂（すでに別トピックで実施済み）
- vdev start / review / impl / impl-review 等の仕様変更（必要なら別トピック）
- topic ディレクトリ構造やファイル名の変更
- meta.json schemaVersion を変更する提案（必要なら別トピック）

--------------------------------
仕様（v3.0.0 gate の期待挙動）
--------------------------------

1) 正本（Canonical）は md ファイル群
- instruction.md / plan.md / design-review.md / impl.md / impl-review.md

2) meta.json は派生キャッシュ
- gate は正本から状態を導出し、可能なら meta.json を同期更新してよい

3) Status 行の扱い（導出不能は exit 1）
- design-review.md の Status が規約外で解釈できない -> COMMAND_ERROR（1）
- impl-review.md の Status が規約外で解釈できない -> COMMAND_ERROR（1）
- この場合、meta.json の更新は行わない（副作用なし）

4) BROKEN_STATE（exit 20）
- meta.json が存在し、かつパース不能の場合は BROKEN_STATE（20）
- それ以外（hash不一致や md と meta の不整合など）は BROKEN_STATE にしない

5) hash の扱い
- hash 不一致でエラーにしない
- gate 実行時、存在する md の SHA256 を再計算し meta.json.hashes に同期してよい
- DONE / REJECTED でも例外なく同期してよい（終端固定をしないため）

6) 状態導出（推奨アルゴリズム：md 優先 + meta は補助）
- 最優先で instruction.md / plan.md / design-review.md の存在と Status により、
  NEEDS_INSTRUCTION / NEEDS_PLAN / NEEDS_DESIGN_REVIEW / REJECTED / NEEDS_PLAN（NEEDS_CHANGES）/ DESIGN_APPROVED を導出する
- DESIGN_APPROVED 以降の「IMPLEMENTING かどうか」は、正本 md だけでは判別不能なケースがあるため、
  互換性維持のために meta.json.status を補助情報として使用してよい
  ただし、impl-review.md が存在する場合は、その Status を最優先にして IMPLEMENTING / DONE を導出する

状態導出の詳細（推奨ルール）
A. meta.json がパース不能 -> BROKEN_STATE（20）

B. instruction.md がない -> NEEDS_INSTRUCTION（10）
C. plan.md がない -> NEEDS_PLAN（11）
D. design-review.md がない -> NEEDS_DESIGN_REVIEW（12）

E. design-review.md Status の解釈（規約外なら exit 1）
- Status: NEEDS_CHANGES -> NEEDS_PLAN（11 相当の状態として扱う。表示名は NEEDS_PLAN）
- Status: REJECTED -> REJECTED（17）
- Status: DESIGN_APPROVED -> 以下へ進む

F. DESIGN_APPROVED 以降（実装フェーズ）
- impl-review.md がある場合（規約外なら exit 1）
  - Status: DONE -> DONE（0）
  - Status: NEEDS_CHANGES -> IMPLEMENTING（14）
- impl-review.md がなく impl.md がある -> NEEDS_IMPL_REVIEW（16）
- impl.md がない場合
  - meta.status が IMPLEMENTING（または NEEDS_IMPL_REPORT/NEEDS_IMPL_REVIEW/DONE 等の実装フェーズ）なら
    - NEEDS_IMPL_REPORT（15）または IMPLEMENTING（14）を互換的に導出（既存挙動に寄せる）
  - それ以外は DESIGN_APPROVED（13）のまま（実装未開始）

注意：上記は v3 の「正本=md」を守りつつ、既存トピックの挙動を壊しにくい最低限の互換設計である。
この補助ロジックは将来、実装開始マーカー等の正本化を導入した後に整理してよい（本トピックの非目標）。

7) gate の副作用（reconcile）
- 上記の導出に成功した場合のみ、meta.json を同期更新してよい
- 同期更新の最低要件
  - meta.status を導出状態に合わせる
  - timestamps.updatedAt を更新する
  - 存在する md の hashes を再計算して反映する
- COMMAND_ERROR（exit 1）や BROKEN_STATE（exit 20）の場合は、meta.json を更新しない

--------------------------------
実装タスク
--------------------------------

Task 1: 現行 vdev gate 実装の把握
- 現行の Gate Decision Table 実装箇所を特定する
- BROKEN_STATE 判定（hash不一致含む）がどこで行われているか特定する
- meta.json の読み書き、hash計算、status決定、exit code 決定の責務分離を把握する

Task 2: v3.0.0 gate ロジックへ置換
- 状態導出を md 優先で実装する
- meta.json はパースできた場合のみ補助情報として参照し、導出成功時に同期更新する
- hash不一致をエラー条件から除外する（DONE/REJECTEDも含む）

Task 3: Status 行パーサの厳格化（exit 1）
- design-review.md / impl-review.md の Status 行抽出を明確化
- 許可値以外は COMMAND_ERROR（exit 1）
- exit 1 の場合は meta.json を更新しないことを保証する

Task 4: テスト更新・追加（必須）
- 既存テストが v2 前提で落ちる場合は v3 へ更新する
- 新規で以下のテストケースを最低限追加する
  - hash不一致でも BROKEN_STATE にならず、gate が導出状態を返す
  - DONE 後に impl-review.md を NEEDS_CHANGES に変更したら IMPLEMENTING を返す（巻き戻り）
  - Status 行が規約外なら exit 1、かつ meta.json が更新されない
  - meta.json がパース不能なら exit 20（BROKEN_STATE）
  - instruction/plan/design-review 欠落の exit code が従来どおり

Task 5: 変更の自己点検
- 変更ファイル一覧
- 追加・更新したテスト一覧と実行結果
- 互換性リスク（既存トピックへの影響）と、その緩和（今回入れる meta 補助ロジック）

--------------------------------
Verify（必須）
--------------------------------
- vdev のテストスイートを全実行し、成功させる
- 追加したテストケースがすべて PASS であること
- ローカルで簡易シナリオ検証を行う（サンプル topic を作り、md を編集して gate が期待状態になること）

--------------------------------
Rollback（必須）
--------------------------------
- gate 実装の変更は差分が大きいため、ロールバックは「本トピックの変更コミットを revert」で行う
- revert 後、テストが v2 状態で PASS することを確認する

--------------------------------
完了条件（DoD）
--------------------------------
- vdev gate が v3.0.0 仕様どおりに動作する
- hash不一致で BROKEN_STATE が出ない（DONE/REJECTED も含む）
- Status 行規約外は COMMAND_ERROR（exit 1）で停止し、meta.json を更新しない
- meta.json パース不能は BROKEN_STATE（exit 20）
- テストが更新され、v3 の挙動が固定されている
- .claude 配下に差分がない

