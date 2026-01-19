# vdev CLI v2.0.0 Implementation Plan

version: 2.0.0
created: 2026-01-19
status: DRAFT

---

## Executive Summary

vdev CLI を v1.0.0 から v2.0.0 に破壊的アップデートする。設計承認後に「実装 → 実装レビュー → DONE」フローを追加し、計画駆動開発の完全なライフサイクルを単一 CLI で管理可能にする。

### Key Changes

| 項目 | v1 | v2 |
|------|-----|-----|
| Status 数 | 6 (+BROKEN_STATE) | 10 (+BROKEN_STATE) |
| 終了条件 | APPROVED | DONE |
| コマンド数 | 7 | 10 (3削除, 4追加) |
| 成果物 | 4ファイル | 6ファイル |
| schemaVersion | 1 | 2 |

---

## Epic 1: Specification & Documentation Update

**目的:** v2.0.0 仕様を確定し、ドキュメントを全面改訂する

---

### Task 1.1: vdev-spec.md v2.0.0 全面改訂

**目的:**
vdev-spec.md を v2.0.0 仕様に完全置換し、新しい状態機械とコマンド体系を定義する

**変更範囲:**
- `docs/vdev-spec.md`

**実装手順:**

1. **Step 1.1.1: Header & Version 更新**
   - version: 1.0.0 → 2.0.0
   - 概要文を v2 仕様に合わせて書き換え

2. **Step 1.1.2: Status Enum 更新**
   ```
   v1 (削除):
   - NEEDS_REVIEW
   - NEEDS_CHANGES
   - APPROVED

   v2 (追加/変更):
   - NEEDS_DESIGN_REVIEW (旧 NEEDS_REVIEW 相当)
   - DESIGN_APPROVED (旧 APPROVED 相当、ただし実装未開始)
   - IMPLEMENTING
   - NEEDS_IMPL_REPORT
   - NEEDS_IMPL_REVIEW
   - DONE (最終承認状態)
   ```

3. **Step 1.1.3: Exit Code 一覧更新**
   v2.0 確定仕様（docs/vdev-spec.md セクション7）に完全一致させる：
   | Code | Status | 説明 |
   |------|--------|------|
   | 0 | DONE | 完了 |
   | 1 | COMMAND_ERROR | 前提条件違反 / 入力不正 / 例外 |
   | 10 | NEEDS_INSTRUCTION | instruction.md なし |
   | 11 | NEEDS_PLAN | plan.md なし |
   | 12 | NEEDS_DESIGN_REVIEW | design-review.md なし |
   | 13 | DESIGN_APPROVED | 設計承認済み（実装開始可能） |
   | 14 | IMPLEMENTING | 実装中 |
   | 15 | NEEDS_IMPL_REPORT | impl.md なし |
   | 16 | NEEDS_IMPL_REVIEW | impl-review.md なし |
   | 17 | REJECTED | 設計却下 |
   | 20 | BROKEN_STATE | 整合性エラー |

4. **Step 1.1.4: meta.json Schema v2 定義**
   ```json
   {
     "schemaVersion": 2,
     "topic": "2026-01-19-feature",
     "title": "Feature",
     "status": "NEEDS_INSTRUCTION",
     "paths": {
       "instruction": "instruction.md",
       "plan": "plan.md",
       "designReview": "design-review.md",
       "impl": "impl.md",
       "implReview": "impl-review.md"
     },
     "hashes": {
       "planSha256": null,
       "designReviewSha256": null,
       "implSha256": null,
       "implReviewSha256": null
     },
     "timestamps": {
       "createdAt": "...",
       "updatedAt": "..."
     }
   }
   ```

5. **Step 1.1.5: Gate Decision Table v2 定義**
   優先度順に評価（gate は meta.status / ファイル存在 / hash のみで判定、review 本文は解釈しない）:
   | 優先度 | 条件 | 判定状態 | Exit |
   |--------|------|----------|------|
   | 1 | meta.json 不正/パース失敗 | BROKEN_STATE | 20 |
   | 2 | status in (DONE, REJECTED) かつ hash 不一致 | BROKEN_STATE | 20 |
   | 3 | instruction.md なし | NEEDS_INSTRUCTION | 10 |
   | 4 | plan.md なし | NEEDS_PLAN | 11 |
   | 5 | design-review.md なし | NEEDS_DESIGN_REVIEW | 12 |
   | 6 | status=REJECTED | REJECTED | 17 |
   | 7 | status=DESIGN_APPROVED | DESIGN_APPROVED | 13 |
   | 8 | status=IMPLEMENTING かつ impl.md なし | NEEDS_IMPL_REPORT | 15 |
   | 9 | status=IMPLEMENTING かつ impl.md あり かつ impl-review.md なし | NEEDS_IMPL_REVIEW | 16 |
   | 10 | status=NEEDS_IMPL_REVIEW | NEEDS_IMPL_REVIEW | 16 |
   | 11 | status=DONE かつ hash 一致 | DONE | 0 |
   | 12 | その他 | BROKEN_STATE | 20 |

6. **Step 1.1.6: Commands セクション全面書換**
   - `vdev new` - 変更なし
   - `vdev instruction` - 変更なし
   - `vdev plan` - status 遷移先を NEEDS_DESIGN_REVIEW に変更
   - `vdev review` - v2.0 仕様に拡張（設計レビュー用に更新）
   - `vdev start` - 新規追加（DESIGN_APPROVED → IMPLEMENTING）
   - `vdev impl` - 新規追加（実装完了報告）
   - `vdev impl-review` - 新規追加（実装レビュー）
   - `vdev gate` - 判定ロジック更新
   - `vdev ls` - v2 status 対応
   - `vdev run` - **削除**
   - `vdev review` - v2.0 仕様に拡張（継続利用）

7. **Step 1.1.7: Invariants 更新**
   - plan.md 更新 → NEEDS_DESIGN_REVIEW に戻す
   - impl.md 更新 → NEEDS_IMPL_REVIEW に戻す
   - DONE は全 hash 整合が必須

8. **Step 1.1.8: v1 非互換宣言追加**
   - schemaVersion 1 の topic は v2 CLI で処理不可
   - マイグレーションパスは提供しない（手動対応）

**完了条件 (DoD):**
- [ ] vdev-spec.md が v2.0.0 仕様を完全に記述している
- [ ] 全 Status / Exit Code / Command が矛盾なく定義されている
- [ ] Gate Decision Table が全状態遷移を網羅している
- [ ] schemaVersion 2 の meta.json スキーマが定義されている

