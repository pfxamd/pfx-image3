/// <reference lib="webworker" />

import { Image3CoreError, toCoreError } from '../errors/core-error.js';
import { convertInline } from '../pipeline/convert.js';
import type { WorkerRequest, WorkerResponse } from './protocol.js';

const controllers = new Map<string, AbortController>();
const scope = self as DedicatedWorkerGlobalScope;

scope.addEventListener('message', (event: MessageEvent<WorkerRequest>) => {
  const request = event.data;

  if (request.type === 'cancel') {
    controllers.get(request.jobId)?.abort();
    return;
  }

  void runConversion(request);
});

async function runConversion(
  request: Extract<WorkerRequest, { type: 'convert' }>,
): Promise<void> {
  const controller = new AbortController();
  controllers.set(request.jobId, controller);

  try {
    const result = await convertInline({
      input: {
        data: request.input,
        ...(request.name ? { name: request.name } : {}),
        ...(request.mimeType ? { mimeType: request.mimeType } : {}),
      },
      options: request.options,
      signal: controller.signal,
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
  } finally {
    controllers.delete(request.jobId);
  }
}

function post(message: WorkerResponse, transfer: Transferable[] = []): void {
  scope.postMessage(message, transfer);
}
