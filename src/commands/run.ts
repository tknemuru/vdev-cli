import { checkGate } from '../core/gate';
import { ExitCode } from '../core/errors';

export interface RunResult {
  allowed: boolean;
  exitCode: number;
  status: string;
  message: string;
}

export function checkRun(topic: string): RunResult {
  const gateResult = checkGate(topic);

  return {
    allowed: gateResult.exitCode === ExitCode.APPROVED,
    exitCode: gateResult.exitCode,
    status: gateResult.status,
    message: gateResult.message,
  };
}
