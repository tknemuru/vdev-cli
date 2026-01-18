import { checkGate as coreCheckGate, GateResult } from '../core/gate';

export function gateCommand(topic: string): GateResult {
  return coreCheckGate(topic);
}
