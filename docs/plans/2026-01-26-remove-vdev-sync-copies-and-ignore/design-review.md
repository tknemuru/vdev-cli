# Design Review: vdev sync コピーを git 管理対象から除外

## Attempt 1

### Guard（規約・安全違反チェック）

| チェック項目 | 結果 | 備考 |
|-------------|------|------|
| 正本への変更はないか | PASS | system/ 配下は変更対象外 |
| SoT への変更はないか | PASS | vdev-flow.md 等の正本は変更なし |
| instruction.md のスコープ内か | PASS | sync コピーの git 管理除外のみ |
| Rollback 手順があるか | PASS | instruction.md に revert 手順明示 |

**Guard 結果**: PASS（違反 0 件）

### Verifier（証跡契約チェック）

| チェック項目 | 結果 | 備考 |
|-------------|------|------|
| Verify コマンドが具体的か | PASS | 4 つのコマンドが明示 |
| 成功/失敗の判定基準が明確か | PASS | 各コマンドの期待出力が明示 |
| 実行可能な形式か | PASS | そのまま実行可能 |

**Verifier 結果**: PASS

### Critic（欠陥探索）

#### BLOCKER

なし

#### 反証（失敗シナリオ）

1. **CLI 依存の破壊**: `cli/` 配下の sync コピー（CLAUDE.md, .claude/）が git 管理から外れることで、CLI パッケージをクローンした際に必要なファイルが欠落する可能性がある。→ vdev sync の実行が前提となるが、CI や初回セットアップで sync が実行されることを確認する必要がある。

2. **settings.local.json の誤 ignore**: .gitignore のパターン `/.claude/` が settings.local.json も含む可能性がある。settings.local.json は sync コピーではなくユーザー設定である。→ plan.md では `.claude/commands/`, `.claude/subagents/`, `.claude/knowledges/` を個別に指定しており、settings.local.json は含まれない。

3. **git rm --cached の影響範囲**: 他の開発者が pull した際に、ローカルの sync コピーが削除される。→ これは意図した動作であり、vdev sync を再実行すれば復元される。

**Critic 結果**: BLOCKER 0 件、反証 3 件

### 総合判定

| 判定基準 | 結果 |
|---------|------|
| Guard（違反 0 件） | PASS |
| Verifier（証跡契約充足） | PASS |
| Critic（BLOCKER 0 件 + 反証 2 件以上） | PASS |

Status: DESIGN_APPROVED

### 承認理由

- plan.md は instruction.md のスコープに準拠している
- sync コピーの特定が具体的で、正本は影響を受けない
- .gitignore のパターンが限定的で適切
- Verify コマンドが具体的で実行可能
- DoD が明確で検証可能
- Risk Assessment（R2）は妥当（CI 依存の可能性を考慮）
- 反証シナリオはすべて許容可能または Verify で確認可能
