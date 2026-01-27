vdev-cli 改修：Attemptモデル導入（design-review / impl-review 共通）＋ gate 判定更新

--------------------------------
RISK LEVEL
--------------------------------
本トピックは vdev の状態判定（gate）とレビュー成果物の解釈モデルを変更する根幹改修であり、
高リスク変更（R3）として扱う。

最終 Approve / Merge は Human の明示承認を必須とする。

--------------------------------
重要制約（絶対遵守）
--------------------------------
- 作業は main ブランチから作成した feature ブランチ上で行うこと
- .claude 配下のファイルはコピー生成物であり、絶対に修正してはならない
- 今回は vdev-cli（実装）とテストのみを変更対象とする
- ドキュメント修正（CLAUDE.md / subagents / ai-resources 配下）は別トピックで行う（本トピックでは変更しない）
- 新規サブコマンド追加、外部公開、DB拡張、要件外の機能追加は禁止
- Exit code の体系（0/10/11/12/13/14/15/16/17/20/1）は維持する
- Status 行が規約外の場合は COMMAND_ERROR（exit 1）。exit 1 の場合は meta.json を更新しない（副作用なし）

--------------------------------
目的
--------------------------------
設計レビュー・実装レビューを Attemptモデルへ統一し、gate 判定の “正” を以下に変更する。

- design review の正: design-review/attempt-XXX.md の最新 attempt
- impl review の正: impl-review/attempt-XXX.md の最新 attempt

これにより、NEEDS_CHANGES のスタックや「削除・無効化・再登録」に依存しない、
シンプルで Claude Code フレンドリーなフローを実現する。

--------------------------------
スコープ（今回やること）
--------------------------------
1) Attemptモデルの導入（gate 判定ロジック）
- design-review.md / impl-review.md の単一ファイル前提を廃し、
  design-review/attempt-*.md、impl-review/attempt-*.md を優先して読む
- 最新 attempt のみが有効（過去 attempt は履歴として残るが gate 判定には使わない）

2) 互換性（旧形式 topic の扱い）
- 旧形式（design-review.md / impl-review.md だけが存在する topic）は暫定互換する
  - attempt ディレクトリが存在しない場合に限り、旧単一ファイルを読み取って判定してよい
  - attempt ディレクトリが存在する場合は、旧単一ファイルは無視する（最新 attempt が正）

3) NEEDS_CHANGES の扱い（スタック解消）
- design review 最新 attempt が NEEDS_CHANGES の場合:
  - gate は NEEDS_DESIGN_REVIEW（exit 12）を返す
  - 以後は plan 修正 → 新しい design-review attempt 追加、の流れで進む
  - 旧モデルのような design-review “無効化” のためのファイル削除や必須コマンドは不要
- impl review 最新 attempt が NEEDS_CHANGES の場合:
  - gate は IMPLEMENTING（exit 14）を返す（実装へ戻す）
  - 実装修正 → 新しい impl-review attempt 追加、の流れで進む

4) meta.json の扱い（派生キャッシュ）
- gate は導出結果に基づき meta.json を同期更新してよい（導出成功時のみ）
- hash 不一致はエラー条件ではない（DONE/REJECTED も含め例外なし）
- meta.json がパース不能の場合は BROKEN_STATE（exit 20）
- COMMAND_ERROR（exit 1）および BROKEN_STATE（exit 20）の場合、meta.json を更新しない

5) テストの追加・更新（必須）
- Attemptモデルの期待挙動を回帰テストで固定する

--------------------------------
非目標（今回やらないこと）
--------------------------------
- ドキュメント修正（CLAUDE.md / implementer.md / reviewer.md / reviewer-principles.md / ai-resources 配下）一切
- topic ディレクトリ構造の大規模変更（review attempt 格納ディレクトリの導入は “読む側” のみ。自動生成・自動移動は行わない）
- meta.json schemaVersion の変更
- vdev plan / review / impl / impl-review コマンドの入出力仕様変更（必要なら別トピック）

--------------------------------
Attemptモデル仕様（gate が解釈するルール）
--------------------------------

ディレクトリとファイル
- 設計レビュー attempt:
  - docs/plans/<topic>/design-review/attempt-XXX.md
- 実装レビュー attempt:
  - docs/plans/<topic>/impl-review/attempt-XXX.md

最新 attempt の選び方（推奨）
- attempt-001.md のようなゼロ埋め番号を推奨
- gate は attempt-*.md を列挙し、番号（またはファイル名ソート）で最大のものを最新として採用する
- 最新 attempt が 1 つも無い場合は「未レビュー」として扱う（NEEDS_DESIGN_REVIEW / NEEDS_IMPL_REVIEW）

Status 行（規約外は exit 1）
- design review latest attempt の Status 許可値:
  - DESIGN_APPROVED / REJECTED / NEEDS_CHANGES
- impl review latest attempt の Status 許可値:
  - DONE / NEEDS_CHANGES

Status が規約外の場合
- COMMAND_ERROR（exit 1）
- meta.json 更新なし

--------------------------------
gate 判定ロジック（期待挙動：設計～実装レビューまで）
--------------------------------

前提
- meta.json が存在する場合は読み取り、パース不能なら BROKEN_STATE（20）
- 以降は正本（md）から状態を導出し、導出成功時に meta を同期してよい

1) 必須ファイル存在チェック
- instruction.md がない -> NEEDS_INSTRUCTION（10）
- plan.md がない -> NEEDS_PLAN（11）
- design review attempt が無い（かつ旧単一 design-review.md も無い） -> NEEDS_DESIGN_REVIEW（12）

