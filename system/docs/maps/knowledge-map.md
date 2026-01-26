# Knowledge Map（SoT マップ）

本ドキュメントは、MyGPT「バイブコーディングパートナー」の Knowledge 体系における
Single Source of Truth（SoT）を定義する。

各規範は 1つの権威ファイルを持ち、他ドキュメントは参照として機能する。

---

## 0. 特殊な位置づけのドキュメント

### system-instruction.md

| 項目 | 内容 |
|-----|------|
| 種別 | 仮想ドキュメント（MyGPT System Instruction 用） |
| 実体 | MyGPT UI への手動貼り付け |
| SoT | 本リポジトリ管理版 |
| 配置 | vibe-coding-partner/system-instruction.md |

特記事項:
- リポジトリ上で実行・参照される設定ファイルではない
- Claude Code から直接参照されることはない
- knowledges/ 配下の実ファイルとは異なる位置づけ
- 本リポジトリではバージョン管理・レビュー・整合確認目的で管理

---

## 1. SoT 宣言一覧

### 1.1 出力フォーマット（Claude 向け指示の包み方）

SoT: claude-output-format.md

責務:
- 単一コードブロック原則
- ブロック外テキスト禁止
- cat << 'EOF' | vdev ... --stdin 形式
- コマンド推測禁止
- TOPIC_NAME 強制ルール

参照元:
- system-instruction.md（憲法として要約を記載、詳細は本 SoT を参照）

---

### 1.2 vdev CLI 仕様

SoT: vdev-spec.md (version: 3.0.0)

責務:
- vdev コマンド体系（new / instruction / plan / review / start / impl / impl-review / gate / ls）
- 状態機械（Status Enum）
- Gate Decision Table
- meta.json スキーマ
- Exit Code 定義

参照元:
- claude-output-format.md（vdev の前提モデルとして要約、詳細は本 SoT を参照）
- vibe-coding-partner.md（vdev 運用統合として要約、詳細は本 SoT を参照）

---

### 1.3 ops レシピ・テンプレート

SoT: ops.md

責務:
- Daily Workflow（DONE までの公式フロー）
- Review Loop（差戻しの往復）
- 実行例・コマンドサンプル
- Best Practices

参照元:
- vdev-cli-cheatsheet.md（最小抜粋、詳細は本 SoT を参照）

---

### 1.4 品質ゲート・設計規律

SoT: vibe-coding-partner.md

責務:
- Gate 1-5（テスト作成、Doc コメント日本語、ドキュメント成果物、Task 完了時自己点検）
- 推論品質プロトコル
- 曖昧さ解消・合意形成プロトコル
- Plan 設計プロトコル
- 出力ボリューム制御

重要規範:
- Doc コメントはすべて日本語で記載する（Gate 3）
- 目的 / 入力 / 出力 / 失敗条件 / 不変条件を含める

参照元:
- なし（本ファイルが唯一の SoT）

---

### 1.5 役割定義・禁止事項

SoT: system-instruction.md（MyGPT System Instruction 管理版）

責務:
- AI協業アーキテクト兼 Vibe Coding プランナーの役割定義
- 実装ツール方針（Claude Code のみ）
- 基本哲学
- 禁止事項（コード直接生成、vdev gate 軽視、他ツール前提等）
- 外部ルール参照の強制

参照元:
- vibe-coding-partner.md（運用規約として同内容を記載していたが、参照に置換）

注意:
- 本ファイルは仮想ドキュメントであり、MyGPT UI に手動貼り付けして使用
- knowledges/ 配下の実ファイルとは異なる位置づけ

---

### 1.6 スラッシュコマンド方式

SoT: system-instruction.md（スラッシュコマンド方式 セクション）

責務:
- /pre, /topic, /inst, /rplan, /rimpl の仕様定義
- スラッシュコマンドによる状態機械トリガー
- 出力形式の機械的強制（Status 行含む）
- 推測・暗黙判定の禁止

参照元:
- vdev-cli-cheatsheet.md（ラッパー形式の詳細として参照）

---

### 1.7 必須ドキュメント規範

SoT: vibe-coding-partner.md

責務:
- 必須ドキュメント定義（spec.md / ops.md / arch.md）
- DB ドキュメントルール
- 新規システム開発ルール
- 改修時ルール（Plan での更新要否明示）
- Design Review ゲートルール（差戻し条件）

参照元:
- CLAUDE.md（実行時指示として要約を記載、詳細は本 SoT を参照）

---

### 1.8 vdev フロー定義（運用仕様）

SoT: vdev-flow.md

追従: vdev-spec.md v3.0.0

補足:
- meta.json は派生キャッシュであり、正本ファイル群から導出される
- この規範の詳細は vdev-flow.md セクション 0.2 / 4.1 を参照

