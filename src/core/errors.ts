export const ExitCode = {
  APPROVED: 0,
  NEEDS_INSTRUCTION: 10,
  NEEDS_PLAN: 11,
  NEEDS_REVIEW: 12,
  NEEDS_CHANGES: 13,
  REJECTED: 14,
  BROKEN_STATE: 20,
} as const;

export type ExitCodeValue = (typeof ExitCode)[keyof typeof ExitCode];

export const ExitCodeName: Record<ExitCodeValue, string> = {
  [ExitCode.APPROVED]: 'APPROVED',
  [ExitCode.NEEDS_INSTRUCTION]: 'NEEDS_INSTRUCTION',
  [ExitCode.NEEDS_PLAN]: 'NEEDS_PLAN',
  [ExitCode.NEEDS_REVIEW]: 'NEEDS_REVIEW',
  [ExitCode.NEEDS_CHANGES]: 'NEEDS_CHANGES',
  [ExitCode.REJECTED]: 'REJECTED',
  [ExitCode.BROKEN_STATE]: 'BROKEN_STATE',
};
