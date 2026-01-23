Status: DONE

## Attempt 1

### Summary

ops.md の全面改稿が完了した。plan.md の DoD 5 項目すべてを満たしている。

### Evaluation

| DoD 項目 | 確認結果 |
|---------|----------|
| 状態駆動（gate → allowed actions）の構成 | ✅ セクション 2 で 10 状態すべてを網羅 |
| 特定の役割名・登場人物名・プロセス名が書かれていない | ✅ "claude code", "human", "reviewer", "chatgpt" の言及なし |
| Step 番号ベースの章立てが存在しない | ✅ `^### Step [0-9]` にマッチなし |
| vdev-spec.md の状態機械・コマンド仕様と矛盾がない | ✅ 全 10 状態と Exit Code が vdev-spec.md と一致 |
| フロー仕様変更を想定しても ops.md の内容が破綻しない構造 | ✅ フロー仕様への依存を排除、参照先のみ記載 |

### Verify

```bash
# 役割名が含まれていないことを確認
grep -i -E "\b(claude code|human|reviewer|chatgpt)\b" docs/ops.md || echo "OK"

# Step 番号構造がないことを確認
grep -E "^### Step [0-9]" docs/ops.md || echo "OK"

# 排他的表現がないことを確認
grep -i -E "(公式フロー|唯一)" docs/ops.md || echo "OK"
```

### Requests

なし

### Rollback

```bash
git checkout HEAD -- docs/ops.md
```
