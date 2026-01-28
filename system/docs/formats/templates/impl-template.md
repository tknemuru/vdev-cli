# vdev Implementation Report / 実装報告書（impl.md）

## 0. メタ情報 / Meta
- Topic: <YYYY-MM-DD-...>
- Risk Level: <R1 | R2 | R3>
- Repository: <repo-name>
- Branch: <feature/...>
- Related Instruction: <path to instruction.md>
- Related Plan/Design: <path to plan.md>
- Author: <Claude Code>
- Date: <YYYY-MM-DD>

---

## 1. Summary / サマリ（Human向け：最重要）
### 1.1 何を実装したか（3〜7行）
- ...

### 1.2 変更の意図（Plan準拠か）
- Plan準拠: <Yes / No>
- Planからの逸脱がある場合:
  - 逸脱点:
  - 理由:
  - 影響:
  - 対応（plan修正 / amendments追記 / エスカレーション）:

(English hint)
- Clearly state what changed and whether it matches the plan.

---

## 2. Changes / 変更一覧（必須）
> 「何を触ったか」が一目で分かること。漏れは事故につながる。

| File | Type | Description |
|------|------|-------------|
| <path> | <add/edit/delete> | <何を変えたか> |
| ... | ... | ... |

---

## 3. Implementation Details / 実装詳細（必要十分）
> ここは「設計書」ではなく「実装の証跡」。読み手が追える粒度に絞る。

### 3.1 Step-by-step（PlanのImplementation Stepsに対応）
#### Step 1: <PlanのStep名>
- What:
  - ...
- How (brief):
  - ...
- Notes:
  - ...

#### Step 2: <PlanのStep名>
- What:
  - ...
- How (brief):
  - ...
- Notes:
  - ...

(必要に応じて Step 3, 4...)

---

## 4. Verification / 検証（必須：最重要）
> 実行したコマンドと結果を「事実」として残す。

### 4.1 実行したVerifyコマンド
- `<command>`
  - Result: <OK / NG>
  - Notes: <必要なら>

- `<command>`
  - Result: <OK / NG>
  - Notes: <必要なら>

### 4.2 テスト変更 / Test Changes
- Added tests:
  - <path>
- Updated tests:
  - <path>
- Coverage/Scope:
  - <何（正常/異常/境界）を担保したか>

### 4.3 期待結果（Acceptance Criteria）との対応
- [ ] AC-1: <...>
  - Evidence: <どのテスト/実行/確認で満たしたか>
- [ ] AC-2: <...>
  - Evidence: ...

(English hint)
- Map acceptance criteria to concrete evidence.

---

## 5. Observability / 観測性（必要な場合）
> 変更が運用に影響する場合のみ。最小でよい。

- Logs:
  - <追加/変更したログ、キー、レベル>
- Metrics:
  - <追加/変更したメトリクス>
- Debug hints:
  - <障害時にどこを見ればよいか>

---

## 6. Compatibility & Migration / 互換性・移行（必要な場合）
- Backward compatibility:
  - Preserved / Broken（理由）
- Migration steps:
  1. ...
  2. ...
- Backfill:
  - <必要なら>
- Feature flag / Rollout:
  - <段階適用があるなら>

---

## 7. Rollback / ロールバック（必要な場合）
> 「戻せる」ことを現実的に説明する。コマンドや手順があるなら書く。

- Rollback strategy:
  - ...
- Rollback steps:
  1. ...
  2. ...
- Rollback verification:
  - `<command>` expected: ...

---

## 8. Risks / リスク（必須）
> 実装で新たに見えたリスク、残る不確実性を明示する。

- Remaining risks:
  - ...
- Follow-ups (if any):
  - <別トピック化が必要ならここに列挙>

---

## 9. PR / リンク（運用）
- PR URL:
  - <url>
- Related issues/docs:
  - <links>

---

## 10. Notes / 補足
- <将来の注意点、読み手へのメモ>
