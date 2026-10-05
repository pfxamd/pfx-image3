import {
  useCallback,
  useEffect,
  useReducer,
  useRef,
  useState,
} from 'react';
import {
  Image3CoreError,
  type ConversionResult,
} from '../../../src/index.js';
import { createImage3WorkerPool } from '../../lib/createWorkerPool.js';
import { downloadResult, downloadResults } from '../../lib/download.js';
import { partitionImageFiles } from './files.js';
import { workspaceReducer } from './reducer.js';
import {
  buildConversionOptions,
  initialWorkspaceState,
  type WorkspaceItem,
  type WorkspaceSettings,
} from './types.js';

export function useImageWorkspace() {
  const [state, dispatch] = useReducer(
    workspaceReducer,
    initialWorkspaceState,
  );
  const [pool] = useState(createImage3WorkerPool);
  const controllers = useRef(new Map<string, AbortController>());
  const stateRef = useRef(state);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    return () => {
      for (const controller of controllers.current.values()) {
        controller.abort();
      }
      controllers.current.clear();

      for (const item of stateRef.current.items) {
        URL.revokeObjectURL(item.previewUrl);
      }

      pool.terminate();
    };
  }, [pool]);

  const addFiles = useCallback((files: readonly File[]) => {
    const partition = partitionImageFiles(files);

    const items: WorkspaceItem[] = partition.accepted.map((file) => ({
      id: crypto.randomUUID(),
      file,
      previewUrl: URL.createObjectURL(file),
      status: 'ready',
      progress: 0,
    }));

    if (items.length > 0) {
      dispatch({ type: 'add', items });
    }

    return {
      accepted: items.length,
      rejected: partition.rejected.length,
    };
  }, []);

  const removeItem = useCallback((id: string) => {
    const item = stateRef.current.items.find((candidate) => candidate.id === id);
    if (!item) return;

    controllers.current.get(id)?.abort();
    controllers.current.delete(id);
    URL.revokeObjectURL(item.previewUrl);
    dispatch({ type: 'remove', id });
  }, []);

  const clearItems = useCallback(() => {
    for (const controller of controllers.current.values()) {
      controller.abort();
    }
    controllers.current.clear();

    for (const item of stateRef.current.items) {
      URL.revokeObjectURL(item.previewUrl);
    }

    dispatch({ type: 'clear' });
  }, []);

  const updateSettings = useCallback(
    (patch: Partial<WorkspaceSettings>) => {
      dispatch({ type: 'settings', patch });
    },
    [],
  );

  const convertItem = useCallback(
    async (id: string): Promise<ConversionResult | undefined> => {
      const item = stateRef.current.items.find((candidate) => candidate.id === id);
      if (!item || item.status === 'converting') return undefined;

      const controller = new AbortController();
      controllers.current.set(id, controller);
      dispatch({ type: 'start', id });

      const options = buildConversionOptions(stateRef.current.settings);

      try {
        let attempt = 0;

        while (attempt < 2) {
          attempt += 1;

          try {
            const result = await pool.convert(
              {
                data: item.file,
                name: item.file.name,
                mimeType: item.file.type || undefined,
              },
              options,
              {
                signal: controller.signal,
                onProgress: (progress) => {
                  dispatch({
                    type: 'progress',
                    id,
                    progress: progress.ratio,
                    stage: progress.stage,
                  });
                },
              },
            );

            dispatch({ type: 'success', id, result });
            return result;
          } catch (error) {
            if (
              attempt < 2 &&
              error instanceof Image3CoreError &&
              error.code === 'INTERNAL_ERROR' &&
              !controller.signal.aborted
            ) {
              continue;
            }

            throw error;
          }
        }
      } catch (error) {
        if (
          controller.signal.aborted ||
          (error instanceof Image3CoreError && error.code === 'CANCELLED')
        ) {
          dispatch({ type: 'cancelled', id });
          return undefined;
        }

        dispatch({
          type: 'error',
          id,
          error: getErrorMessage(error),
        });
      } finally {
        controllers.current.delete(id);
      }

      return undefined;
    },
    [pool],
  );

  const convertAll = useCallback(async () => {
    const ids = stateRef.current.items
      .filter((item) => item.status !== 'converting')
      .map((item) => item.id);

    await Promise.allSettled(ids.map((id) => convertItem(id)));
  }, [convertItem]);

  const cancelItem = useCallback((id: string) => {
    controllers.current.get(id)?.abort();
  }, []);

  const cancelAll = useCallback(() => {
    for (const controller of controllers.current.values()) {
      controller.abort();
    }
  }, []);

  const retryItem = useCallback(
    async (id: string) => {
      dispatch({ type: 'reset', id });
      return convertItem(id);
    },
    [convertItem],
  );

  const downloadItem = useCallback((id: string) => {
    const result = stateRef.current.items.find(
      (item) => item.id === id,
    )?.result;

    if (result) downloadResult(result);
  }, []);

  const downloadAll = useCallback(() => {
    const results = stateRef.current.items.flatMap((item) =>
      item.result ? [item.result] : [],
    );

    downloadResults(results);
  }, []);

  return {
    state,
    addFiles,
    removeItem,
    clearItems,
    updateSettings,
    convertItem,
    convertAll,
    cancelItem,
    cancelAll,
    retryItem,
    downloadItem,
    downloadAll,
  };
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Image3CoreError) {
    switch (error.code) {
      case 'INVALID_FILE':
        return 'Invalid image file.';
      case 'UNSUPPORTED_FORMAT':
        return 'Unsupported image format.';
      case 'DECODE_FAILED':
        return 'The image could not be decoded.';
      case 'ENCODE_FAILED':
        return 'The image could not be encoded.';
      case 'OUT_OF_MEMORY':
        return 'Not enough memory to convert this image.';
      case 'CANCELLED':
        return 'Conversion cancelled.';
      case 'INTERNAL_ERROR':
        return 'Conversion failed unexpectedly.';
    }
  }

  return error instanceof Error ? error.message : 'Conversion failed.';
}
