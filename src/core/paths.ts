import { execSync } from 'child_process';
import { join } from 'path';

export function getGitRoot(): string {
  try {
    return execSync('git rev-parse --show-toplevel', {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
    }).trim();
  } catch {
    return process.cwd();
  }
}

export function getPlansDir(): string {
  return join(getGitRoot(), 'docs', 'plans');
}

export function getTopicDir(topic: string): string {
  return join(getPlansDir(), topic);
}

export function getMetaPath(topic: string): string {
  return join(getTopicDir(topic), 'meta.json');
}

export function getInstructionPath(topic: string): string {
  return join(getTopicDir(topic), 'instruction.md');
}

export function getPlanPath(topic: string): string {
  return join(getTopicDir(topic), 'plan.md');
}

export function getReviewPath(topic: string): string {
  return join(getTopicDir(topic), 'review.md');
}