**Verify:**
```bash
# ドキュメントが存在し、v2.0.0 が含まれる
grep -q "version: 2.0.0" docs/vdev-spec.md
# 全 Status が定義されている
grep -E "NEEDS_INSTRUCTION|NEEDS_PLAN|NEEDS_DESIGN_REVIEW|DESIGN_APPROVED|IMPLEMENTING|NEEDS_IMPL_REPORT|NEEDS_IMPL_REVIEW|DONE|REJECTED|BROKEN_STATE" docs/vdev-spec.md | wc -l
# schemaVersion 2 が定義されている
grep -q '"schemaVersion": 2' docs/vdev-spec.md
```

**Rollback:**
```bash
git checkout HEAD -- docs/vdev-spec.md
```

**リスク:**
- 仕様の曖昧さが実装時に問題を引き起こす可能性
- 対策: 全状態遷移のシーケンス図を明示する

---

### Task 1.2: ops.md v2.0.0 全面改訂

**目的:**
運用ガイドを v2.0.0 ワークフローに完全対応させる

**変更範囲:**
- `docs/ops.md`

**実装手順:**

1. **Step 1.2.1: Daily Workflow を v2 フローに書換**
   ```
   Step 1: vdev new → Topic 作成
   Step 2: vdev instruction → 指示書保存
   Step 3: vdev plan → 計画書保存
   Step 4: vdev review → 設計レビュー (Status: DESIGN_APPROVED)
   Step 5: vdev start → 実装開始宣言
   Step 6: [実装作業]
   Step 7: vdev impl → 実装完了報告
   Step 8: vdev impl-review → 実装レビュー (Status: DONE)
   Step 9: 完了
   ```

2. **Step 1.2.2: Status Patterns テーブル更新**
   | Status | Exit | 説明 | 次のアクション |
   |--------|------|------|---------------|
   | NEEDS_INSTRUCTION | 10 | instruction.md 未作成 | vdev instruction |
   | NEEDS_PLAN | 11 | plan.md 未作成 | vdev plan |
   | NEEDS_DESIGN_REVIEW | 12 | 設計レビュー待ち | vdev review |
   | DESIGN_APPROVED | 13 | 設計承認済み、実装未開始 | vdev start |
   | IMPLEMENTING | 14 | 実装中 | 実装作業 |
   | NEEDS_IMPL_REPORT | 15 | 実装完了報告待ち | vdev impl |
   | NEEDS_IMPL_REVIEW | 16 | 実装レビュー待ち | vdev impl-review |
   | DONE | 0 | 完了 | - |
   | REJECTED | 17 | 却下 | 計画見直し |
   | BROKEN_STATE | 20 | 整合性エラー | rollback.md 参照 |

3. **Step 1.2.3: plan 更新時のフロー説明更新**
   - plan 更新 → NEEDS_DESIGN_REVIEW に戻る
   - 設計承認が必要

4. **Step 1.2.4: impl 更新時のフロー説明追加**
   - impl 更新 → NEEDS_IMPL_REVIEW に戻る
   - 実装レビューが必要

5. **Step 1.2.5: スクリプト例を v2 対応に更新**
   ```bash
   case $exit_code in
       10) echo "Need instruction" ;;
       11) echo "Need plan" ;;
       12) echo "Need design review" ;;
       13) echo "Design approved - run 'vdev start'" ;;
       14) echo "Implementing" ;;
       15) echo "Need impl report" ;;
       16) echo "Need impl review" ;;
       17) echo "Rejected" ;;
       20) echo "Broken state" ;;
   esac
   ```

6. **Step 1.2.6: Best Practices を v2 向けに更新**
   - design-review.md には必ず `Status: DESIGN_APPROVED` または `Status: REJECTED` または `Status: NEEDS_CHANGES` を含める
   - impl-review.md には必ず `Status: DONE` または `Status: NEEDS_CHANGES` を含める
   - vdev start を実行してから実装を開始する

**完了条件 (DoD):**
- [ ] v2.0.0 ワークフローが Step-by-Step で記述されている
- [ ] 全 Status に対するアクションガイドがある
- [ ] スクリプト例が v2 exit code に対応している

**Verify:**
```bash
# v2 コマンドが説明されている
grep -q "vdev review" docs/ops.md
grep -q "vdev start" docs/ops.md
grep -q "vdev impl" docs/ops.md
grep -q "vdev impl-review" docs/ops.md
# 廃止コマンドが削除されている
! grep -q "vdev run" docs/ops.md
```

**Rollback:**
```bash
git checkout HEAD -- docs/ops.md
```

**リスク:**
- ユーザーが v1 ops を参照して混乱する可能性
- 対策: v2 ドキュメント冒頭に v1 非互換の警告を明記

---

### Task 1.3: rollback.md v2.0.0 対応更新

**目的:**
リカバリーガイドを v2.0.0 の状態モデルに対応させる

**変更範囲:**
- `docs/rollback.md`

**実装手順:**

1. **Step 1.3.1: 新 Status に対応したリカバリーシナリオ追加**
   - DESIGN_APPROVED からの誤操作回復
   - IMPLEMENTING 状態での問題
   - NEEDS_IMPL_REPORT / NEEDS_IMPL_REVIEW でのロールバック

2. **Step 1.3.2: hash 整合性の説明を更新**
   - 4つの hash (plan, designReview, impl, implReview) の整合性
   - どの hash が不整合で BROKEN_STATE になるか

3. **Step 1.3.3: v1 topic の扱い方針を明記**
   - v2 CLI は schemaVersion 1 の topic を処理しない
   - v1 topic は手動で完了させるか、削除する

**完了条件 (DoD):**
- [ ] v2 全 Status のリカバリー手順が記述されている
- [ ] schemaVersion 1 topic の扱いが明記されている

**Verify:**
```bash
grep -q "DESIGN_APPROVED" docs/rollback.md
grep -q "IMPLEMENTING" docs/rollback.md
grep -q "schemaVersion" docs/rollback.md
```

**Rollback:**
```bash
git checkout HEAD -- docs/rollback.md
```

**リスク:**
- リカバリー手順の漏れ
- 対策: 全 Status × 全 Error パターンのマトリクスを作成

---

## Epic 2: Core Module Updates

**目的:** CLI の基盤モジュールを v2.0.0 に対応させる

---

### Task 2.1: Status Enum & Exit Code 更新

**目的:**
新しい Status 列挙型と Exit Code を定義する

**変更範囲:**
- `src/core/errors.ts`
- `src/core/meta.ts`

**実装手順:**

1. **Step 2.1.1: src/core/errors.ts の Exit Code 更新**
   ```typescript
   export const ExitCode = {
     DONE: 0,
     COMMAND_ERROR: 1,
     NEEDS_INSTRUCTION: 10,
     NEEDS_PLAN: 11,
     NEEDS_DESIGN_REVIEW: 12,
     DESIGN_APPROVED: 13,
     IMPLEMENTING: 14,
     NEEDS_IMPL_REPORT: 15,
     NEEDS_IMPL_REVIEW: 16,
     REJECTED: 17,
     BROKEN_STATE: 20,
   } as const;
   ```

