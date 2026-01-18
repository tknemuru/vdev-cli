import { readFileSync, writeFileSync, existsSync } from 'fs';
import { getMetaPath } from './paths';

export type MetaStatus =
  | 'NEEDS_INSTRUCTION'
  | 'NEEDS_PLAN'
  | 'NEEDS_REVIEW'
  | 'NEEDS_CHANGES'
  | 'APPROVED'
  | 'REJECTED';

export interface Meta {
  schemaVersion: 1;
  topic: string;
  title: string;
  status: MetaStatus;
  paths: {
    instruction: string;
    plan: string;
    review: string;
  };
  hashes: {
    planSha256: string;
    reviewSha256: string;
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
}

export type MetaResult = MetaReadResult | MetaReadError;

const VALID_STATUSES: MetaStatus[] = [
  'NEEDS_INSTRUCTION',
  'NEEDS_PLAN',
  'NEEDS_REVIEW',
  'NEEDS_CHANGES',
  'APPROVED',
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

    if (parsed.schemaVersion !== 1) {
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
      schemaVersion: 1,
      topic: parsed.topic,
      title: parsed.title,
      status: parsed.status,
      paths: {
        instruction: parsed.paths.instruction || 'instruction.md',
        plan: parsed.paths.plan || 'plan.md',
        review: parsed.paths.review || 'review.md',
      },
      hashes: {
        planSha256: parsed.hashes.planSha256 || '',
        reviewSha256: parsed.hashes.reviewSha256 || '',
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
    schemaVersion: 1,
    topic,
    title,
    status: 'NEEDS_INSTRUCTION',
    paths: {
      instruction: 'instruction.md',
      plan: 'plan.md',
      review: 'review.md',
    },
    hashes: {
      planSha256: '',
      reviewSha256: '',
    },
    timestamps: {
      createdAt: timestamp,
      updatedAt: timestamp,
    },
  };
}
