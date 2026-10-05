import type {
  ConversionOptions,
  ConversionProgress,
  ConversionResult,
} from '../types/core.js';
import type { CoreErrorCode } from '../errors/core-error.js';

export interface WorkerConvertRequest {
  readonly type: 'convert';
  readonly jobId: string;
  readonly input: Blob | ArrayBuffer;
  readonly name?: string;
  readonly mimeType?: string;
  readonly options: ConversionOptions;
}

export interface WorkerCancelRequest {
  readonly type: 'cancel';
  readonly jobId: string;
}

export type WorkerRequest = WorkerConvertRequest | WorkerCancelRequest;

export interface WorkerProgressResponse {
  readonly type: 'progress';
  readonly jobId: string;
  readonly progress: ConversionProgress;
}

export interface WorkerCompleteResponse {
  readonly type: 'complete';
  readonly jobId: string;
  readonly result: ConversionResult;
}

export interface WorkerErrorResponse {
  readonly type: 'error';
  readonly jobId: string;
  readonly error: {
    readonly code: CoreErrorCode;
    readonly message: string;
  };
}

export type WorkerResponse =
  | WorkerProgressResponse
  | WorkerCompleteResponse
  | WorkerErrorResponse;