2. **Step 2.1.2: src/core/meta.ts の MetaStatus 更新**
   ```typescript
   export type MetaStatus =
     | 'NEEDS_INSTRUCTION'
     | 'NEEDS_PLAN'
     | 'NEEDS_DESIGN_REVIEW'
     | 'DESIGN_APPROVED'
     | 'IMPLEMENTING'
     | 'NEEDS_IMPL_REPORT'
     | 'NEEDS_IMPL_REVIEW'
     | 'DONE'
     | 'REJECTED';
   ```

3. **Step 2.1.3: Status → Exit Code マッピング関数更新**
   ```typescript
   export function statusToExitCode(status: MetaStatus | 'BROKEN_STATE'): number {
     const map: Record<string, number> = {
       DONE: ExitCode.DONE,
       NEEDS_INSTRUCTION: ExitCode.NEEDS_INSTRUCTION,
       NEEDS_PLAN: ExitCode.NEEDS_PLAN,
       NEEDS_DESIGN_REVIEW: ExitCode.NEEDS_DESIGN_REVIEW,
       DESIGN_APPROVED: ExitCode.DESIGN_APPROVED,
       IMPLEMENTING: ExitCode.IMPLEMENTING,
       NEEDS_IMPL_REPORT: ExitCode.NEEDS_IMPL_REPORT,
       NEEDS_IMPL_REVIEW: ExitCode.NEEDS_IMPL_REVIEW,
       REJECTED: ExitCode.REJECTED,
       BROKEN_STATE: ExitCode.BROKEN_STATE,
     };
     return map[status] ?? ExitCode.BROKEN_STATE;
   }
   ```

**完了条件 (DoD):**
- [ ] 全 v2 Status が MetaStatus 型に定義されている
- [ ] 全 v2 Exit Code が ExitCode 定数に定義されている
- [ ] Status と Exit Code の対応が正しい

**Verify:**
```bash
# TypeScript コンパイルが通る
npm run build
# 全 Status が定義されている
grep -E "NEEDS_INSTRUCTION|NEEDS_PLAN|NEEDS_DESIGN_REVIEW|DESIGN_APPROVED|IMPLEMENTING|NEEDS_IMPL_REPORT|NEEDS_IMPL_REVIEW|DONE|REJECTED" src/core/meta.ts
```

**Rollback:**
```bash
git checkout HEAD -- src/core/errors.ts src/core/meta.ts
```

**リスク:**
- Exit Code の番号衝突
- 対策: v1 との対応表を作成し、意図的な変更であることを確認

---

### Task 2.2: meta.json Schema v2 対応

**目的:**
meta.json のスキーマを v2 に更新し、新しいファイルパスとハッシュを管理する

**変更範囲:**
- `src/core/meta.ts`

**実装手順:**

1. **Step 2.2.1: Meta インターフェース更新**
   ```typescript
   export interface Meta {
     schemaVersion: 2;
     topic: string;
     title: string;
     status: MetaStatus;
     paths: {
       instruction: string;
       plan: string;
       designReview: string;
       impl: string;
       implReview: string;
     };
     hashes: {
       planSha256: string | null;
       designReviewSha256: string | null;
       implSha256: string | null;
       implReviewSha256: string | null;
     };
     timestamps: {
       createdAt: string;
       updatedAt: string;
     };
   }
   ```

2. **Step 2.2.2: 初期 Meta 生成関数更新**
   ```typescript
   export function createInitialMeta(topic: string, title: string): Meta {
     const now = getJstTimestamp();
     return {
       schemaVersion: 2,
       topic,
       title,
       status: 'NEEDS_INSTRUCTION',
       paths: {
         instruction: 'instruction.md',
         plan: 'plan.md',
         designReview: 'design-review.md',
         impl: 'impl.md',
         implReview: 'impl-review.md',
       },
       hashes: {
         planSha256: null,
         designReviewSha256: null,
         implSha256: null,
         implReviewSha256: null,
       },
       timestamps: {
         createdAt: now,
         updatedAt: now,
       },
     };
   }
   ```

3. **Step 2.2.3: schemaVersion バリデーション追加**
   ```typescript
   export function validateMeta(meta: unknown): meta is Meta {
     if (typeof meta !== 'object' || meta === null) return false;
     const m = meta as Record<string, unknown>;
     if (m.schemaVersion !== 2) return false;
     // ... 他のバリデーション
   }
   ```

4. **Step 2.2.4: v1 schemaVersion 検出時のエラー処理**
   ```typescript
   export function readMeta(metaPath: string): Meta | { error: 'V1_SCHEMA' | 'INVALID' } {
     const content = fs.readFileSync(metaPath, 'utf-8');
     const parsed = JSON.parse(content);
     if (parsed.schemaVersion === 1) {
       return { error: 'V1_SCHEMA' };
     }
     if (!validateMeta(parsed)) {
       return { error: 'INVALID' };
     }
     return parsed;
   }
   ```

**完了条件 (DoD):**
- [ ] Meta 型が v2 スキーマを正確に表現している
- [ ] schemaVersion 1 の meta.json は明示的にエラーになる
- [ ] 新規 topic 作成時に schemaVersion 2 で作成される

**Verify:**
```bash
npm run build
npm run test -- --grep "meta"
# 新規 topic 作成で schemaVersion 2 が設定される
vdev new test-v2 && grep '"schemaVersion": 2' docs/plans/*/meta.json
```

**Rollback:**
```bash
git checkout HEAD -- src/core/meta.ts
```

**リスク:**
- v1 topic を誤って処理してしまう
- 対策: schemaVersion チェックを全コマンドの入口で実施

---

### Task 2.3: Gate Logic v2 対応

**目的:**
Gate 判定ロジックを v2 の状態機械に対応させる

**変更範囲:**
- `src/core/gate.ts`
- `src/core/hashes.ts`

**実装手順:**

1. **Step 2.3.1: 新ファイルの存在チェック追加**
   - design-review.md
   - impl.md
   - impl-review.md

2. **Step 2.3.2: 新ハッシュの整合性チェック追加**
   - designReviewSha256
   - implSha256
   - implReviewSha256

