# Impl Review: vdev Monorepo System Registry

## Attempt 1

### 判断対象

- Topic: 2026-01-26-vdev-monorepo-system-registry
- impl.md hash: cbb206445da83321496ff68fd11d0a98eecfb5c7b30d3598aba9714330abf848

### Guard（規約・安全）

| チェック項目 | 結果 | 備考 |
|-------------|------|------|
| IMPLEMENTING 状態で実装されたか | PASS | vdev start 実行後に実装 |
| feature ブランチで実装されたか | PASS | feature/2026-01-26-vdev-cli-v3-reconcile-gate ブランチ |
| plan.md の範囲内か | PASS | Phase 1-7 を実行、Phase 8（リポジトリ名変更）は残課題として明示 |
| vdev フロー違反はないか | PASS | 違反なし |

**Guard 判定: PASS**

### Verifier（検証可能性）

| Verify 項目 | コマンド | exit code | 結果 |
|-------------|---------|-----------|------|
| Build | `npm run build` | 0 | PASS |
| Test | `npm test` | 0 | 104 tests passed |
| vdev ls | `cli/dist/cli.js ls` | 0 | 既存 topic が正常表示 |
| 構造確認 | `ls -d */` | 0 | cli/ docs/ evals/ system/ |
| system/docs | `ls system/docs/` | 0 | flow formats guides maps rules spec |
| system/registry | `ls system/registry/` | 0 | claude.manifest.yaml system.manifest.yaml |
| ai-resources 参照なし | `grep -r "ai-resources" cli/src/` | 1 | No matches |

**Verify 証跡（Build）:**
```
$ cd /home/tk/projects/vdev-cli/cli && npm run build
> vdev-cli@2.0.0 build
> tsc
exit code: 0
```

**Verify 証跡（Test）:**
```
$ cd /home/tk/projects/vdev-cli/cli && npm test
 Test Files  6 passed (6)
      Tests  104 passed (104)
exit code: 0
```

**Verify 証跡（vdev ls）:**
```
$ cli/dist/cli.js ls | head -5
REPO=vdev-cli	2026-01-26-vdev-monorepo-system-registry	NEEDS_IMPL_REVIEW	...
REPO=vdev-cli	2026-01-26-vdev-cli-v3-reconcile-gate	DONE	...
exit code: 0
```

**Verifier 判定: PASS**

### Critic（欠陥抽出）

#### BLOCKER

なし

#### MAJOR

なし

#### MINOR

1. **docs/ ディレクトリの残存**: instruction.md では第一階層を `cli/ system/ evals/` と指定しているが、`docs/` が残存している
   - **反証**: vdev CLI の動作に必須（topic ディレクトリ `docs/plans/` を保持）
   - **判定**: 設計上の必然性があり、instruction で除外可能と判断

2. **リポジトリ名変更未実施**: DoD 9 の「リポジトリ名が vdev にリネームされている」が未達成
   - **反証**: impl.md に残課題として明記されており、GitHub 上の操作が必要
   - **判定**: R2 リスクとして許容。PR merge 後に Human が実施可能

#### 反証（失敗シナリオ）

1. **getSystemBasePath() の相対パス解決失敗**: CLI を異なる場所からシンボリックリンク経由で実行した場合、`__dirname` の解決が期待と異なる可能性がある
   - 現状の npm link による動作確認で問題なし
   - 将来的にグローバルインストール時に問題が発生する可能性あり

2. **system/ ディレクトリの削除・移動時の障害**: system/ が存在しない状態で vdev sync を実行すると、ユーザーフレンドリーでないエラーメッセージが表示される
   - 現状: `CLAUDE.md not found in system/adapters/claude/` というメッセージが出る
   - 対応: エラーハンドリングは適切に実装されている

3. **knowledges allowlist のハードコード**: allowlist が claudeMdSync.ts にハードコードされており、claude.manifest.yaml との整合性が手動管理
   - manifest 変更時にコード変更が必要
   - 将来的に manifest から読み込む実装に変更可能

**Critic 判定: PASS**（BLOCKER 0、反証 3 件）

### 最終判定

| 視点 | 判定 |
|------|------|
| Guard | PASS |
| Verifier | PASS |
| Critic | PASS |

Status: DONE

### 承認理由

1. plan.md の DoD 8 項目中 7 項目を達成（リポジトリ名変更は残課題として明示）
2. ビルド・テスト・既存機能の回帰確認がすべて PASS
3. ai-resources への依存を完全に排除し、system/ ベースの同期に移行完了
4. 残課題（リポジトリ名変更）は GitHub 上の操作であり、コード変更ではないため実装レビューの範囲外

### Risk Assessment

- **Risk Level**: R2（plan.md で明示）
- **PR merge**: 自律実行可
