# Plan: CLAUDE.md からクリップボード同期記述の削除

## Summary

正本である `system/adapters/claude/CLAUDE.md` から、クリップボード同期に関する規定を完全に削除する。
これにより Claude Code 運用規約を SoT（vdev-flow.md）準拠に簡素化し、WSL/Windows 固有前提を排除する。

## 変更対象ファイル

| ファイルパス | 変更種別 |
|-------------|---------|
| system/adapters/claude/CLAUDE.md | 章削除 + 番号調整 |

## 実装手順

### Step 1: 章 11 の削除

`system/adapters/claude/CLAUDE.md` から以下の章を丸ごと削除する:

- **削除対象**: 「## 11. 成果物生成後の自動処理（vdev 登録・クリップボード同期）」
  - 201行目（`## 11. 成果物生成後の自動処理（vdev 登録・クリップボード同期）`）から
  - 323行目（次章の `---` の直前）まで

削除される内容:
- 11.1 前提条件
- 11.2 Topic 特定ルール
- 11.3 plan.md 生成後の処理
- 11.4 impl.md 生成後の処理
- 11.5 クリップボード同期（Human Escalation 時のみ）およびその配下すべて
- 11.6 Gate 失敗時の対応
- 11.7 事故防止の検証（Verify）

### Step 2: 後続章の番号調整

削除後、以下の章番号を繰り上げる:

| 旧番号 | 新番号 | 章タイトル |
|-------|-------|-----------|
| 12 | 11 | 必須ドキュメント規範（参照） |
| 13 | 12 | GitHub PR 自動作成（gh CLI） |
| 14 | 13 | Subagent 定義の参照（役割分離） |
| 15 | 14 | 自律オーケストレーション既定（vdev-flow.md 準拠） |
| 16 | 15 | Reviewer Principles |
| 17 | 16 | Canonical Artifact Integrity Rules（正本成果物の整合性規則） |

サブセクション番号も同様に調整:
- 12.x → 11.x (ただし本章はサブセクションなし)
- 13.1〜13.6 → 12.1〜12.6
- 14.1〜14.3 → 13.1〜13.3
- 15.1〜15.5 → 14.1〜14.5
- 16 → 15 (サブセクションなし)
- 17.1〜17.5 → 16.1〜16.5

### Step 3: 他章への参照確認

章番号変更に伴い、ファイル内の相互参照がないことを確認する。
（現状、番号による相互参照は確認されていない）

## DoD (Definition of Done)

1. `system/adapters/claude/CLAUDE.md` 内に以下の文字列が存在しないこと:
   - 「クリップボード」
   - `clip.exe`
   - `iconv -f UTF-8 -t UTF-16LE`

2. 見出し番号が連番（1〜16）であること

3. SoT（vdev-flow.md）への参照関係が変化していないこと

4. 編集対象が `system/adapters/claude/CLAUDE.md` のみであること

## Verify コマンド

```bash
# 1. クリップボード関連文字列の不存在確認
grep -c "クリップボード" system/adapters/claude/CLAUDE.md && echo "FAIL" || echo "PASS"
grep -c "clip.exe" system/adapters/claude/CLAUDE.md && echo "FAIL" || echo "PASS"
grep -c "iconv -f UTF-8 -t UTF-16LE" system/adapters/claude/CLAUDE.md && echo "FAIL" || echo "PASS"

# 2. 章番号の連番確認（## 1. から ## 16. まで）
grep -E "^## [0-9]+\." system/adapters/claude/CLAUDE.md

# 3. 変更ファイルの確認
git diff --name-only
```

## 必須ドキュメント更新要否

| ドキュメント | 更新要否 | 理由 |
|-------------|---------|------|
| docs/spec.md | 不要 | 外部仕様への影響なし |
| docs/ops.md | 不要 | 運用手順への影響なし |
| docs/arch.md | 不要 | 設計境界への影響なし |

本変更は Claude Code 向け規約文書の整理であり、vdev システムの仕様・運用・設計には影響しない。

## Risk Assessment

- **R1（低）**: 正本ドキュメントの整理のみであり、実装・状態遷移への影響なし
