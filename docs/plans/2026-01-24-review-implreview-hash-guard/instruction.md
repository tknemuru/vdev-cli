# 目的
vdev review / vdev impl-review が、前段階のハッシュ
（planSha256 / implSha256）が null のままでも成功してしまい、
正規の vdev plan / vdev impl を経由せずに state machine が DONE に到達できる
整合性バグを修正する。

本修正は、vdev-spec.md で定義されている正規フローを CLI 自体で厳密に強制し、
「ファイルが存在するだけ」で前進できる抜け道を完全に塞ぐことを目的とする。

※ CLAUDE.md は別リポジトリで管理されているため、本トピックでは一切変更しない。

# スコープ（単発トピック・機能拡張禁止）
- 修正対象は以下のコマンドのみに限定する：
  - vdev review
  - vdev impl-review
- 必要であれば vdev gate の検証ロジックを強化してよい
- 新しいコマンド・status・ワークフロー概念は追加しない
- 既存の vdev gate を緩めたり回避する変更は禁止
- CLAUDE.md や自動処理ロジックは本トピックの対象外とする

# 前提（正規仕様の再確認）
- plan.md は `vdev plan` によってのみ「登録済み」とみなされ、
  このとき planSha256 が設定される
- impl.md も同様に `vdev impl` によってのみ登録され、
  implSha256 が設定される
- review / impl-review は、直前成果物の sha が non-null の場合にのみ実行可能である
- ファイルは存在するが sha が null の状態は BROKEN / INVALID STATE である

# 必須変更内容

## 1. vdev review
対象: review.ts（または同等のハンドラ）

以下の前提条件を必ず追加すること：
- planSha256 が null または未設定の場合：
  - コマンドを即時中断
  - exit code は COMMAND_ERROR（1）
  - 「vdev plan が実行されていないため review を実行できない」
    ことが明確に分かるエラーメッセージを出力する

※ plan.md の存在だけで成功してはならない

## 2. vdev impl-review
対象: impl-review.ts（または同等のハンドラ）

以下の前提条件を必ず追加すること：
- implSha256 が null または未設定の場合：
  - コマンドを即時中断
  - exit code は COMMAND_ERROR（1）
  - 「vdev impl が実行されていないため impl-review を実行できない」
    ことが明確に分かるエラーメッセージを出力する

※ impl.md の存在だけで成功してはならない

## 3. vdev gate（検証・必要なら修正）
- 以下を保証するテストを追加・更新すること：
  - status=DONE であっても、必須 sha が 1 つでも null の場合は DONE にならない
  - null sha は hash 不一致として扱われ、BROKEN_STATE（exit code 20）になる
- 現状実装が誤って DONE を許している場合のみ、gate ロジックを修正する

# テスト（必須）
以下を必ずテストでカバーすること：
- plan.md が存在しても planSha256 が null の場合、vdev review が失敗する
- impl.md が存在しても implSha256 が null の場合、vdev impl-review が失敗する
- exit code が COMMAND_ERROR（1）であること
- hash が不完全な状態では gate が BROKEN_STATE を返すこと
- 正規フロー（vdev plan → review → impl → impl-review）は従来どおり成功すること

# 非ゴール（明示的に対象外）
- CLAUDE.md / 自動処理ロジックの変更
- 既存の壊れた topic を自動修復する仕組み
- 新しい meta フィールドや status の追加
- UI / DX 改善（エラーメッセージ以外）
- vdev start の挙動変更

# 受け入れ条件（DoD）
- 必須 sha がすべて設定されていない限り、DONE には到達できない
- 手動ファイル作成では state machine を前進できない
- vdev の挙動が vdev-spec.md の不変条件と一致している
- 回帰と修正内容がテストで明確に表現されている

上記を既存の vdev CLI アーキテクチャ内で厳密に実装せよ。
