const MIB = 1024 * 1024;

export interface MemoryEstimateInput {
  readonly inputBytes: number;
  readonly width?: number;
  readonly height?: number;
}

export function estimateWorkingSetBytes(input: MemoryEstimateInput): number {
  if (input.width && input.height) {
    const rgbaBytes = input.width * input.height * 4;
    return Math.ceil(input.inputBytes + rgbaBytes * 3);
  }

  return Math.min(
    256 * MIB,
    Math.max(16 * MIB, Math.ceil(input.inputBytes * 12)),
  );
}

export function recommendedWorkerCount(
  logicalProcessors: number | undefined,
  maximum = 4,
): number {
  const processors = logicalProcessors ?? 2;
  return Math.max(1, Math.min(maximum, Math.max(1, processors - 1)));
}

export const DEFAULT_MEMORY_BUDGET_BYTES = 384 * MIB;
