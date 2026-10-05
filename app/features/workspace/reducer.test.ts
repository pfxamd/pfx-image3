import { describe, expect, it } from 'vitest';
import { workspaceReducer } from './reducer.js';
import {
  initialWorkspaceState,
  type WorkspaceItem,
} from './types.js';

function makeItem(): WorkspaceItem {
  return {
    id: 'image-1',
    file: {} as File,
    previewUrl: 'blob:test',
    status: 'ready',
    stage: undefined,
    progress: 0,
    result: undefined,
    error: undefined,
  };
}

describe('workspaceReducer', () => {
  it('tracks conversion progress and completion', () => {
    const withItem = workspaceReducer(initialWorkspaceState, {
      type: 'add',
      items: [makeItem()],
    });

    const started = workspaceReducer(withItem, {
      type: 'start',
      id: 'image-1',
    });

    const progressed = workspaceReducer(started, {
      type: 'progress',
      id: 'image-1',
      progress: 0.7,
      stage: 'encoding',
    });

    expect(progressed.items[0]).toMatchObject({
      status: 'converting',
      progress: 0.7,
      stage: 'encoding',
    });
  });

  it('invalidates old results when output settings change', () => {
    const item: WorkspaceItem = {
      ...makeItem(),
      status: 'completed',
      progress: 1,
      stage: 'completed',
      result: {
        buffer: new ArrayBuffer(1),
        sourceFormat: 'png',
        targetFormat: 'webp',
        mimeType: 'image/webp',
        extension: 'webp',
        width: 1,
        height: 1,
        inputBytes: 10,
        outputBytes: 8,
      },
    };

    const state = {
      ...initialWorkspaceState,
      items: [item],
    };

    const next = workspaceReducer(state, {
      type: 'settings',
      patch: { format: 'jpeg' },
    });

    expect(next.settings.format).toBe('jpeg');
    expect(next.items[0]).toMatchObject({
      status: 'ready',
      progress: 0,
      result: undefined,
    });
  });
});