3. **Step 2.3.3: Gate Decision Table v2 実装**

   **重要:** gate は meta.status / ファイル存在 / hash 整合性のみで判定する。
   review ファイル本文（Status 行）は解釈しない。Status 行の解釈は
   `vdev review` / `vdev impl-review` コマンド側の責務とする。

   ```typescript
   export function evaluateGate(meta: Meta, topicPath: string): GateResult {
     // Priority 1: meta.json 不正
     if (!validateMeta(meta)) {
       return { status: 'BROKEN_STATE', exitCode: 20 };
     }

     // Priority 2: DONE/REJECTED かつ hash 不一致 → BROKEN_STATE
     if ((meta.status === 'DONE' || meta.status === 'REJECTED') && !allHashesMatch(meta, topicPath)) {
       return { status: 'BROKEN_STATE', exitCode: 20 };
     }

     // Priority 3-5: ファイル存在チェック
     if (!fileExists(topicPath, 'instruction.md')) {
       return { status: 'NEEDS_INSTRUCTION', exitCode: 10 };
     }
     if (!fileExists(topicPath, 'plan.md')) {
       return { status: 'NEEDS_PLAN', exitCode: 11 };
     }
     if (!fileExists(topicPath, 'design-review.md')) {
       return { status: 'NEEDS_DESIGN_REVIEW', exitCode: 12 };
     }

     // Priority 6: REJECTED
     if (meta.status === 'REJECTED') {
       return { status: 'REJECTED', exitCode: 17 };
     }

     // Priority 7: DESIGN_APPROVED
     if (meta.status === 'DESIGN_APPROVED') {
       return { status: 'DESIGN_APPROVED', exitCode: 13 };
     }

     // Priority 8-9: IMPLEMENTING + ファイルチェック
     if (meta.status === 'IMPLEMENTING') {
       if (!fileExists(topicPath, 'impl.md')) {
         return { status: 'NEEDS_IMPL_REPORT', exitCode: 15 };
       }
       if (!fileExists(topicPath, 'impl-review.md')) {
         return { status: 'NEEDS_IMPL_REVIEW', exitCode: 16 };
       }
     }

     // Priority 10: NEEDS_IMPL_REVIEW
     if (meta.status === 'NEEDS_IMPL_REVIEW') {
       return { status: 'NEEDS_IMPL_REVIEW', exitCode: 16 };
     }

     // Priority 11: DONE かつ hash 一致
     if (meta.status === 'DONE' && allHashesMatch(meta, topicPath)) {
       return { status: 'DONE', exitCode: 0 };
     }

     // Priority 12: その他 → BROKEN_STATE
     return { status: 'BROKEN_STATE', exitCode: 20 };
   }
   ```

4. **Step 2.3.4: allHashesMatch ヘルパー関数追加**
   ```typescript
   function allHashesMatch(meta: Meta, topicPath: string): boolean {
     return (
       hashMatches(meta.hashes.planSha256, topicPath, 'plan.md') &&
       hashMatches(meta.hashes.designReviewSha256, topicPath, 'design-review.md') &&
       hashMatches(meta.hashes.implSha256, topicPath, 'impl.md') &&
       hashMatches(meta.hashes.implReviewSha256, topicPath, 'impl-review.md')
     );
   }
   ```

**完了条件 (DoD):**
- [ ] v2 Gate Decision Table の全優先度が実装されている
- [ ] 全 Status への遷移条件が正しく判定される
- [ ] 全ファイルの hash 整合性がチェックされる

**Verify:**
```bash
npm run test -- --grep "gate"
# 各 Status への遷移をテストで確認
```

**Rollback:**
```bash
git checkout HEAD -- src/core/gate.ts src/core/hashes.ts
```

**リスク:**
- 優先度の順序ミスによる誤判定
- 対策: 全状態遷移パターンの E2E テストを作成

---

### Task 2.4: paths.ts 更新

**目的:**
新しい成果物ファイルのパス解決を追加する

**変更範囲:**
- `src/core/paths.ts`

**実装手順:**

1. **Step 2.4.1: 新ファイルパス関数追加**
   ```typescript
   export function getDesignReviewPath(topicPath: string): string {
     return path.join(topicPath, 'design-review.md');
   }

   export function getImplPath(topicPath: string): string {
     return path.join(topicPath, 'impl.md');
   }

   export function getImplReviewPath(topicPath: string): string {
     return path.join(topicPath, 'impl-review.md');
   }
   ```

2. **Step 2.4.2: 旧 getReviewPath を削除または deprecate**
   - `getReviewPath` → `getDesignReviewPath` に置換

**完了条件 (DoD):**
- [ ] 全 v2 成果物のパス取得関数が存在する
- [ ] 旧関数名が削除されている

**Verify:**
```bash
npm run build
grep -q "getDesignReviewPath" src/core/paths.ts
grep -q "getImplPath" src/core/paths.ts
grep -q "getImplReviewPath" src/core/paths.ts
```

**Rollback:**
```bash
git checkout HEAD -- src/core/paths.ts
```

**リスク:** 低

---

## Epic 3: Command Updates

**目的:** CLI コマンドを v2.0.0 仕様に対応させる

---

### Task 3.1: vdev plan コマンド更新

**目的:**
plan 保存後の状態遷移を NEEDS_DESIGN_REVIEW に変更する

**変更範囲:**
- `src/commands/plan.ts`

**実装手順:**

1. **Step 3.1.1: 前提条件チェック（vdev-spec.md セクション9.3 準拠）**
   ```typescript
   // 前提条件: instruction.md が存在すること
   if (!fileExists(topicPath, 'instruction.md')) {
     console.error('ERROR: instruction.md not found');
     process.exit(ExitCode.COMMAND_ERROR);
   }
   ```

2. **Step 3.1.2: 状態遷移と hash 更新**
   ```typescript
   // plan.md 保存
   writeFile(getPlanPath(topic), normalized);

   // planSha256 更新
   meta.hashes.planSha256 = computeHash(normalized);
   // designReviewSha256 をクリア（設計レビューを無効化）
   meta.hashes.designReviewSha256 = null;
   // status を NEEDS_DESIGN_REVIEW に設定
   meta.status = 'NEEDS_DESIGN_REVIEW';
   // updatedAt 更新
   meta.timestamps.updatedAt = getJstTimestamp();
   ```

**完了条件 (DoD):**
- [ ] plan 保存後に status が NEEDS_DESIGN_REVIEW になる
- [ ] planSha256 が更新される
- [ ] designReviewSha256 がクリアされる
- [ ] instruction.md が存在しない場合に COMMAND_ERROR で終了する

**Verify:**
```bash
# NEEDS_PLAN → plan 保存 → NEEDS_DESIGN_REVIEW
vdev new test-plan
echo "test instruction" | vdev instruction 2026-01-19-test-plan --stdin
echo "test plan" | vdev plan 2026-01-19-test-plan --stdin
grep '"status": "NEEDS_DESIGN_REVIEW"' docs/plans/2026-01-19-test-plan/meta.json
```

**Rollback:**
```bash
git checkout HEAD -- src/commands/plan.ts
```

**リスク:**
- 前提条件チェック漏れ
- 対策: 全 Status × plan コマンドのテストマトリクス

---

### Task 3.2: vdev review コマンド v2.0 拡張

**目的:**
既存の review コマンドを v2.0 仕様に拡張し、設計レビュー結果を保存して状態を DESIGN_APPROVED / REJECTED / NEEDS_PLAN に遷移させる