2) 設計レビューの導出（Attempt優先）
- design-review/attempt-*.md が存在する場合:
  - 最新 attempt の Status を読む（規約外 -> exit 1）
  - Status: NEEDS_CHANGES -> NEEDS_DESIGN_REVIEW（12）
  - Status: REJECTED -> REJECTED（17）
  - Status: DESIGN_APPROVED -> 次へ
- attempt が無い場合:
  - 旧 design-review.md があればそれを互換的に読む（規約外 -> exit 1）
  - 上と同様に導出する
  - 旧 design-review.md が無いなら NEEDS_DESIGN_REVIEW（12）

3) 実装フェーズ（DESIGN_APPROVED の後）
- IMPLEMENTING かどうかは正本だけでは判別不能な場合があるため、互換維持として meta.status を補助に使ってよい
- ただし impl-review attempt が存在する場合は、それが最優先（巻き戻しを含む）

実装レビューの導出（Attempt優先）
- impl-review/attempt-*.md が存在する場合:
  - 最新 attempt の Status を読む（規約外 -> exit 1）
  - Status: DONE -> DONE（0）
  - Status: NEEDS_CHANGES -> IMPLEMENTING（14）
- impl-review attempt が無い場合:
  - 旧 impl-review.md があれば互換的に読む（規約外 -> exit 1）
    - DONE -> DONE（0）
    - NEEDS_CHANGES -> IMPLEMENTING（14）
  - 旧 impl-review.md も無い場合:
    - impl.md がある -> NEEDS_IMPL_REVIEW（16）
    - impl.md が無い:
      - meta.status が実装フェーズ（IMPLEMENTING / NEEDS_IMPL_REPORT / NEEDS_IMPL_REVIEW / DONE 等）なら:
        - NEEDS_IMPL_REPORT（15）を優先（互換）
      - それ以外は DESIGN_APPROVED（13）

4) reconcile（meta 同期）方針
- 上記導出に成功し exit code が 1/20 ではない場合のみ:
  - meta.status を導出状態に同期
  - timestamps.updatedAt を更新
  - 存在する md の hashes を再計算して同期（hash 不一致はエラーにしない）
- exit 1（COMMAND_ERROR）および exit 20（BROKEN_STATE）は meta を更新しない

--------------------------------
実装タスク
--------------------------------

Task 1: 現状把握
- gate 実装の入口（gate.ts 等）と、design-review / impl-review の読み取り箇所を特定する
- NEEDS_CHANGES の現行分岐（スタック原因）を特定し、Attemptモデルへ置換する

Task 2: Attempt探索ロジックの実装
- design-review/attempt-*.md の列挙と最新選択
- impl-review/attempt-*.md の列挙と最新選択
- attempt ディレクトリが存在しない場合のみ旧単一ファイルを互換的に読む

Task 3: gate 判定更新
- 設計レビュー NEEDS_CHANGES -> NEEDS_DESIGN_REVIEW（12）
- 実装レビュー NEEDS_CHANGES -> IMPLEMENTING（14）
- 既存の hash mismatch による BROKEN_STATE 判定があれば除去する
- Status 規約外 -> exit 1、meta 更新なし

Task 4: テスト更新・追加（必須）
最低限、以下のケースを追加/更新する。

A. 設計レビュー Attemptモデル
- attempt-001: NEEDS_CHANGES -> gate が NEEDS_DESIGN_REVIEW（12）
- attempt-002: DESIGN_APPROVED -> gate が DESIGN_APPROVED（13）または meta 補助により実装フェーズへ進む（状況に応じて）

B. 設計レビューのスタック回避
- attempt-001 が NEEDS_CHANGES のまま残っていても、
  attempt-002 が DESIGN_APPROVED なら最新 attempt に従って進むこと

C. 実装レビュー Attemptモデル
- impl.md があり、impl-review/attempt-001: NEEDS_CHANGES -> gate が IMPLEMENTING（14）
- impl-review/attempt-002: DONE -> gate が DONE（0）

D. 互換（旧単一ファイル）
- design-review.md のみ存在する旧 topic を gate が解釈できる（attempt が無い場合のみ）
- impl-review.md のみ存在する旧 topic を gate が解釈できる（attempt が無い場合のみ）

E. エラー・破損
- 最新 attempt の Status 規約外 -> exit 1、meta 更新なし
- meta.json パース不能 -> exit 20、meta 更新なし

Task 5: 自己点検
- 変更ファイル一覧
- 更新/追加したテスト一覧と実行結果
- 互換性の説明（旧 topic が壊れない理由）
- .claude 配下に差分が無いことの確認

--------------------------------
Verify（必須）
--------------------------------
- 全テストを実行し PASS
- 手動の簡易シナリオ検証（サンプル topic で attempt を追加し gate が最新のみを見ることを確認）
- grep 等で .claude 配下に差分が無いことを確認

--------------------------------
Rollback（必須）
--------------------------------
- 本トピックの変更コミットを revert する
- revert 後にテストが PASS することを確認

--------------------------------
完了条件（DoD）
--------------------------------
- gate が Attemptモデル（design-review / impl-review 共通）で最新 attempt のみを解釈する
- NEEDS_CHANGES がスタックしない（新 attempt 追加で必ず前進できる）
- Status 規約外は COMMAND_ERROR（exit 1）で停止し meta を更新しない
- meta.json パース不能は BROKEN_STATE（exit 20）で停止し meta を更新しない
- 旧 topic（単一 review ファイル）を暫定互換で解釈できる
- .claude 配下に差分が無い
- feature ブランチで作業されている

