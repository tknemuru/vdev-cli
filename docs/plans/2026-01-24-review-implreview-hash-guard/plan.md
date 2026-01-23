# plan.md: review / impl-review ハッシュガード強化

## 概要

vdev review / vdev impl-review が、前段階のハッシュ（planSha256 / implSha256）が null のままでも成功してしまう整合性バグを修正する。

## 問題の詳細

### 現状の挙動

1. **review.ts（53-62行目）**:
   - plan.md の「ファイル存在」のみを確認
   - `meta.hashes.planSha256` が null でも review を保存可能
   - → `vdev plan` を経由せずに design-review を登録できてしまう

2. **impl-review.ts（53-62行目）**:
   - impl.md の「ファイル存在」のみを確認
   - `meta.hashes.implSha256` が null でも impl-review を保存可能
   - → `vdev impl` を経由せずに impl-review を登録できてしまう

3. **gate.ts の検証タイミング**:
   - ハッシュ検証は DONE/REJECTED 時（Priority 2, 11）のみ
   - 中間状態ではファイル存在チェックのみで進行可能

### 期待される挙動

- `vdev review` は `planSha256` が non-null の場合のみ実行可能
- `vdev impl-review` は `implSha256` が non-null の場合のみ実行可能
- 正規フロー（vdev plan → review、vdev impl → impl-review）を CLI レベルで強制

## 変更計画

### 1. src/commands/review.ts の修正

**変更箇所**: `saveReview()` 関数（31-107行目）

**追加するガード（plan.md 存在チェックの直後、64行目の前）**:

```typescript
// Precondition: planSha256 must be set (vdev plan must have been executed)
if (!meta.hashes.planSha256) {
  return {
    success: false,
    topic,
    status: null,
    message: 'planSha256 not set: run vdev plan first',
  };
}
```

**実装詳細**:
- plan.md 存在チェック（53-62行目）と status 抽出（68行目）の間に挿入
- `meta.hashes.planSha256` が null または undefined の場合に失敗
- エラーメッセージは「vdev plan を先に実行せよ」と明示

### 2. src/commands/impl-review.ts の修正

**変更箇所**: `saveImplReview()` 関数（31-104行目）

**追加するガード（impl.md 存在チェックの直後、64行目の前）**:

```typescript
// Precondition: implSha256 must be set (vdev impl must have been executed)
if (!meta.hashes.implSha256) {
  return {
    success: false,
    topic,
    status: null,
    message: 'implSha256 not set: run vdev impl first',
  };
}
```

**実装詳細**:
- impl.md 存在チェック（53-62行目）と status 抽出（68行目）の間に挿入
- `meta.hashes.implSha256` が null または undefined の場合に失敗
- エラーメッセージは「vdev impl を先に実行せよ」と明示

### 3. src/core/gate.ts の検証強化（必要な場合のみ）

**現状分析**:
- `hashMatches()` 関数（14-19行目）は hash が null の場合 false を返す
- DONE 状態では `allHashesMatch()` が呼ばれ、null hash があれば BROKEN_STATE
- **結論**: gate.ts の修正は不要。既存ロジックで null hash の DONE を正しく拒否

**ただし、追加テストで以下を明示的に検証**:
- `status=DONE` かつ `planSha256=null` → BROKEN_STATE
- `status=DONE` かつ `implSha256=null` → BROKEN_STATE

### 4. テスト追加

**ファイル**: test/commands.test.ts

**追加テストケース**:

#### 4.1 review command のテスト（describe 'review command' 内）

```typescript
it('fails when planSha256 is null (plan.md exists but vdev plan not executed)', () => {
  const { topic } = newPlan(`${TEST_TOPIC_PREFIX}review-no-plan-hash`);
  createdTopics.push(topic);
  saveInstruction(topic, '# Instruction');

  // 手動で plan.md を作成（vdev plan を経由しない）
  const topicDir = getTopicDir(topic);
  const planPath = join(topicDir, 'plan.md');
  writeFileSync(planPath, '# Manually created plan');

  // plan.md は存在するが planSha256 は null
  const result = saveReview(topic, 'Status: DESIGN_APPROVED');
  expect(result.success).toBe(false);
  expect(result.message).toContain('planSha256 not set');
});
```

#### 4.2 impl-review command のテスト（describe 'impl-review command' 内）

```typescript
it('fails when implSha256 is null (impl.md exists but vdev impl not executed)', () => {
  const { topic } = newPlan(`${TEST_TOPIC_PREFIX}impl-review-no-impl-hash`);
  createdTopics.push(topic);
  saveInstruction(topic, '# Instruction');
  savePlan(topic, '# Plan');
  saveReview(topic, 'Status: DESIGN_APPROVED');
  startImplementation(topic);

  // 手動で impl.md を作成（vdev impl を経由しない）
  const topicDir = getTopicDir(topic);
  const implPath = join(topicDir, 'impl.md');
  writeFileSync(implPath, '# Manually created impl');

  // impl.md は存在するが implSha256 は null
  const result = saveImplReview(topic, 'Status: DONE');
  expect(result.success).toBe(false);
  expect(result.message).toContain('implSha256 not set');
});
```

