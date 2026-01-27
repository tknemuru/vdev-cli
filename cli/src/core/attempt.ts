import { existsSync, readdirSync } from 'fs';
import { join } from 'path';

export interface AttemptResult {
  found: boolean;
  path: string | null;
  attemptNumber: number | null;
}

/**
 * Extract attempt number from filename (e.g., "attempt-001.md" -> 1, "attempt-10.md" -> 10)
 * Returns null if filename doesn't match pattern
 */
function extractAttemptNumber(filename: string): number | null {
  const match = filename.match(/^attempt-(\d+)\.md$/);
  if (!match) return null;
  return parseInt(match[1], 10);
}

/**
 * Find the latest attempt file in a directory.
 * Attempts are sorted by numeric value (not lexicographic order).
 *
 * @param dir - Directory path to search for attempt files
 * @returns AttemptResult with path to latest attempt file, or found=false if none found
 */
export function findLatestAttempt(dir: string): AttemptResult {
  // If directory doesn't exist, return not found
  if (!existsSync(dir)) {
    return { found: false, path: null, attemptNumber: null };
  }

  let files: string[];
  try {
    files = readdirSync(dir);
  } catch {
    return { found: false, path: null, attemptNumber: null };
  }

  // Parse attempt numbers and filter valid attempts
  const attempts: { filename: string; number: number }[] = [];
  for (const filename of files) {
    const num = extractAttemptNumber(filename);
    if (num !== null) {
      attempts.push({ filename, number: num });
    }
  }

  // If no valid attempts found, return not found
  if (attempts.length === 0) {
    return { found: false, path: null, attemptNumber: null };
  }

  // Sort by number descending and take the first (largest)
  attempts.sort((a, b) => b.number - a.number);
  const latest = attempts[0];

  return {
    found: true,
    path: join(dir, latest.filename),
    attemptNumber: latest.number,
  };
}
