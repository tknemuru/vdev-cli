import { execSync } from 'child_process';
import { basename } from 'path';

export function getRepoName(): string {
  try {
    const toplevel = execSync('git rev-parse --show-toplevel', {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
    }).trim();
    return basename(toplevel);
  } catch {
    return '-';
  }
}