**ファイル**: test/gate.test.ts

**追加テストケース**:

#### 4.3 gate の null hash 検証（describe 'Priority 2: hash mismatch in DONE/REJECTED' 内）

```typescript
it('returns BROKEN_STATE when DONE but planSha256 is null', () => {
  const designReviewContent = 'Status: DESIGN_APPROVED';
  const implContent = '# Impl';
  const implReviewContent = 'Status: DONE';
  createTopic(testTopic);
  writeFile(testTopic, 'instruction.md', '# Instruction');
  writeFile(testTopic, 'plan.md', '# Plan');
  writeFile(testTopic, 'design-review.md', designReviewContent);
  writeFile(testTopic, 'impl.md', implContent);
  writeFile(testTopic, 'impl-review.md', implReviewContent);
  writeMeta(
    testTopic,
    createValidMeta(
      testTopic,
      'DONE',
      null,  // planSha256 is null
      sha256(designReviewContent),
      sha256(implContent),
      sha256(implReviewContent)
    )
  );

  const result = checkGate(testTopic);
  expect(result.exitCode).toBe(ExitCode.BROKEN_STATE);
  expect(result.message).toContain('hash mismatch');
});

it('returns BROKEN_STATE when DONE but implSha256 is null', () => {
  const planContent = '# Plan';
  const designReviewContent = 'Status: DESIGN_APPROVED';
  const implReviewContent = 'Status: DONE';
  createTopic(testTopic);
  writeFile(testTopic, 'instruction.md', '# Instruction');
  writeFile(testTopic, 'plan.md', planContent);
  writeFile(testTopic, 'design-review.md', designReviewContent);
  writeFile(testTopic, 'impl.md', '# Impl');
  writeFile(testTopic, 'impl-review.md', implReviewContent);
  writeMeta(
    testTopic,
    createValidMeta(
      testTopic,
      'DONE',
      sha256(planContent),
      sha256(designReviewContent),
      null,  // implSha256 is null
      sha256(implReviewContent)
    )
  );

  const result = checkGate(testTopic);
  expect(result.exitCode).toBe(ExitCode.BROKEN_STATE);
  expect(result.message).toContain('hash mismatch');
});
```

### 5. 正規フローの回帰テスト確認

**既存テスト**: test/commands.test.ts の 'full workflow e2e' テスト（407-441行目）

このテストは正規フロー（new → instruction → plan → review → start → impl → impl-review → DONE）が正常に動作することを検証済み。本修正後も引き続き成功することを確認。

## 変更ファイル一覧

| ファイル | 変更種別 | 内容 |
|---------|---------|------|
| src/commands/review.ts | 修正 | planSha256 null ガード追加 |
| src/commands/impl-review.ts | 修正 | implSha256 null ガード追加 |
| test/commands.test.ts | 修正 | ハッシュガードのテスト追加 |
| test/gate.test.ts | 修正 | null hash での BROKEN_STATE テスト追加 |

## 必須ドキュメント更新要否

| ドキュメント | 更新要否 | 理由 |
|-------------|---------|------|
| docs/spec.md | 不要 | 既存仕様の厳密化であり、外部仕様の変更なし |
| docs/ops.md | 不要 | 運用手順への影響なし |
| docs/arch.md | 不要 | 設計判断の追加なし |

## Verify（検証手順）

```bash
# 1. 全テスト実行
npm test

# 2. 新規追加テストの個別確認
npm test -- --grep "planSha256 not set"
npm test -- --grep "implSha256 not set"
npm test -- --grep "DONE but planSha256 is null"
npm test -- --grep "DONE but implSha256 is null"

# 3. 正規フローの回帰確認
npm test -- --grep "full workflow e2e"
```

## DoD（Definition of Done）

- [ ] review.ts に planSha256 null ガードが追加されている
- [ ] impl-review.ts に implSha256 null ガードが追加されている
- [ ] plan.md が存在しても planSha256 が null なら review が失敗する
- [ ] impl.md が存在しても implSha256 が null なら impl-review が失敗する
- [ ] exit code は COMMAND_ERROR（1）相当（success: false）
- [ ] hash が不完全な状態では gate が BROKEN_STATE を返す
- [ ] 正規フロー（vdev plan → review → impl → impl-review）は従来どおり成功する
- [ ] npm test がすべて pass する

## Risk Assessment

**Risk: R1（低）**

- 変更範囲が限定的（2ファイルの小さな修正）
- 既存の正規フローに影響なし
- 追加テストで回帰を防止
