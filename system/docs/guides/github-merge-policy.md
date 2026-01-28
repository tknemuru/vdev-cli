# GitHub Merge Policy

## 1 Basics
- `main`（または `trunk`）への直接pushは禁止し、変更は必ずPR経由で取り込む
- 1 vdev topic は原則として 1ブランチ＋1PRに対応させる
- PRは差分の監査・承認・マージ責務を担い、vdevは成果物と状態遷移による品質ゲートを担う

## 2 Required PR Information
PR本文には最低限以下を含める（テンプレ化推奨）：
- vdev topic 名
- リスク分類（R1/R2/R3）
- 変更概要（What / Why）
- Verify結果サマリ（コマンドと結果）
- ロールバック方針（必要時）

## 3 Approval and Merge Responsibilities
- **R1/R2**
  - PR作成：Implementer
  - PRレビュー：Reviewer
  - マージ：Reviewer（必須チェック成功後）
- **R3**
  - PR作成：Implementer
  - 一次レビュー：Reviewer（チェックリスト＋Verify確認、指摘を残す）
  - **最終承認（Approve）およびマージ：Humanの責務**（GitHub/GitLab UIで実施）

## 4 R3 Human Comments are Canonical in PR
- R3のHuman指摘はPR上のReviewコメント（Request changes/Approve、行コメント、総評）を一次記録（正本）とする
- ReviewerはAttemptにリンク＋要約として同期し、全文転載は行わない
- HumanがRequest changesを出した場合、Implementerは解消するまでマージしてはならない
- R3のマージは原則として以下が揃った場合のみ実行する：
  - vdev `impl-review` が `DONE`
  - HumanがPRを `Approve`
  - 必須チェック（テスト等）がすべて成功

---