**変更範囲:**
- `src/commands/review.ts` (更新)

**実装手順:**

1. **Step 3.2.1: review.ts を v2.0 仕様に更新**
   ```typescript
   export async function saveReview(topic: string, content: string): Promise<void> {
     const meta = readMeta(topic);

     // 前提条件: plan.md が存在すること
     if (!fileExists(topicPath, 'plan.md')) {
       console.error('ERROR: plan.md not found');
       process.exit(ExitCode.COMMAND_ERROR);
     }

     const normalized = normalizeLF(content);

     // design-review.md 保存（ファイル名は v2 仕様に準拠）
     writeFile(getDesignReviewPath(topic), normalized);

     // Status 抽出（DESIGN_APPROVED | REJECTED | NEEDS_CHANGES）
     const extractedStatus = extractReviewStatus(normalized);

     // 状態遷移
     if (extractedStatus === 'DESIGN_APPROVED') {
       meta.status = 'DESIGN_APPROVED';
     } else if (extractedStatus === 'REJECTED') {
       meta.status = 'REJECTED';
     } else if (extractedStatus === 'NEEDS_CHANGES') {
       meta.status = 'NEEDS_PLAN'; // 設計やり直し
     } else {
       console.error('ERROR: Status extraction failed');
       process.exit(ExitCode.COMMAND_ERROR);
     }

     // hash 更新（designReviewSha256 のみ）
     meta.hashes.designReviewSha256 = computeHash(normalized);
     // updatedAt 更新
     meta.timestamps.updatedAt = getJstTimestamp();

     // 保存
     saveMeta(topic, meta);

     console.log(`REPO=${repo}\tREVIEW_SAVED\t${topic}\t${meta.status}`);
   }
   ```

2. **Step 3.2.2: Status 抽出パターン更新**
   ```typescript
   // DESIGN_APPROVED, REJECTED, NEEDS_CHANGES を抽出
   const pattern = /^Status:\s*(DESIGN_APPROVED|REJECTED|NEEDS_CHANGES)\s*$/im;
   ```

3. **Step 3.2.3: cli.ts のコマンド登録は既存のまま維持**
   - `vdev review <topic> --stdin` の形式を継続

**完了条件 (DoD):**
- [ ] review コマンドが v2.0 仕様で動作する
- [ ] Status: DESIGN_APPROVED で DESIGN_APPROVED に遷移する
- [ ] Status: REJECTED で REJECTED に遷移する
- [ ] Status: NEEDS_CHANGES で NEEDS_PLAN に遷移する（設計やり直し）
- [ ] Status 行なし or 不正値で COMMAND_ERROR
- [ ] plan.md が存在しない場合に COMMAND_ERROR

**Verify:**
```bash
# コマンドが動作する
vdev review --help
# 正常系テスト
echo "Status: DESIGN_APPROVED" | vdev review $TOPIC --stdin
grep '"status": "DESIGN_APPROVED"' docs/plans/$TOPIC/meta.json
```

**Rollback:**
```bash
git checkout HEAD -- src/commands/review.ts
```

**リスク:**
- Status 抽出の正規表現ミス
- 対策: 各パターンのユニットテスト

---

### Task 3.3: vdev start コマンド新規作成

**目的:**
DESIGN_APPROVED → IMPLEMENTING に状態を遷移させ、実装開始を宣言する

**変更範囲:**
- `src/commands/start.ts` (新規)
- `src/cli.ts`

**実装手順:**

1. **Step 3.3.1: start.ts 新規作成**
   ```typescript
   export function start(topic: string): void {
     const meta = readMeta(topic);

     // 前提条件: DESIGN_APPROVED のみ
     if (meta.status !== 'DESIGN_APPROVED') {
       console.error(`ERROR: Cannot start in ${meta.status} status`);
       process.exit(ExitCode.COMMAND_ERROR);
     }

     // 状態遷移
     meta.status = 'IMPLEMENTING';
     meta.timestamps.updatedAt = getJstTimestamp();

     // 保存
     saveMeta(topic, meta);

     console.log(`REPO=${repo}\tIMPLEMENTATION_STARTED\t${topic}`);
   }
   ```

2. **Step 3.3.2: cli.ts にコマンド登録**
   ```typescript
   program
     .command('start <topic>')
     .action((topic) => {
       start(topic);
     });
   ```

**完了条件 (DoD):**
- [ ] start コマンドが存在する
- [ ] DESIGN_APPROVED → IMPLEMENTING に遷移する
- [ ] DESIGN_APPROVED 以外からの実行で COMMAND_ERROR

**Verify:**
```bash
vdev start --help
# 正常系
vdev start $TOPIC
grep '"status": "IMPLEMENTING"' docs/plans/$TOPIC/meta.json
```

**Rollback:**
```bash
rm src/commands/start.ts
git checkout HEAD -- src/cli.ts
```

**リスク:** 低

---

### Task 3.4: vdev impl コマンド新規作成

**目的:**
実装完了報告 (impl.md) を保存し、NEEDS_IMPL_REVIEW に遷移させる

**変更範囲:**
- `src/commands/impl.ts` (新規)
- `src/cli.ts`

**実装手順:**

1. **Step 3.4.1: impl.ts 新規作成**
   ```typescript
   export async function impl(topic: string): Promise<void> {
     const meta = readMeta(topic);

     // 前提条件: IMPLEMENTING または NEEDS_IMPL_REVIEW
     const allowedStatuses = ['IMPLEMENTING', 'NEEDS_IMPL_REVIEW'];
     if (!allowedStatuses.includes(meta.status)) {
       console.error(`ERROR: Cannot save impl in ${meta.status} status`);
       process.exit(ExitCode.COMMAND_ERROR);
     }

     // stdin から読み取り
     const content = await readStdin();
     const normalized = normalizeLF(content);

     // impl.md 保存
     writeFile(getImplPath(topic), normalized);

     // 状態遷移
     meta.status = 'NEEDS_IMPL_REVIEW';
     meta.hashes.implSha256 = computeHash(normalized);
     meta.hashes.implReviewSha256 = null; // 実装更新で impl-review を無効化
     meta.timestamps.updatedAt = getJstTimestamp();

     // 保存
     saveMeta(topic, meta);

     console.log(`REPO=${repo}\tIMPL_SAVED\t${topic}`);
   }
   ```

2. **Step 3.4.2: cli.ts にコマンド登録**
   ```typescript
   program
     .command('impl <topic>')
     .option('--stdin', 'Read content from stdin')
     .action(async (topic, options) => {
       await impl(topic);
     });
   ```

**完了条件 (DoD):**
- [ ] impl コマンドが存在する
- [ ] IMPLEMENTING → NEEDS_IMPL_REVIEW に遷移する
- [ ] NEEDS_IMPL_REVIEW からの再実行で impl.md 更新可能
- [ ] implReviewSha256 がクリアされる
- [ ] 不正 status からの実行で COMMAND_ERROR

