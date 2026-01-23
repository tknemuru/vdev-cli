# Design Review: 2026-01-24-review-implreview-hash-guard

## Attempt #1

### 対象
- **topic**: 2026-01-24-review-implreview-hash-guard
- **plan.md commit**: N/A（登録済み、planSha256 設定済み）

---

## Plan Review チェックリスト

| 項目 | 判定 | 根拠 |
|------|------|------|
| 必須ドキュメント更新要否の明示 | PASS | spec.md/ops.md/arch.md すべて「不要」と理由付きで明示 |
| Verify の具体化 | PASS | npm test コマンド、grep 指定、回帰テスト指定あり |
| DoD の明確性 | PASS | 8項目のチェックリスト形式、具体的合格条件 |
| instruction.md との整合性 | PASS | 必須変更内容3項目すべてに対応、非ゴール遵守 |
| スコープの適切性 | PASS | 変更ファイル4つ、新規概念なし |

---

## Critic（欠陥抽出）

### 検出された問題

なし。

### 確認した観点

| 観点 | 判定 | 根拠 |
|------|------|------|
| ガードの挿入位置 | OK | plan.md/impl.md 存在チェック後、status 抽出前。既存フロー維持 |
| エラーメッセージの明確性 | OK | 原因（sha not set）と対処（run vdev plan/impl first）が明確 |
| 戻り値の一貫性 | OK | 既存パターン（success: false, status: null, message: string）に準拠 |
| gate.ts 修正不要の判断 | OK | hashMatches() が null で false を返す設計を確認。DONE 時に BROKEN_STATE になる |

**BLOCKER**: 0件

---

## Verifier（検証可能性）

### 主張と証跡の対応

| 主張 | 検証方法 | 判定 |
|------|----------|------|
| review.ts が planSha256 null を拒否 | `npm test -- --grep "planSha256 not set"` | 検証可能 |
| impl-review.ts が implSha256 null を拒否 | `npm test -- --grep "implSha256 not set"` | 検証可能 |
| gate.ts は null hash を BROKEN_STATE で処理 | `npm test -- --grep "DONE but planSha256 is null"` | 検証可能 |
| 正規フローの回帰なし | `npm test -- --grep "full workflow e2e"` | 検証可能 |

**検証不能な主張**: なし

---

## Guard（規約・安全）

### ルール準拠確認

| ルール | 判定 | 根拠 |
|--------|------|------|
| vdev-spec.md 準拠 | PASS | 「precondition 違反は COMMAND_ERROR」に準拠（success: false） |
| 既存 exit code 使用 | PASS | 新規 exit code なし |
| 新規 status 追加禁止 | PASS | 新規 status なし |
| CLAUDE.md 変更禁止 | PASS | 対象外として明記 |
| 機能拡張禁止 | PASS | 既存仕様の厳密化のみ |

**ルール違反**: なし

---

## 反証（Counter-Argument）

### 想定される反論

「コマンドレベルでのガードは過剰では？gate で最終的にチェックしているのだから」

### 反駁

gate は DONE/REJECTED 時（Priority 2, 11）のみハッシュ検証を行う。中間状態（DESIGN_APPROVED, IMPLEMENTING）ではファイル存在チェックのみで通過可能。

つまり、vdev plan を経由せずに plan.md を手動作成し、vdev review で DESIGN_APPROVED にすることが現状可能。これは vdev-spec.md の「正規フローを CLI で強制する」という不変条件に違反する。

コマンドレベルでの早期拒否が正規フローの強制に必須であり、過剰ではない。

---

## 最終判定

| サブ役割 | 判定 |
|---------|------|
| Critic | PASS（BLOCKER 0件） |
| Verifier | PASS（すべて検証可能） |
| Guard | PASS（違反なし） |

Status: DESIGN_APPROVED

---

## 承認理由

1. instruction.md の要件を漏れなくカバー
2. 変更範囲が最小限（2ファイル修正 + テスト追加）
3. 既存の正規フローに影響なし（回帰テストで保証）
4. vdev-spec.md の不変条件（正規フロー強制）を実現する適切な実装方針
