vdev CLI を v2.0.0 に破壊的アップデートする。

[Goal]
- vdev を「設計承認→実装→実装レビュー承認→DONE」までの単一状態機械にする
- CI を完了条件から外し、DONE は「Claude の実装完了報告 + 人間/ChatGPT の承認」で成立させる
- 誤操作で状態が意図せず進まないよう、各コマンドで前提条件を厳密にチェックし、
  違反時は COMMAND_ERROR(1) で必ず止める

[Spec]
- vdev-spec.md を version 2.0.0 / schemaVersion 2 に更新
- Status enum：
  NEEDS_INSTRUCTION
  NEEDS_PLAN
  NEEDS_DESIGN_REVIEW
  DESIGN_APPROVED
  IMPLEMENTING
  NEEDS_IMPL_REPORT
  NEEDS_IMPL_REVIEW
  DONE
  REJECTED
  BROKEN_STATE
- Exit code：
  DONE=0
  NEEDS_INSTRUCTION=10
  NEEDS_PLAN=11
  NEEDS_DESIGN_REVIEW=12
  DESIGN_APPROVED=13
  IMPLEMENTING=14
  NEEDS_IMPL_REPORT=15
  NEEDS_IMPL_REVIEW=16
  REJECTED=17
  BROKEN_STATE=20
  COMMAND_ERROR=1
- docs/plans/<topic>/ に以下の成果物を持つ：
  instruction.md
  plan.md
  design-review.md
  impl.md
  impl-review.md
  meta.json
- 新コマンド：
  vdev design-review
  vdev start
  vdev impl
  vdev impl-review
- 廃止：
  vdev run（v2.0 では使用しない）
- Gate 判定は DONE を最終成功状態とする
- plan 更新は必ず NEEDS_DESIGN_REVIEW に戻す
- impl 更新は必ず NEEDS_IMPL_REVIEW に戻す

[Non-Goals]
- LLM API 呼び出しの内包
- Git 操作の自動実行

[Deliverables]
- vdev-spec.md（v2.0.0 最終確定版）
- ops.md（v2.0 公式フロー：DONE まで）
- CLI 実装（状態遷移・前提条件チェック・exit code）
- 既存 v1 topic への扱い方針（非互換であることを明示）
- 重要ロジックのテスト追加
  - 状態遷移
  - exit code
  - Status 行抽出
  - 前提条件違反時に状態が変わらないこと