**Verify:**
```bash
vdev impl --help
echo "Implementation report" | vdev impl $TOPIC --stdin
grep '"status": "NEEDS_IMPL_REVIEW"' docs/plans/$TOPIC/meta.json
```

**Rollback:**
```bash
rm src/commands/impl.ts
git checkout HEAD -- src/cli.ts
```

**リスク:**
- impl 更新時の impl-review 無効化漏れ
- 対策: invariant テストで確認

---

### Task 3.5: vdev impl-review コマンド新規作成

**目的:**
実装レビュー結果を保存し、DONE または IMPLEMENTING（やり直し）に遷移させる

**変更範囲:**
- `src/commands/impl-review.ts` (新規)
- `src/cli.ts`

**実装手順:**

1. **Step 3.5.1: impl-review.ts 新規作成**
   ```typescript
   export async function implReview(topic: string): Promise<void> {
     const meta = readMeta(topic);

     // 前提条件: impl.md が存在すること
     if (!fileExists(topicPath, 'impl.md')) {
       console.error('ERROR: impl.md not found');
       process.exit(ExitCode.COMMAND_ERROR);
     }

     // stdin から読み取り
     const content = await readStdin();
     const normalized = normalizeLF(content);

     // impl-review.md 保存
     writeFile(getImplReviewPath(topic), normalized);

     // Status 抽出 (DONE または NEEDS_CHANGES)
     const extractedStatus = extractImplReviewStatus(normalized);

     // 状態遷移
     if (extractedStatus === 'DONE') {
       meta.status = 'DONE';
     } else if (extractedStatus === 'NEEDS_CHANGES') {
       meta.status = 'IMPLEMENTING'; // 実装修正へ戻す
     } else {
       console.error('ERROR: Status extraction failed');
       process.exit(ExitCode.COMMAND_ERROR);
     }

     // hash 更新（implReviewSha256 のみ、vdev-spec.md セクション9.7 準拠）
     meta.hashes.implReviewSha256 = computeHash(normalized);
     // updatedAt 更新
     meta.timestamps.updatedAt = getJstTimestamp();

     // 保存
     saveMeta(topic, meta);

     console.log(`REPO=${repo}\tIMPL_REVIEW_SAVED\t${topic}\t${meta.status}`);
   }
   ```

2. **Step 3.5.2: impl-review 用 Status 抽出**
   ```typescript
   // DONE または NEEDS_CHANGES を抽出
   const pattern = /^Status:\s*(DONE|NEEDS_CHANGES)\s*$/im;
   ```

3. **Step 3.5.3: cli.ts にコマンド登録**
   ```typescript
   program
     .command('impl-review <topic>')
     .option('--stdin', 'Read content from stdin')
     .action(async (topic, options) => {
       await implReview(topic);
     });
   ```

**完了条件 (DoD):**
- [ ] impl-review コマンドが存在する
- [ ] Status: DONE で DONE に遷移する
- [ ] Status: NEEDS_CHANGES で IMPLEMENTING に遷移する（実装修正へ戻す）
- [ ] Status 行なし or 不正値で COMMAND_ERROR
- [ ] impl.md が存在しない場合に COMMAND_ERROR
- [ ] DONE 時に implReviewSha256 が記録される

**Verify:**
```bash
vdev impl-review --help
echo "Status: DONE" | vdev impl-review $TOPIC --stdin
grep '"status": "DONE"' docs/plans/$TOPIC/meta.json
vdev gate $TOPIC; echo $?  # 0 を期待
```

**Rollback:**
```bash
rm src/commands/impl-review.ts
git checkout HEAD -- src/cli.ts
```

**リスク:**
- DONE 判定の hash 整合性ミス
- 対策: DONE 状態での全 hash 一致テスト

---

### Task 3.6: vdev gate コマンド更新

**目的:**
v2 Gate Decision Table に対応させる

**変更範囲:**
- `src/commands/gate.ts`

**実装手順:**

1. **Step 3.6.1: evaluateGate 呼び出しを v2 対応に更新**
   - Task 2.3 で実装した gate.ts を使用

2. **Step 3.6.2: 出力メッセージを v2 Status に対応**
   gate は review 本文を解釈しないため、メッセージもその前提に揃える：
   ```typescript
   const messages: Record<string, string> = {
     DONE: 'done',
     NEEDS_INSTRUCTION: 'instruction.md not found',
     NEEDS_PLAN: 'plan.md not found',
     NEEDS_DESIGN_REVIEW: 'design-review.md not found',
     DESIGN_APPROVED: 'ready to implement',
     IMPLEMENTING: 'implementing',
     NEEDS_IMPL_REPORT: 'impl.md not found',
     NEEDS_IMPL_REVIEW: 'impl-review.md not found',
     REJECTED: 'rejected',
     BROKEN_STATE: 'broken state',
   };
   ```

**完了条件 (DoD):**
- [ ] gate コマンドが全 v2 Status を正しく判定する
- [ ] 各 Status に対応した exit code で終了する
- [ ] 出力メッセージが適切

**Verify:**
```bash
# 各状態でのテスト
vdev gate $TOPIC
echo $?
```

**Rollback:**
```bash
git checkout HEAD -- src/commands/gate.ts
```

**リスク:** Task 2.3 依存

---

### Task 3.7: vdev ls コマンド更新

**目的:**
v2 Status を正しく表示する

**変更範囲:**
- `src/commands/ls.ts`

**実装手順:**

1. **Step 3.7.1: 全 v2 Status の表示対応**
   - v1 で表示していた APPROVED → v2 では DONE など

2. **Step 3.7.2: schemaVersion 1 の topic はスキップまたは警告表示**
   ```typescript
   if (meta.schemaVersion === 1) {
     console.log(`REPO=${repo}\t${topic}\tV1_SCHEMA\t-\t-`);
     continue;
   }
   ```

**完了条件 (DoD):**
- [ ] 全 v2 Status が正しく表示される
- [ ] schemaVersion 1 の topic が識別可能

**Verify:**
```bash
vdev ls
```

**Rollback:**
```bash
git checkout HEAD -- src/commands/ls.ts
```

**リスク:** 低

---

### Task 3.8: vdev run 削除

**目的:**
v2 で廃止された run コマンドを削除する（review コマンドは継続利用）

**変更範囲:**
- `src/commands/run.ts` (削除)
- `src/cli.ts`

**実装手順:**

1. **Step 3.8.1: run.ts 削除**
   ```bash
   rm src/commands/run.ts
   ```

2. **Step 3.8.2: cli.ts から run コマンド登録を削除**
   - `vdev run` の登録削除のみ
   - `vdev review` は継続利用（Task 3.2 で v2.0 仕様に拡張）

