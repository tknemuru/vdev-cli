# Design Review: ~/.vdev 参照の削除

## Attempt 1

### 判定対象
- docs/plans/2026-01-26-remove-home-vdev-from-docs/plan.md
- docs/plans/2026-01-26-remove-home-vdev-from-docs/instruction.md

### Pressure Test Suite v1 実施結果
- Suite: v1
- Executed: 5/5
- Triggered: None

| PT-ID | 判定 | 備考 |
|-------|------|------|
| PT-D1 | PASS | instruction → plan 対応あり、Verify が grep で具体的 |
| PT-D2 | PASS | 曖昧表現なし、Before/After が具体的 |
| PT-D3 | PASS | grep コマンドで再現可能 |
| PT-D4 | PASS | vdev-spec.md 更新が明示、CLI 変更なしのため他は不要 |
| PT-D5 | PASS | docs 修正のみ、API/I/O 変更なし |

### Guard 評価
- **判定**: PASS
- vdev フロー違反なし
- R3（高リスク）分類を維持
- 禁止ブランチ上での実装ではない（確認は実装開始時に行う）

### Verifier 評価
- **判定**: PASS
- Verify コマンドが具体的（grep による残存確認）
- 成功条件が明確（「何も出力されない」）
- 第三者が再現可能

### Critic 評価
- **判定**: PASS
- BLOCKER: 0 件
- MAJOR: 0 件

#### 反証（失敗シナリオ）

1. **docs/plans/ 除外の暗黙判断リスク**
   - plan は過去トピックを「履歴として変更すべきではない」としているが、これは instruction に明示されていない。
   - 失敗シナリオ: 読者が docs/plans/ 内の旧記述を参照して混乱する可能性。
   - 緩和: instruction の Scope は「例: docs 配下」とあり、Non-Goals に「docs の大規模再構成」があるため、過去成果物の変更は Scope 外と解釈できる。かつ過去トピックは完了済み履歴であり、現行運用ガイドではない。許容可能。

2. **セクション 14.3 の「単一正本」表現**
   - plan は 14.3 を変更なしとしているが、「単一正本を中心とした運用を前提とする」の記述が残る。
   - 失敗シナリオ: 読者が「単一正本とは何か」を疑問に思う可能性。
   - 緩和: 14.1 で ai-resources が Source of Truth と明示されるため、文脈から理解可能。instruction の Constraints に「推測で新しいパスやセットアップ手順を作らない」とあり、最小変更方針は妥当。許容可能。

3. **vdev sync の行 403 以降の整合性**
   - 行 403 のみ変更すると、以降の説明（差分判定等）との整合性が崩れる可能性。
   - 失敗シナリオ: 「グローバル正本」という用語が削除されても、後続で参照している箇所があれば矛盾する。
   - 緩和: plan の Task 2 は行 403 のみを対象としているが、セクション 9.11 全体を読むと ops.md の 5.2 vdev sync と整合しており、ai-resources 参照への変更は自然。許容可能。

### 最終判定

| 役割 | 判定 |
|------|------|
| Guard | PASS |
| Verifier | PASS |
| Critic | PASS（反証 3 件、BLOCKER 0） |

Status: DESIGN_APPROVED

### 承認理由
- instruction の要求が plan に適切に反映されている
- 修正対象が vdev-spec.md に限定され、過去成果物は変更しない方針が妥当
- Verify が具体的で再現可能
- R3 分類のため、最終 merge は Human が実施する
