# impl.md: review / impl-review ハッシュガード強化

## 変更したファイル一覧

| ファイル | 変更種別 | 内容 |
|---------|---------|------|
| src/commands/review.ts | 修正 | planSha256 null ガード追加（64-73行目） |
| src/commands/impl-review.ts | 修正 | implSha256 null ガード追加（64-73行目） |
| test/commands.test.ts | 修正 | import追加、ハッシュガードテスト2件追加 |
| test/gate.test.ts | 修正 | null hash での BROKEN_STATE テスト2件追加 |

---

## 実行した Verify コマンドと結果

### 1. 全テスト実行

```bash
npm test
```

**結果**: 99 tests passed

```
 ✓ test/sync.test.ts  (43 tests) 384ms
 ✓ test/commands.test.ts  (23 tests) 1674ms
 ✓ test/gate.test.ts  (18 tests) 754ms
 ✓ test/slug.test.ts  (9 tests) 2ms
 ✓ test/hashes.test.ts  (3 tests) 1ms
 ✓ test/normalize.test.ts  (3 tests)

 Test Files  6 passed (6)
      Tests  99 passed (99)
```

### 2. 新規追加テスト（planSha256 ガード）

```bash
npm test -- -t "planSha256"
```

**結果**: 2 tests passed

- `test/commands.test.ts`: "fails when planSha256 is null (plan.md exists but vdev plan not executed)"
- `test/gate.test.ts`: "returns BROKEN_STATE when DONE but planSha256 is null"

### 3. 新規追加テスト（implSha256 ガード）

```bash
npm test -- -t "implSha256"
```

**結果**: 2 tests passed

- `test/commands.test.ts`: "fails when implSha256 is null (impl.md exists but vdev impl not executed)"
- `test/gate.test.ts`: "returns BROKEN_STATE when DONE but implSha256 is null"

### 4. 正規フロー回帰テスト

```bash
npm test -- -t "full workflow e2e"
```

**結果**: 1 test passed

- `test/commands.test.ts`: "completes full workflow from new to DONE"

---

## plan.md の DoD を満たした根拠

| DoD 項目 | 達成 | 根拠 |
|---------|------|------|
| review.ts に planSha256 null ガードが追加されている | ✓ | src/commands/review.ts 64-73行目に追加 |
| impl-review.ts に implSha256 null ガードが追加されている | ✓ | src/commands/impl-review.ts 64-73行目に追加 |
| plan.md が存在しても planSha256 が null なら review が失敗する | ✓ | テスト "fails when planSha256 is null" が pass |
| impl.md が存在しても implSha256 が null なら impl-review が失敗する | ✓ | テスト "fails when implSha256 is null" が pass |
| exit code は COMMAND_ERROR 相当（success: false） | ✓ | 両コマンドで `success: false` を返却 |
| hash が不完全な状態では gate が BROKEN_STATE を返す | ✓ | テスト "DONE but planSha256/implSha256 is null" が pass |
| 正規フロー（vdev plan → review → impl → impl-review）は従来どおり成功する | ✓ | テスト "full workflow e2e" が pass |
| npm test がすべて pass する | ✓ | 99 tests passed |

---

## 残課題・不確実点

なし。

---

## 実装詳細

### review.ts の変更（diff 相当）

```typescript
// 追加箇所: plan.md 存在チェック後、normalizedContent 取得前

  // Precondition: planSha256 must be set (vdev plan must have been executed)
  const meta = metaResult.meta;
  if (!meta.hashes.planSha256) {
    return {
      success: false,
      topic,
      status: null,
      message: 'planSha256 not set: run vdev plan first',
    };
  }
```

### impl-review.ts の変更（diff 相当）

```typescript
// 追加箇所: impl.md 存在チェック後、normalizedContent 取得前

  // Precondition: implSha256 must be set (vdev impl must have been executed)
  const meta = metaResult.meta;
  if (!meta.hashes.implSha256) {
    return {
      success: false,
      topic,
      status: null,
      message: 'implSha256 not set: run vdev impl first',
    };
  }
```

### gate.ts の変更

なし（既存ロジックで null hash を正しく BROKEN_STATE として処理済み）
