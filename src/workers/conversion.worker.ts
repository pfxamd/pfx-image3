/// <reference lib="webworker" />

import { Image3CoreError, toCoreError } from '../errors/core-error.js';
import { convertInline } from '../pipeline/convert.js';
import type { WorkerRequest, WorkerResponse } from './protocol.js';

const scope = self as DedicatedWorkerGlobalScope;

scope.addEventListener('message', (event: MessageEvent<WorkerRequest>) => {
  void runConversion(event.data);
});

async function runConversion(request: WorkerRequest): Promise<void> {
  try {
    const result = await convertInline({
      input: {
        data: request.input,
        ...(request.name ? { name: request.name } : {}),
        ...(request.mimeType ? { mimeType: request.mimeType } : {}),
      },
      options: request.options,
      onProgress: (progress) => {
        post({ type: 'progress', jobId: request.jobId, progress });
      },
    });

    post(
      { type: 'complete', jobId: request.jobId, result },
      [result.buffer],
    );
  } catch (error) {
    const coreError =
      error instanceof Image3CoreError
        ? error
        : toCoreError(error, 'INTERNAL_ERROR', 'Worker conversion failed.');

    post({
      type: 'error',
      jobId: request.jobId,
      error: { code: coreError.code, message: coreError.message },
    });
  }
}

function post(message: WorkerResponse, transfer: Transferable[] = []): void {
  scope.postMessage(message, transfer);
}