責務:
- vdev フローの正式運用仕様
- 役割定義（Human / Implementer / Reviewer）
- レビュープロセス（Plan Review / Design Review / Impl Review）
- Canonical（正本）と Attempts（履歴）の管理
- Risk Policy と Human Intervention
- Merge Policy（GitHub/GitLab）
- Quality Bar（Checklist / DoD / Verify / Rollback）

参照元:
- system-instruction.md（vdev フロー定義の SoT 参照として記載）
- CLAUDE.md（実行時の vdev フロー前提として参照）

注意:
- vdev-spec.md は CLI 仕様のみを司り、運用フローは本 SoT を参照すること
- ops.md と矛盾する場合は本 SoT（vdev-flow.md）が優先される

---

## 2. 競合時の優先順位

規範が複数ファイルで言及されている場合、以下の優先順位で解決する。

1. system-instruction.md（憲法・最上位、MyGPT System Instruction として機能）
2. vdev-flow.md（vdev 運用・役割・レビュー・フロー定義の正）
3. vdev-spec.md（vdev CLI 仕様の唯一の正）
4. claude-output-format.md（出力形式の唯一の正）
5. vibe-coding-partner.md（品質ゲート・設計規律の正）
6. ops.md（運用レシピの正）

原則:
- 上位ファイルの規範が下位と矛盾する場合、上位が勝つ
- ただし、各ファイルは自身の責務範囲において SoT として機能する
- 責務範囲外の詳細は該当 SoT を参照すること

vdev 関連の競合解決:
- vdev 運用・役割・レビュー・フロー定義 → vdev-flow.md が正
- vdev CLI 仕様（コマンド・状態機械・Exit Code） → vdev-spec.md が正
- ops.md と vdev-flow.md が矛盾する場合 → vdev-flow.md が優先

---

## 3. ルールファミリ対応表

| ルールファミリ | 権威ファイル（SoT） | セクション |
|---------------|-------------------|-----------|
| 役割定義 | system-instruction.md | 役割定義（最上位・強制） |
| 実装ツール方針 | system-instruction.md | 実装ツール方針（絶対遵守） |
| 基本哲学 | system-instruction.md | 基本哲学（判断の拠り所） |
| 禁止事項（全般） | system-instruction.md | 禁止事項（即違反） |
| 単一コードブロック原則 | claude-output-format.md | 1. コードブロック強制ルール |
| コマンド推測禁止 | claude-output-format.md | vdev / CLI コマンド生成に関する絶対制約 |
| TOPIC_NAME 強制 | claude-output-format.md | instruction 出力前チェック |
| vdev 状態機械 | vdev-spec.md | 6. Status Enum |
| vdev コマンド仕様 | vdev-spec.md | 9. Commands |
| Gate Decision Table | vdev-spec.md | 8. Gate Decision Table |
| vdev フロー定義 | vdev-flow.md | 2. The vdev Lifecycle |
| vdev 役割定義（Human/Implementer/Reviewer） | vdev-flow.md | 3. Roles and Responsibilities |
| vdev レビュープロセス | vdev-flow.md | 5. Review Process |
| vdev Merge Policy | vdev-flow.md | 11. Merge Policy |
| vdev Risk Policy | vdev-flow.md | 7. Risk Policy and Human Intervention |
| vdev Quality Bar | vdev-flow.md | 8. Quality Bar |
| テスト作成（Gate 1） | vibe-coding-partner.md | 品質ゲート - Gate 1 |
| Doc コメント日本語（Gate 3） | vibe-coding-partner.md | 品質ゲート - Gate 3 |
| Plan 設計プロトコル | vibe-coding-partner.md | Plan 設計プロトコル |
| Daily Workflow | ops.md | 1. Daily Workflow |
| Review Loop | ops.md | 2. Review Loop |
| スラッシュコマンド方式 | system-instruction.md | スラッシュコマンド方式（最上位・強制） |
| 必須ドキュメント定義 | vibe-coding-partner.md | 必須ドキュメント規範 |
| DB ドキュメントルール | vibe-coding-partner.md | 必須ドキュメント規範 - DB ドキュメントルール |
| 改修時更新要否明示 | vibe-coding-partner.md | 必須ドキュメント規範 - 改修時ルール |
| 必須ドキュメント差戻しゲート | vibe-coding-partner.md | 必須ドキュメント規範 - Design Review ゲートルール |

---

## 4. 追跡可能性の保証

本マップにより、任意の規範について以下が追跡可能である:

1. その規範の SoT はどのファイルか
2. そのファイルのどのセクションに記載されているか
3. 他ファイルで言及されている場合、それは参照か SoT か

検証方法:
- grep で規範キーワードを検索
- 本マップの対応表と照合
- SoT 以外の箇所が「参照」形式になっていることを確認

---

## 5. 本ドキュメントの位置づけ

- 本ドキュメントは Knowledge として管理される
- 新規規範追加時は本マップを更新すること
- SoT の変更は本マップへの反映を必須とする
