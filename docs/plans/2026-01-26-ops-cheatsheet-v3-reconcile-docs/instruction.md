ops.md / vdev-cli-cheatsheet.md 追従改訂（vdev-spec v3.0.0: 正本=md / gate=reconcile / CLI非必須）

--------------------------------
RISK LEVEL
--------------------------------
本トピックは運用手順（ops）とコマンド早見表（cheatsheet）の SoT を更新し、
日々の実行手順に直接影響するため R2（中リスク）として扱う。

--------------------------------
重要制約（絶対遵守）
--------------------------------
- ドキュメント修正は **必ず正本（ai-resources / knowledges 等で管理されている SoT ファイル）に対して行うこと**
- **.claude 配下に存在するファイルはすべてコピー（同期生成物）であり、絶対に修正してはならない**
- .claude 配下のファイルは vdev sync 等により再生成される前提のため、
  本トピックにおける変更対象から完全に除外する
- 修正対象はあくまで SoT として定義された正本ファイルのみとする

--------------------------------
目的
--------------------------------
vdev-spec v3.0.0 の世界観（正本=md / meta.jsonは派生 / gateは状態導出+同期 / CLI非必須）に合わせて、
以下のドキュメントを追従改訂する。

- ops.md（Daily Workflow / Review Loop / Best Practices / Errors）
- vdev-cli-cheatsheet.md（冒頭宣言および各サブコマンド説明）

非目標
- vdev-cli の実装改修は行わない
- vdev-spec.md の改修は行わない（別トピックで実施済み/実施中の前提）
- .claude 配下ファイルの修正・差分作成は一切行わない

--------------------------------
変更対象ファイル（正本のみ）
--------------------------------
1) ops.md（SoT）
2) vdev-cli-cheatsheet.md（SoT）

--------------------------------
共通の前提（v3.0.0 追従の宣言）
--------------------------------
- docs/plans/<topic>/ 配下の md（instruction/plan/design-review/impl/impl-review）が Canonical（正本）である
- md の直接編集は許可される（Claude Code の通常動作を許容）
- vdev の各サブコマンド（instruction/plan/impl/review/impl-review）は必須手続きではなく、任意の補助である
- vdev gate は「正本から状態を導出する」ための入口である
- Status 行が規約外で導出不能な場合は COMMAND_ERROR（exit 1）とする

--------------------------------
ops.md 改訂内容（修正文すべて）
--------------------------------

【A. Best Practices（または同等の注意書き）を更新】

Best Practices（v3 追従）

- docs/plans/<topic>/ 配下の md は Canonical（正本）であり、直接編集してよい
- .claude 配下のコピー生成物は修正対象外とする
- vdev の各サブコマンドは必須手続きではない（補助）
- 状態確認と次アクション判断は vdev gate を入口に行う
- Status 行が規約外の場合は COMMAND_ERROR（exit 1）となるため、テンプレに従うこと

【B. Daily Workflow（v3 追従：DONE まで）】

Step 1: Create Topic
- vdev new <name> を用いて topic ディレクトリを作成する

Step 2: Write Instruction
- instruction.md を作成・更新する（正本=md）
- 直接編集または vdev instruction（任意）

Step 3: Gate Check
- vdev gate <TOPIC>

Step 4: Create Plan
- plan.md を作成・更新する（正本=md）
- 直接編集または vdev plan（任意）

Step 5: Gate Check
- vdev gate <TOPIC>

Step 6: Design Review
- design-review.md を作成・更新する（正本=md）
- Status 行は規約どおりに記載する

Step 7: Gate Check
- vdev gate <TOPIC>

Step 8: Start Implementation
- vdev start <TOPIC>

Step 9: Implementation
- impl.md を作成・更新する（正本=md）

Step 10: Gate Check
- vdev gate <TOPIC>

Step 11: Implementation Review
- impl-review.md を作成・更新する（正本=md）
- Status 行は規約どおりに記載する

Step 12: Final Gate Check
- vdev gate <TOPIC>

【C. Review Loop（v3 追従）】

- NEEDS_CHANGES は正本 md の更新により解消する
- gate により戻り先状態を確認する

【D. Warnings and Errors】

- Status 行が規約外の場合、vdev は COMMAND_ERROR（exit 1）
- 正本 md を修正後、再実行すること
- .claude 配下の修正で解決しようとしてはならない

--------------------------------
vdev-cli-cheatsheet.md 改訂内容（修正文すべて）
--------------------------------

v3.0.0 追従メモ（冒頭に追加）

- 正本は docs/plans/<topic>/ 配下の md である
- .claude 配下のファイルはコピーであり修正禁止
- vdev サブコマンドは任意の補助である
- gate は状態確認の入口である
- Status 行が規約外の場合は COMMAND_ERROR（exit 1）

--------------------------------
完了条件（DoD）
--------------------------------
- 修正はすべて正本ファイルに対して行われている
- .claude 配下ファイルに差分が存在しない
- ops.md / cheatsheet.md が vdev-spec v3.0.0 と整合している

