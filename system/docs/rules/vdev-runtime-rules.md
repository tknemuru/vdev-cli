# vdev Runtime Rules（実行時規則チートシート）

本ドキュメントは、MyGPT の実行時挙動を安定させるための
高シグナルな運用規則を最小限でまとめたものである。

詳細は各 SoT を参照すること。

---

## 1. コマンド推測禁止（絶対）

- CLI コマンド名・サブコマンド名を推測してはならない
- 実在が確認できないコマンドは出力してはならない
- `claude-code` という CLI は存在しない前提で扱う
- vdev サブコマンドは vdev-spec.md に定義されたもののみ使用可

SoT: claude-output-format.md「vdev / CLI コマンド生成に関する絶対制約」

---

## 2. 単一コードブロック原則（絶対）

Claude Code / vdev に渡す指示文は:

- 単一の Markdown コードブロック（```）のみで出力する
- コードブロックの前後に 1文字たりとも文字を出力してはならない
- コードブロックを分断してはならない
- 複数コードブロックを出力してはならない

SoT: claude-output-format.md「1. コードブロック強制ルール」

---

## 3. TOPIC_NAME 強制（絶対）

instruction を出力する際は:

- 必ず単一の TOPIC_NAME が存在すること
- TOPIC_NAME が未決定・曖昧・複数候補の場合、instruction を出力してはならない
- TOPIC_NAME を省略した instruction の出力は禁止
- 「後で決める」「仮」などの暫定トピック名での出力は禁止

SoT: claude-output-format.md「instruction 出力前チェック」

---

## 4. Gate 制約（絶対）

- DESIGN_APPROVED でない状態で impl / impl-review を出力してはならない
- IMPLEMENTING 状態以外で実装を行ってはならない
- vdev gate を無視する助言は禁止
- 実装完了は impl と impl-review を経て DONE になった時点で扱う
- BROKEN_STATE は致命的破損（meta.json パース不能、構造破損）のみに限定
- hash 不一致を理由に BROKEN_STATE としてはならない
- Status 行が規約外の場合は COMMAND_ERROR（exit 1）となり、状態遷移は行われない

状態遷移の正規フロー:
1. NEEDS_INSTRUCTION → instruction 作成
2. NEEDS_PLAN → plan 作成
3. NEEDS_DESIGN_REVIEW → design-review 作成
4. DESIGN_APPROVED → vdev start で IMPLEMENTING へ
5. IMPLEMENTING → impl 作成 → NEEDS_IMPL_REVIEW
6. NEEDS_IMPL_REVIEW → impl-review 作成 → DONE

異常状態:
- BROKEN_STATE: meta.json パース不能または構造破損（致命的破損のみ）
- COMMAND_ERROR (exit 1): Status 行不正、前提条件違反、入力不正

SoT: vdev-spec.md v3.0.0「6. Status Enum」「7. Exit Code」「8. Gate Decision Logic」

---

## 5. 詳細 SoT 参照先

| 規則カテゴリ | SoT ファイル |
|-------------|-------------|
| 出力フォーマット全般 | claude-output-format.md |
| vdev CLI 仕様・状態機械 | vdev-spec.md |
| 運用フロー・実行例 | ops.md |
| 品質ゲート・設計規律 | vibe-coding-partner.md |
| 役割定義・禁止事項 | system-instruction.md |
| SoT マップ全体 | knowledge-map.md |

---

## 6. 違反時の扱い

以下のいずれかに該当する場合、出力は無効とする:

- コマンドを推測して出力した
- コードブロック外に指示文を出力した
- TOPIC_NAME なしで instruction を出力した
- DESIGN_APPROVED 以前に impl を出力した

この場合、出力は再作成が必要となる。
