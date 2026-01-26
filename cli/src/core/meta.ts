import { readFileSync, writeFileSync, existsSync } from 'fs';
import { getMetaPath } from './paths';

export type MetaStatus =
  | 'NEEDS_INSTRUCTION'
  | 'NEEDS_PLAN'
  | 'NEEDS_DESIGN_REVIEW'
  | 'DESIGN_APPROVED'
  | 'IMPLEMENTING'
  | 'NEEDS_IMPL_REPORT'
  | 'NEEDS_IMPL_REVIEW'
  | 'DONE'
  | 'REJECTED';

export interface Meta {
  schemaVersion: 2;
  topic: string;
  title: string;
  status: MetaStatus;
  paths: {
    instruction: string;
    plan: string;
    designReview: string;
    impl: string;
    implReview: string;
  };
  hashes: {
    planSha256: string | null;
    designReviewSha256: string | null;
    implSha256: string | null;
    implReviewSha256: string | null;
  };
  timestamps: {
    createdAt: string;
    updatedAt: string;
  };
}

export interface MetaReadResult {
  success: true;
  meta: Meta;
}

export interface MetaReadError {
  success: false;
  error: string;
  isV1Schema?: boolean;
}

export type MetaResult = MetaReadResult | MetaReadError;

const VALID_STATUSES: MetaStatus[] = [
  'NEEDS_INSTRUCTION',
  'NEEDS_PLAN',
  'NEEDS_DESIGN_REVIEW',
  'DESIGN_APPROVED',
  'IMPLEMENTING',
  'NEEDS_IMPL_REPORT',
  'NEEDS_IMPL_REVIEW',
  'DONE',
  'REJECTED',
];

function isValidStatus(status: unknown): status is MetaStatus {
  return typeof status === 'string' && VALID_STATUSES.includes(status as MetaStatus);
}

export function readMeta(topic: string): MetaResult {
  const metaPath = getMetaPath(topic);

  if (!existsSync(metaPath)) {
    return { success: false, error: 'meta.json not found' };
  }

  try {
    const content = readFileSync(metaPath, 'utf8');
    const parsed = JSON.parse(content);

    if (parsed.schemaVersion === 1) {
      return { success: false, error: 'schemaVersion 1 is not supported by v2 CLI', isV1Schema: true };
    }

    if (parsed.schemaVersion !== 2) {
      return { success: false, error: 'invalid schemaVersion' };
    }

    if (typeof parsed.topic !== 'string') {
      return { success: false, error: 'invalid topic' };
    }

    if (typeof parsed.title !== 'string') {
      return { success: false, error: 'invalid title' };
    }

    if (!isValidStatus(parsed.status)) {
      return { success: false, error: 'invalid status' };
    }

    if (!parsed.paths || typeof parsed.paths !== 'object') {
      return { success: false, error: 'invalid paths' };
    }

    if (!parsed.hashes || typeof parsed.hashes !== 'object') {
      return { success: false, error: 'invalid hashes' };
    }

    if (!parsed.timestamps || typeof parsed.timestamps !== 'object') {
      return { success: false, error: 'invalid timestamps' };
    }

    const meta: Meta = {
      schemaVersion: 2,
      topic: parsed.topic,
      title: parsed.title,
      status: parsed.status,
      paths: {
        instruction: parsed.paths.instruction || 'instruction.md',
        plan: parsed.paths.plan || 'plan.md',
        designReview: parsed.paths.designReview || 'design-review.md',
        impl: parsed.paths.impl || 'impl.md',
        implReview: parsed.paths.implReview || 'impl-review.md',
      },
      hashes: {
        planSha256: parsed.hashes.planSha256 || null,
        designReviewSha256: parsed.hashes.designReviewSha256 || null,
        implSha256: parsed.hashes.implSha256 || null,
        implReviewSha256: parsed.hashes.implReviewSha256 || null,
      },
      timestamps: {
        createdAt: parsed.timestamps.createdAt || '',
        updatedAt: parsed.timestamps.updatedAt || '',
      },
    };

    return { success: true, meta };
  } catch (e) {
    return { success: false, error: `parse error: ${e}` };
  }
}

export function writeMeta(topic: string, meta: Meta): void {
  const metaPath = getMetaPath(topic);
  const content = JSON.stringify(meta, null, 2) + '\n';
  writeFileSync(metaPath, content, 'utf8');
}

export function createInitialMeta(topic: string, title: string, timestamp: string): Meta {
  return {
    schemaVersion: 2,
    topic,
    title,
    status: 'NEEDS_INSTRUCTION',
    paths: {
      instruction: 'instruction.md',
      plan: 'plan.md',
      designReview: 'design-review.md',
      impl: 'impl.md',
      implReview: 'impl-review.md',
    },
    hashes: {
      planSha256: null,
      designReviewSha256: null,
      implSha256: null,
      implReviewSha256: null,
    },
    timestamps: {
      createdAt: timestamp,
      updatedAt: timestamp,
    },
  };
}
