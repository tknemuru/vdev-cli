Status: APPROVED

Summary:
- 「現状仕様では review コマンドが正」という前提に統一できており、前回の最大の齟齬（design-review の新設/旧review削除）が解消された。
- gate の責務（meta.status / ファイル存在 / hash のみで判定、review本文は解釈しない）も Plan 全体で整合しており、この Plan を v2.0 実装の進行許可として承認する。

Verify:
- 次の観点で Plan が一貫していることを目視確認済み：
  - 「設計レビュー」は vdev review を用いる（docs/ops / E2E / Task一覧で統一）
  - review コマンドは design-review.md（成果物ファイル名）を書き、meta.status を更新する
  - gate は review本文を解釈せず、meta/status+存在+hash でのみ判定する
- 実装完了後の検証コマンド（Plan 記載どおり）：
  - npm run build
  - npm run test
  - vdev --version
  - vdev --help
  - vdev gate 2026-01-19-vdev-v2-rework

Rollback:
- 実装中に破綻した場合は、該当コミットを revert して v1 の状態に戻す（破壊的変更のため topic の再作成でリカバリーする）。
