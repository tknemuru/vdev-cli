# Design Review: vdev Monorepo System Registry

## Attempt #1

**Date**: 2026-01-26
**Reviewer**: Claude (Reviewer role)
**Target**: plan.md

---

## Guard（規約・安全）

### チェック項目

| 項目 | 結果 | 根拠 |
|-----|------|------|
| vdev フロー準拠 | PASS | NEEDS_DESIGN_REVIEW 状態で plan.md が存在する |
| 必須ドキュメント更新要否の明示 | PASS | plan.md に「必須ドキュメント更新要否」セクションあり |
| スコープ明確性 | PASS | In-Scope / Out-of-Scope が明示されている |
| Risk Assessment 明示 | PASS | R2 として明示されている |

**Guard 判定**: PASS

---

## Verifier（検証可能性）

### Verify 項目の評価

| Verify 項目 | 具体性 | 再現可能性 | 判定 |
|------------|--------|-----------|------|
| 構造確認（ls -la, ls -R） | 具体的 | 再現可能 | PASS |
| CLI 動作確認（npm run build && npm test） | 具体的 | 再現可能 | PASS |
| sync コマンド確認（vdev sync --force） | 具体的 | 再現可能 | PASS |
| new コマンド確認（vdev new test-topic --force） | 具体的 | 再現可能 | PASS |
| 既存機能回帰確認（vdev ls, vdev gate） | 具体的 | 再現可能 | PASS |

### DoD の評価

| DoD 項目 | 検証方法の有無 | 判定 |
|---------|--------------|------|
| 第一階層が cli/ system/ evals/ | ls コマンドで確認 | PASS |
| system/docs/ に SoT 配置 | ls -R で確認 | PASS |
| registry manifest 存在 | ls で確認 | PASS |
| vibe-coding-partner.md が manifest に明示 | ファイル内容確認で検証可能 | PASS |
| vdev sync/new が ai-resources 非参照 | sync --force 実行で確認 | PASS |
| cli/ops.md 存在と内容最新化 | ファイル存在と内容確認で検証可能 | PASS |
| 不要ファイル非移植 | find コマンドで確認可能 | PASS |
| 既存コマンド回帰なし | vdev ls, vdev gate で確認 | PASS |
| リポジトリ名リネーム | GitHub 上で確認 | PASS |

**Verifier 判定**: PASS

---

## Critic（欠陥抽出）

### 検出事項

| ID | 重要度 | 指摘内容 | 反証（失敗すると何が起きるか） |
|----|--------|---------|---------------------------|
| C1 | MINOR | docs/plans/ の移設先が不明確。cli/ に入れるのか、ルートに残すのか | plan.md では言及なし。ルートに残すと推測されるが、第一階層の「cli/ system/ evals/」制約と矛盾する可能性 |
| C2 | MINOR | CLAUDE.md のルート配置が言及されていない | 現在ルートに CLAUDE.md が配置されているが、移設後の配置先が不明。vdev sync が参照するターゲット先の仕様が欠落 |
| C3 | MINOR | npm link や global install の扱いが不明 | cli/ 配下に移設後、vdev コマンドのパスが変わる可能性。既存の npm link 設定が壊れるリスク |
| C4 | INFO | .gitignore の移設が言及されていない | 現在ルートにある .gitignore の扱いが不明 |

### BLOCKER 判定

**BLOCKER 件数**: 0

### 反証（失敗シナリオ）

1. **docs/plans/ のパス解決失敗**: plan.md に docs/plans/ の移設先が明示されていないため、実装時に vdev gate が docs/plans/ を見つけられず BROKEN_STATE になる可能性がある。ただし instruction.md の「第一階層を `cli/ system/ evals/` に統一」という記述から、docs/plans/ はルートに残り、これらと共存する設計と解釈できる。

2. **vdev sync のターゲット先不整合**: plan.md の「変更」セクションに CLAUDE.md のルート配置維持が明示されていない。claudeMdSync.ts の変更により、CLAUDE.md の配布先パスが変わると既存の vdev フローが壊れる。ただし plan.md の Phase 5 で「エラーメッセージ・ヒント文言を更新」とあり、配布先は現状維持（ルート）と推測できる。

**Critic 判定**: PASS（BLOCKER 0 件、反証 2 件以上）

---

## 総合判定

| 視点 | 判定 |
|------|------|
| Guard | PASS |
| Verifier | PASS |
| Critic | PASS |

**最終判定**: PASS

---

Status: DESIGN_APPROVED

### 承認理由

1. Guard: vdev フロー準拠、必須ドキュメント更新要否の明示、スコープ・リスク明確
2. Verifier: 全 Verify 項目が具体的かつ再現可能、DoD が検証可能
3. Critic: BLOCKER 0 件、反証 2 件を抽出し探索完了

### 注意事項（impl.md への申し送り）

- C1, C2 について、実装時に docs/plans/ と CLAUDE.md の配置先を明確にすること
- npm link の再設定が必要な場合は impl.md に手順を記載すること
