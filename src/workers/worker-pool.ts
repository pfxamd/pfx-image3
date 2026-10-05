import { Image3CoreError, throwIfAborted } from '../errors/core-error.js';
import {
  DEFAULT_MEMORY_BUDGET_BYTES,
  recommendedWorkerCount,
} from '../memory/estimator.js';
import { estimateInputWorkingSet } from '../memory/preflight.js';
import { WeightedScheduler } from '../queue/scheduler.js';
import type {
  ConversionOptions,
  ConversionProgress,
  ConversionResult,
  ImageInput,
} from '../types/core.js';
import type { WorkerRequest, WorkerResponse } from './protocol.js';

export type WorkerFactory = () => Worker;

export interface WorkerPoolOptions {
  readonly workerFactory: WorkerFactory;
  readonly size?: number;
  readonly memoryBudgetBytes?: number;
}

interface PendingWorkerJob {
  readonly resolve: (result: ConversionResult) => void;
  readonly reject: (error: unknown) => void;
  readonly onProgress?: (progress: ConversionProgress) => void;
  readonly worker: Worker;
}

export class Image3WorkerPool {
  private readonly workers: Worker[];
  private readonly idleWorkers: Worker[];
  private readonly scheduler: WeightedScheduler;
  private readonly jobs = new Map<string, PendingWorkerJob>();
  private sequence = 0;

  constructor(options: WorkerPoolOptions) {
    const size =
      options.size ??
      recommendedWorkerCount(
        typeof navigator === 'undefined' ? undefined : navigator.hardwareConcurrency,
      );

    this.workers = Array.from({ length: size }, () => options.workerFactory());
    this.idleWorkers = [...this.workers];
    this.scheduler = new WeightedScheduler({
      concurrency: size,
      memoryBudgetBytes:
        options.memoryBudgetBytes ?? DEFAULT_MEMORY_BUDGET_BYTES,
    });

    for (const worker of this.workers) {
      worker.addEventListener('message', (event: MessageEvent<WorkerResponse>) => {
        this.handleMessage(event.data);
      });
      worker.addEventListener('error', (event) => {
        this.failJobsForWorker(worker, event.error ?? new Error(event.message));
      });
    }
  }

  async convert(
    input: ImageInput,
    options: ConversionOptions,
    config: {
      readonly signal?: AbortSignal;
      readonly onProgress?: (progress: ConversionProgress) => void;
    } = {},
  ): Promise<ConversionResult> {
    throwIfAborted(config.signal);
    const weight = await estimateInputWorkingSet(input);
    throwIfAborted(config.signal);

    return this.scheduler.enqueue(
      weight,
      () => this.runOnWorker(input, options, config),
      config.signal,
    );
  }

  pause(): void {
    this.scheduler.pause();
  }

  resume(): void {
    this.scheduler.resume();
  }

  terminate(): void {
    for (const worker of this.workers) worker.terminate();
    for (const [jobId, job] of this.jobs) {
      job.reject(new Image3CoreError('CANCELLED', 'Worker pool was terminated.'));
      this.jobs.delete(jobId);
    }
    this.idleWorkers.length = 0;
  }

  private runOnWorker(
    input: ImageInput,
    options: ConversionOptions,
    config: {
      readonly signal?: AbortSignal;
      readonly onProgress?: (progress: ConversionProgress) => void;
    },
  ): Promise<ConversionResult> {
    const worker = this.idleWorkers.shift();
    if (!worker) {
      return Promise.reject(
        new Image3CoreError('INTERNAL_ERROR', 'Scheduler acquired no idle worker.'),
      );
    }

    const jobId = `image3-${++this.sequence}`;

    return new Promise<ConversionResult>((resolve, reject) => {
      const abort = () => {
        const message: WorkerRequest = { type: 'cancel', jobId };
        worker.postMessage(message);
      };

      config.signal?.addEventListener('abort', abort, { once: true });

      this.jobs.set(jobId, {
        resolve: (result) => {
          config.signal?.removeEventListener('abort', abort);
          resolve(result);
        },
        reject: (error) => {
          config.signal?.removeEventListener('abort', abort);
          reject(error);
        },
        ...(config.onProgress ? { onProgress: config.onProgress } : {}),
        worker,
      });

      if (input.data instanceof ArrayBuffer) {
        const transferableInput = input.data.slice(0);
        const message: WorkerRequest = {
          type: 'convert',
          jobId,
          input: transferableInput,
          ...(input.name ? { name: input.name } : {}),
          ...(input.mimeType ? { mimeType: input.mimeType } : {}),
          options,
        };
        worker.postMessage(message, [transferableInput]);
      } else {
        const message: WorkerRequest = {
          type: 'convert',
          jobId,
          input: input.data,
          ...(input.name ? { name: input.name } : {}),
          ...(input.mimeType ? { mimeType: input.mimeType } : {}),
          options,
        };
        worker.postMessage(message);
      }
    }).finally(() => {
      this.idleWorkers.push(worker);
    });
  }

  private handleMessage(message: WorkerResponse): void {
    const job = this.jobs.get(message.jobId);
    if (!job) return;

    if (message.type === 'progress') {
      job.onProgress?.(message.progress);
      return;
    }

    this.jobs.delete(message.jobId);

    if (message.type === 'complete') {
      job.resolve(message.result);
      return;
    }

    job.reject(new Image3CoreError(message.error.code, message.error.message));
  }

  private failJobsForWorker(worker: Worker, error: unknown): void {
    for (const [jobId, job] of this.jobs) {
      if (job.worker !== worker) continue;
      this.jobs.delete(jobId);
      job.reject(
        new Image3CoreError('INTERNAL_ERROR', 'Image worker failed.', error),
      );
    }
  }
}