**完了条件 (DoD):**
- [ ] run.ts が存在しない
- [ ] `vdev run` で "unknown command" エラー
- [ ] `vdev review` は引き続き動作する

**Verify:**
```bash
! ls src/commands/run.ts 2>/dev/null
vdev run test 2>&1 | grep -q "unknown command"
vdev review --help  # 正常動作を確認
```

**Rollback:**
```bash
git checkout HEAD -- src/commands/run.ts src/cli.ts
```

**リスク:** 低

---

### Task 3.9: vdev instruction コマンド更新

**目的:**
前提条件チェックを追加する

**変更範囲:**
- `src/commands/instruction.ts`

**実装手順:**

1. **Step 3.9.1: 前提条件チェック追加**
   ```typescript
   // v2: NEEDS_INSTRUCTION のみ許可
   if (meta.status !== 'NEEDS_INSTRUCTION') {
     console.error(`ERROR: Cannot save instruction in ${meta.status} status`);
     process.exit(ExitCode.COMMAND_ERROR);
   }
   ```

**完了条件 (DoD):**
- [ ] NEEDS_INSTRUCTION 以外からの実行で COMMAND_ERROR

**Verify:**
```bash
# NEEDS_PLAN 状態で instruction 実行 → エラー
vdev instruction $TOPIC --stdin <<< "test"
echo $?  # 1 を期待
```

**Rollback:**
```bash
git checkout HEAD -- src/commands/instruction.ts
```

**リスク:** 低

---

## Epic 4: Test Suite Updates

**目的:** v2.0.0 の全機能をテストでカバーする

---

### Task 4.1: Status Enum & Exit Code テスト

**目的:**
新しい Status と Exit Code の対応をテストする

**変更範囲:**
- `test/errors.test.ts` (新規または更新)

**実装手順:**

1. **Step 4.1.1: 全 Status → Exit Code マッピングテスト**
   ```typescript
   describe('statusToExitCode', () => {
     it('DONE → 0', () => { ... });
     it('NEEDS_INSTRUCTION → 10', () => { ... });
     it('NEEDS_PLAN → 11', () => { ... });
     it('NEEDS_DESIGN_REVIEW → 12', () => { ... });
     it('DESIGN_APPROVED → 13', () => { ... });
     it('IMPLEMENTING → 14', () => { ... });
     it('NEEDS_IMPL_REPORT → 15', () => { ... });
     it('NEEDS_IMPL_REVIEW → 16', () => { ... });
     it('REJECTED → 17', () => { ... });
     it('BROKEN_STATE → 20', () => { ... });
   });
   ```

**完了条件 (DoD):**
- [ ] 全 Status のテストが存在する
- [ ] 全テストが pass する

**Verify:**
```bash
npm run test -- --grep "statusToExitCode"
```

**Rollback:**
```bash
git checkout HEAD -- test/errors.test.ts
```

**リスク:** 低

---

### Task 4.2: Gate Logic テスト更新

**目的:**
v2 Gate Decision Table の全優先度をテストする

**変更範囲:**
- `test/gate.test.ts`

**実装手順:**

1. **Step 4.2.1: 各優先度のテストケース作成（vdev-spec.md セクション8 準拠）**
   gate は meta.status / ファイル存在 / hash のみで判定（review 本文は解釈しない）：
   - Priority 1: meta.json 不正 → BROKEN_STATE
   - Priority 2: status in (DONE, REJECTED) かつ hash 不一致 → BROKEN_STATE
   - Priority 3: instruction.md なし → NEEDS_INSTRUCTION
   - Priority 4: plan.md なし → NEEDS_PLAN
   - Priority 5: design-review.md なし → NEEDS_DESIGN_REVIEW
   - Priority 6: status=REJECTED → REJECTED
   - Priority 7: status=DESIGN_APPROVED → DESIGN_APPROVED
   - Priority 8: status=IMPLEMENTING かつ impl.md なし → NEEDS_IMPL_REPORT
   - Priority 9: status=IMPLEMENTING かつ impl-review.md なし → NEEDS_IMPL_REVIEW
   - Priority 10: status=NEEDS_IMPL_REVIEW → NEEDS_IMPL_REVIEW
   - Priority 11: status=DONE かつ hash 一致 → DONE
   - Priority 12: その他 → BROKEN_STATE

2. **Step 4.2.2: エッジケーステスト**
   - 部分的な hash 不一致（1つだけ不一致）
   - 空ファイルの存在チェック

**完了条件 (DoD):**
- [ ] 全 12 優先度のテストが存在する
- [ ] エッジケースがカバーされている
- [ ] 全テストが pass する

**Verify:**
```bash
npm run test -- --grep "gate"
```

**Rollback:**
```bash
git checkout HEAD -- test/gate.test.ts
```

**リスク:**
- テストケース漏れ
- 対策: 優先度×条件のマトリクス表から生成

---

### Task 4.3: コマンド統合テスト更新

**目的:**
v2 コマンドの統合テストを作成する

**変更範囲:**
- `test/commands.test.ts`

**実装手順:**

1. **Step 4.3.1: コマンドのテスト追加/更新**
   - review コマンド（v2.0 拡張）
   - start コマンド（新規）
   - impl コマンド（新規）
   - impl-review コマンド（新規）

2. **Step 4.3.2: 前提条件違反テスト**
   ```typescript
   describe('precondition violations', () => {
     it('plan in IMPLEMENTING status → COMMAND_ERROR', () => { ... });
     it('review in NEEDS_PLAN status → COMMAND_ERROR', () => { ... });
     it('start in NEEDS_DESIGN_REVIEW status → COMMAND_ERROR', () => { ... });
     it('impl in DESIGN_APPROVED status → COMMAND_ERROR', () => { ... });
     it('impl-review in IMPLEMENTING status → COMMAND_ERROR', () => { ... });
   });
   ```

3. **Step 4.3.3: 状態不変テスト**
   ```typescript
   describe('state invariants', () => {
     it('precondition violation does not change state', () => {
       // 実行前の meta を記録
       // COMMAND_ERROR になるコマンドを実行
       // 実行後の meta が変わっていないことを確認
     });
   });
   ```

4. **Step 4.3.4: 廃止コマンドの不存在テスト**
   ```typescript
   it('vdev run command does not exist', () => { ... });
   // review は継続利用のためテスト対象外
   ```

**完了条件 (DoD):**
- [ ] 新コマンドの正常系テストが存在する
- [ ] 前提条件違反時に状態が変わらないことが確認できる
- [ ] 全テストが pass する

**Verify:**
```bash
npm run test -- --grep "commands"
```

**Rollback:**
```bash
git checkout HEAD -- test/commands.test.ts
```

**リスク:**
- 統合テストの実行時間増加
- 対策: テスト並列化の検討

---

