import { motion } from 'motion/react';
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
  const sourceFormat = fileFormat(item.file);

  return (
    <motion.article
      className={styles.row}
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className={styles.previewWrap}>
        <img
          className={styles.preview}
          src={item.previewUrl}
          alt=""
          draggable={false}
        />
        <span className={styles.formatBadge}>{sourceFormat}</span>
      </div>

      <div className={styles.identity}>
        <strong title={item.file.name}>{item.file.name}</strong>
        <div className={styles.fileMeta}>
          <span>{formatBytes(item.file.size)}</span>
          {result && (
            <>
              <i />
              <span>{result.width}×{result.height}</span>
            </>
          )}
        </div>
      </div>

      <div className={styles.status}>
        {isActive ? (
          <>
            <div className={styles.statusTop}>
              <strong>{stageLabel(item.stage)}</strong>
              <span>{Math.round(item.progress * 100)}%</span>
            </div>
            <div
              className={styles.progressTrack}
              role="progressbar"
              aria-label={`Converting ${item.file.name}`}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(item.progress * 100)}
            >
              <span
                className={styles.progressValue}
                style={{ width: `${Math.round(item.progress * 100)}%` }}
              />
            </div>
          </>
        ) : result ? (
          <>
            <div className={styles.statusTop}>
              <strong className={styles.success}>Done</strong>
              <span className={styles.outputFormat}>
                {result.extension.toUpperCase()}
              </span>
            </div>
            <div className={styles.resultMeta}>
              <span>{formatBytes(result.outputBytes)}</span>
              <i />
              <span>{formatSavings(result.inputBytes, result.outputBytes)}</span>
            </div>
          </>
        ) : item.status === 'error' ? (
          <>
            <strong className={styles.error}>Failed</strong>
            <span className={styles.statusCopy}>{item.error}</span>
          </>
        ) : item.status === 'cancelled' ? (
          <>
            <strong>Cancelled</strong>
            <span className={styles.statusCopy}>Ready to retry</span>
          </>
        ) : (
          <>
            <strong>Ready</strong>
            <span className={styles.statusCopy}>Waiting for conversion</span>
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
    </motion.article>
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

function fileFormat(file: File): string {
  const extension = file.name.split('.').pop()?.toUpperCase();
  if (extension === 'JPEG') return 'JPG';
  return extension ?? 'IMAGE';
}
