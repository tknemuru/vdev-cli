# 概要
本トピックでは、**正本である `system/adapters/claude/CLAUDE.md`** から
「クリップボード同期」に関する記述を削除する。

本変更は vdev フローの SoT（vdev-flow.md）に存在しない
補助的オペレーション規約を整理するものであり、
状態遷移・ゲート判定・Canonical 成果物の整合性には影響しない。

# 目的 / Outcome
- **正本である `system/adapters/claude/CLAUDE.md`** から
  クリップボード同期（clipboard sync）に関する規定を完全に除去する
- Claude Code の運用規約を SoT 準拠に簡素化する
- WSL / Windows 固有前提を排除し、環境依存の誤解を防ぐ

# スコープ
## In
- **編集対象は必ず正本である `system/adapters/claude/CLAUDE.md` とする**
- 同ファイル内の以下内容を削除する
  - 「## 11. 成果物生成後の自動処理（vdev 登録・クリップボード同期）」章 **全体**
    - plan.md / impl.md 登録後のクリップボード同期言及
    - 「11.5 クリップボード同期（Human Escalation 時のみ）」および配下すべて
    - iconv / clip.exe を用いたコマンド例
- 章削除に伴う見出し番号の詰め（後続章の番号調整）

## Out
- vdev plan / vdev impl の自動登録仕様自体の変更
- vdev CLI や SoT（vdev-flow.md）への変更
- Human Escalation Policy の内容変更
- `system/adapters/claude/CLAUDE.md` 以外のファイル編集

# 非目標（Non-Goals）
- クリップボード同期を別方式で置き換えること
- Human 共有フローの新設・拡張

# 設計判断と根拠
- クリップボード同期は SoT に定義されておらず、運用上も non-fatal / default OFF とされている
- CLAUDE.md は Claude Code 運用における正本規約であり、
  SoT と乖離する補助機構は削除した方が一貫性が高い
- 章単位で削除することで、中途半端な参照残りを防ぎ、規約の可読性を向上させる

# 変更手順（Plan レベル指示）
1. **`system/adapters/claude/CLAUDE.md`（正本）を直接編集対象として開く**
2. 以下の章を **丸ごと削除**する
   - `## 11. 成果物生成後の自動処理（vdev 登録・クリップボード同期）`
3. 削除後、後続章（12以降）の章番号を繰り上げて整合させる
4. クリップボード同期への参照が他章に残っていないことを確認する
5. 編集対象が `system/adapters/claude/CLAUDE.md` 以外になっていないことを再確認する

# Verify
- `system/adapters/claude/CLAUDE.md` 内に以下の文字列が存在しないこと
  - 「クリップボード」
  - `clip.exe`
  - `iconv -f UTF-8 -t UTF-16LE`
- 見出し番号が連番であること
- SoT（vdev-flow.md）への参照関係が変化していないこと
- 他パスの CLAUDE.md やコピーが編集されていないこと

# Rollback
- git から `system/adapters/claude/CLAUDE.md` を変更前状態に戻す
- 本トピックは文書変更のみのため、ロールバックによる副作用はない

# Risk
- R1（低）
  - 正本ドキュメント整理のみであり、実装・状態遷移への影響なし