### Task 4.4: E2E ワークフローテスト

**目的:**
v2 の完全なワークフローを通しでテストする

**変更範囲:**
- `test/e2e.test.ts` (新規)

**実装手順:**

1. **Step 4.4.1: Happy Path テスト**
   ```typescript
   describe('v2 happy path', () => {
     it('completes full workflow from new to DONE', async () => {
       // vdev new
       // vdev instruction
       // vdev plan
       // vdev review (Status: DESIGN_APPROVED)
       // vdev start
       // vdev impl
       // vdev impl-review (Status: DONE)
       // vdev gate → exit 0
     });
   });
   ```

2. **Step 4.4.2: NEEDS_CHANGES フローテスト（v2 仕様準拠）**
   ```typescript
   it('handles design NEEDS_CHANGES → NEEDS_PLAN', () => { ... });
   it('handles impl NEEDS_CHANGES → IMPLEMENTING', () => { ... });
   it('handles design REJECTED → REJECTED', () => { ... });
   ```

3. **Step 4.4.3: Re-iteration フローテスト**
   ```typescript
   it('allows plan update (resets to NEEDS_DESIGN_REVIEW)', () => { ... });
   it('allows impl update (resets to NEEDS_IMPL_REVIEW)', () => { ... });
   ```

**完了条件 (DoD):**
- [ ] 完全な Happy Path が通る
- [ ] Rejection フローが正しく動作する
- [ ] 再イテレーションフローが正しく動作する

**Verify:**
```bash
npm run test -- --grep "e2e"
```

**Rollback:**
```bash
rm test/e2e.test.ts
```

**リスク:**
- テスト環境のセットアップ/クリーンアップ
- 対策: 各テスト前後で topic を削除

---

## Epic 5: Version & Package Update

**目的:** バージョン番号とパッケージ情報を更新する

---

### Task 5.1: package.json バージョン更新

**目的:**
パッケージバージョンを v2.0.0 に更新する

**変更範囲:**
- `package.json`

**実装手順:**

1. **Step 5.1.1: version フィールド更新**
   ```json
   "version": "2.0.0"
   ```

**完了条件 (DoD):**
- [ ] version が 2.0.0 になっている

**Verify:**
```bash
grep '"version": "2.0.0"' package.json
```

**Rollback:**
```bash
git checkout HEAD -- package.json
```

**リスク:** 低

---

### Task 5.2: ビルド & 全テスト実行

**目的:**
最終的なビルドとテストの成功を確認する

**変更範囲:**
- なし（検証のみ）

**実装手順:**

1. **Step 5.2.1: クリーンビルド**
   ```bash
   rm -rf dist/
   npm run build
   ```

2. **Step 5.2.2: 全テスト実行**
   ```bash
   npm run test
   ```

3. **Step 5.2.3: CLI 動作確認**
   ```bash
   vdev --version  # 2.0.0 を出力
   vdev --help     # 新コマンドが表示される
   ```

**完了条件 (DoD):**
- [ ] ビルドが成功する
- [ ] 全テストが pass する
- [ ] CLI が正しく動作する

**Verify:**
```bash
npm run build && npm run test && vdev --version
```

**Rollback:** N/A（検証のみ）

**リスク:**
- テスト漏れによる本番障害
- 対策: E2E テストで主要フローを網羅

---

## Implementation Order

依存関係を考慮した実装順序:

```
Phase 1: Specification (Epic 1)
  └─ Task 1.1 → Task 1.2 → Task 1.3

Phase 2: Core Modules (Epic 2)
  └─ Task 2.1 → Task 2.2 → Task 2.4 → Task 2.3

Phase 3: Commands (Epic 3)
  ├─ Task 3.1 (plan 更新)
  ├─ Task 3.9 (instruction 更新)
  ├─ Task 3.8 (run 削除)
  │   ↓
  ├─ Task 3.2 (review v2.0 拡張)
  ├─ Task 3.3 (start 新規)
  ├─ Task 3.4 (impl 新規)
  ├─ Task 3.5 (impl-review 新規)
  │   ↓
  ├─ Task 3.6 (gate 更新)
  └─ Task 3.7 (ls 更新)

Phase 4: Tests (Epic 4)
  └─ Task 4.1 → Task 4.2 → Task 4.3 → Task 4.4

Phase 5: Release (Epic 5)
  └─ Task 5.1 → Task 5.2
```

---

## Risk Summary

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| 仕様の曖昧さ | High | Medium | 状態遷移図とマトリクスで明確化 |
| Exit Code 衝突 | High | Low | v1/v2 対応表で意図的変更を確認 |
| Gate 優先度ミス | High | Medium | 全パターンの E2E テスト |
| 前提条件チェック漏れ | High | Medium | Status × Command マトリクステスト |
| v1 topic 誤処理 | Medium | Low | schemaVersion チェックを入口で実施 |

---

## Appendix A: State Transition Diagram

```
NEEDS_INSTRUCTION
    │ vdev instruction
    ▼
NEEDS_PLAN ◄───────────────────────────────┐
    │ vdev plan                            │
    ▼                                      │
NEEDS_DESIGN_REVIEW                        │
    │ vdev review                          │
    ├─── Status: DESIGN_APPROVED ──►DESIGN_APPROVED
    │                                   │ vdev start
    │                                   ▼
    ├─── Status: NEEDS_CHANGES ─────►[NEEDS_PLAN へ戻る]
    │                                   │
    │                              IMPLEMENTING ◄──────┐
    │                                   │              │
    │                                   │ vdev impl    │
    │                                   ▼              │
    │                              NEEDS_IMPL_REVIEW   │
    │                                   │              │
    │                                   │ vdev impl-review
    │                                   ├── Status: DONE ──►[END]
    │                                   │              │
    │                                   └── Status: NEEDS_CHANGES
    │                                          ↓       │
    │                                   [IMPLEMENTING へ戻る]
    │
    └─── Status: REJECTED ──────────►REJECTED
```

---

## Appendix B: File Changes Summary

### New Files
- `src/commands/start.ts`
- `src/commands/impl.ts`
- `src/commands/impl-review.ts`
- `test/e2e.test.ts`

### Deleted Files
- `src/commands/run.ts`

### Modified Files
- `docs/vdev-spec.md` (全面改訂)
- `docs/ops.md` (全面改訂)
- `docs/rollback.md` (更新)
- `src/core/errors.ts`
- `src/core/meta.ts`
- `src/core/gate.ts`
- `src/core/hashes.ts`
- `src/core/paths.ts`
- `src/commands/plan.ts`
- `src/commands/instruction.ts`
- `src/commands/review.ts` (v2.0 仕様に拡張)
- `src/commands/gate.ts`
- `src/commands/ls.ts`
- `src/cli.ts`
- `test/gate.test.ts`
- `test/commands.test.ts`
- `package.json`
