import type { WorkspaceItem } from '../features/workspace/types.js';
import { formatBytes, formatSavings } from '../lib/format.js';
import styles from './FileRow.module.css';

interface FileRowProps {
  readonly item: WorkspaceItem;
  readonly onConvert: (id: string) => void;
  readonly onCancel: (id: string) => void;
  readonly onRetry: (id: string) => void;
  readonly onDownload: (id: string) => void;
  readonly onRemove: (id: string) => void;
}

export function FileRow({
  item,
  onConvert,
  onCancel,
  onRetry,
  onDownload,
  onRemove,
}: FileRowProps) {
  const isActive = item.status === 'converting';
  const result = item.result;

  return (
    <article className={styles.row}>
      <img
        className={styles.preview}
        src={item.previewUrl}
        alt=""
        draggable={false}
      />

      <div className={styles.identity}>
        <strong title={item.file.name}>{item.file.name}</strong>
        <span>
          {formatBytes(item.file.size)}
          {result ? ` → ${formatBytes(result.outputBytes)}` : ''}
        </span>
      </div>

      <div className={styles.status}>
        {isActive ? (
          <>
            <div className={styles.progressTrack} aria-hidden="true">
              <span
                className={styles.progressValue}
                style={{ width: `${Math.round(item.progress * 100)}%` }}
              />
            </div>
            <span>
              {stageLabel(item.stage)} · {Math.round(item.progress * 100)}%
            </span>
          </>
        ) : result ? (
          <>
            <strong className={styles.success}>Done</strong>
            <span>
              {result.extension.toUpperCase()} ·{' '}
              {formatSavings(result.inputBytes, result.outputBytes)}
            </span>
          </>
        ) : item.status === 'error' ? (
          <>
            <strong className={styles.error}>Failed</strong>
            <span>{item.error}</span>
          </>
        ) : item.status === 'cancelled' ? (
          <>
            <strong>Cancelled</strong>
            <span>Ready to retry</span>
          </>
        ) : (
          <>
            <strong>Ready</strong>
            <span>Waiting for conversion</span>
          </>
        )}
      </div>

      <div className={styles.actions}>
        {isActive ? (
          <button type="button" onClick={() => onCancel(item.id)}>
            Cancel
          </button>
        ) : result ? (
          <button type="button" onClick={() => onDownload(item.id)}>
            Download
          </button>
        ) : item.status === 'error' || item.status === 'cancelled' ? (
          <button type="button" onClick={() => onRetry(item.id)}>
            Retry
          </button>
        ) : (
          <button type="button" onClick={() => onConvert(item.id)}>
            Convert
          </button>
        )}

        <button
          type="button"
          className={styles.remove}
          disabled={isActive}
          onClick={() => onRemove(item.id)}
          aria-label={`Remove ${item.file.name}`}
        >
          Remove
        </button>
      </div>
    </article>
  );
}

function stageLabel(stage: WorkspaceItem['stage']): string {
  switch (stage) {
    case 'validating':
      return 'Checking';
    case 'decoding':
      return 'Decoding';
    case 'processing':
      return 'Processing';
    case 'encoding':
      return 'Encoding';
    case 'completed':
      return 'Done';
    default:
      return 'Working';
  }
}
