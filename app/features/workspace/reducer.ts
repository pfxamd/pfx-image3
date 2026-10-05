import type {
  WorkspaceAction,
  WorkspaceItem,
  WorkspaceState,
} from './types.js';

export function workspaceReducer(
  state: WorkspaceState,
  action: WorkspaceAction,
): WorkspaceState {
  switch (action.type) {
    case 'add':
      return {
        ...state,
        items: [...state.items, ...action.items],
      };

    case 'remove':
      return {
        ...state,
        items: state.items.filter((item) => item.id !== action.id),
      };

    case 'clear':
      return {
        ...state,
        items: [],
      };

    case 'settings':
      return {
        ...state,
        settings: {
          ...state.settings,
          ...action.patch,
        },
      };

    case 'start':
      return updateItem(state, action.id, {
        status: 'converting',
        progress: 0,
        error: undefined,
        result: undefined,
      });

    case 'progress':
      return updateItem(state, action.id, {
        status: 'converting',
        progress: action.progress,
        stage: action.stage,
      });

    case 'success':
      return updateItem(state, action.id, {
        status: 'completed',
        progress: 1,
        stage: 'completed',
        result: action.result,
        error: undefined,
      });

    case 'error':
      return updateItem(state, action.id, {
        status: 'error',
        error: action.error,
      });

    case 'cancelled':
      return updateItem(state, action.id, {
        status: 'cancelled',
        error: undefined,
      });

    case 'reset':
      return updateItem(state, action.id, {
        status: 'ready',
        progress: 0,
        stage: undefined,
        result: undefined,
        error: undefined,
      });
  }
}

function updateItem(
  state: WorkspaceState,
  id: string,
  patch: Partial<WorkspaceItem>,
): WorkspaceState {
  return {
    ...state,
    items: state.items.map((item) =>
      item.id === id ? { ...item, ...patch } : item,
    ),
  };
}
