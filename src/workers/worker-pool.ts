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
import type { WorkerResponse } from './protocol.js';

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
  private readonly workers: Worker[] = [];
  private readonly idleWorkers: Worker[] = [];
  private readonly scheduler: WeightedScheduler;
  private readonly jobs = new Map<string, PendingWorkerJob>();
  private readonly workerFactory: WorkerFactory;
  private sequence = 0;
  private terminated = false;

  constructor(options: WorkerPoolOptions) {
    const size =
      options.size ??
      recommendedWorkerCount(
        typeof navigator === 'undefined' ? undefined : navigator.hardwareConcurrency,
      );

    this.workerFactory = options.workerFactory;
    this.scheduler = new WeightedScheduler({
      concurrency: size,
      memoryBudgetBytes:
        options.memoryBudgetBytes ?? DEFAULT_MEMORY_BUDGET_BYTES,
    });

    for (let index = 0; index < size; index += 1) {
      const worker = this.createWorker();
      this.workers.push(worker);
      this.idleWorkers.push(worker);
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
    if (this.terminated) {
      throw new Image3CoreError('CANCELLED', 'Worker pool was terminated.');
    }

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
    if (this.terminated) return;
    this.terminated = true;

    const error = new Image3CoreError(
      'CANCELLED',
      'Worker pool was terminated.',
    );

    this.scheduler.close(error);

    for (const [, job] of this.jobs) job.reject(error);
    this.jobs.clear();

    for (const worker of this.workers) worker.terminate();
    this.workers.length = 0;
    this.idleWorkers.length = 0;
  }

  private createWorker(): Worker {
    const worker = this.workerFactory();

    worker.addEventListener('message', (event: MessageEvent<WorkerResponse>) => {
      this.handleMessage(event.data);
    });

    worker.addEventListener('error', (event) => {
      this.handleWorkerFailure(
        worker,
        event.error ?? new Error(event.message),
      );
    });

    return worker;
  }

  private runOnWorker(
    input: ImageInput,
    options: ConversionOptions,
    config: {
      readonly signal?: AbortSignal;
      readonly onProgress?: (progress: ConversionProgress) => void;
    },
  ): Promise<ConversionResult> {
    if (this.terminated) {
      return Promise.reject(
        new Image3CoreError('CANCELLED', 'Worker pool was terminated.'),
      );
    }

    const worker = this.idleWorkers.shift();
    if (!worker) {
      return Promise.reject(
        new Image3CoreError('INTERNAL_ERROR', 'Scheduler acquired no idle worker.'),
      );
    }

    const jobId = `image3-${++this.sequence}`;

    return new Promise<ConversionResult>((resolve, reject) => {
      const abort = () => {
        const job = this.jobs.get(jobId);
        if (!job) return;

        this.jobs.delete(jobId);
        this.retireWorker(worker, true);
        job.reject(new Image3CoreError('CANCELLED', 'Conversion was cancelled.'));
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

        worker.postMessage(
          {
            type: 'convert',
            jobId,
            input: transferableInput,
            ...(input.name ? { name: input.name } : {}),
            ...(input.mimeType ? { mimeType: input.mimeType } : {}),
            options,
          },
          [transferableInput],
        );
      } else {
        worker.postMessage({
          type: 'convert',
          jobId,
          input: input.data,
          ...(input.name ? { name: input.name } : {}),
          ...(input.mimeType ? { mimeType: input.mimeType } : {}),
          options,
        });
      }
    }).finally(() => {
      if (
        !this.terminated &&
        this.workers.includes(worker) &&
        !this.idleWorkers.includes(worker)
      ) {
        this.idleWorkers.push(worker);
      }
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

  private handleWorkerFailure(worker: Worker, error: unknown): void {
    if (this.terminated) return;

    const affected = [...this.jobs.entries()].filter(
      ([, job]) => job.worker === worker,
    );

    this.retireWorker(worker, true);

    for (const [jobId, job] of affected) {
      this.jobs.delete(jobId);
      job.reject(
        new Image3CoreError('INTERNAL_ERROR', 'Image worker failed.', error),
      );
    }
  }

  private retireWorker(worker: Worker, replace: boolean): void {
    const workerIndex = this.workers.indexOf(worker);
    if (workerIndex >= 0) this.workers.splice(workerIndex, 1);

    let idleIndex = this.idleWorkers.indexOf(worker);
    while (idleIndex >= 0) {
      this.idleWorkers.splice(idleIndex, 1);
      idleIndex = this.idleWorkers.indexOf(worker);
    }

    worker.terminate();

    if (!this.terminated && replace) {
      const replacement = this.createWorker();
      this.workers.push(replacement);
      this.idleWorkers.push(replacement);
    }
  }
}
