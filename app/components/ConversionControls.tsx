import type { ImageFormat } from '../../src/index.js';
import type { WorkspaceSettings } from '../features/workspace/types.js';
import styles from './ConversionControls.module.css';

interface ConversionControlsProps {
  readonly settings: WorkspaceSettings;
  readonly disabled: boolean;
  readonly activeCount: number;
  readonly completedCount: number;
  readonly onSettings: (patch: Partial<WorkspaceSettings>) => void;
  readonly onConvertAll: () => void;
  readonly onCancelAll: () => void;
  readonly onDownloadAll: () => void;
  readonly onClear: () => void;
}

export function ConversionControls({
  settings,
  disabled,
  activeCount,
  completedCount,
  onSettings,
  onConvertAll,
  onCancelAll,
  onDownloadAll,
  onClear,
}: ConversionControlsProps) {
  const format = settings.format;

  return (
    <section className={styles.controls} aria-label="Conversion settings">
      <div className={styles.fieldGroup}>
        <span className={styles.label}>Output</span>
        <div className={styles.segmented}>
          {(['jpeg', 'png', 'webp'] as const).map((value) => (
            <button
              key={value}
              type="button"
              className={format === value ? styles.activeSegment : styles.segment}
              disabled={disabled}
              aria-pressed={format === value}
              onClick={() => onSettings({ format: value as ImageFormat })}
            >
              {value === 'jpeg' ? 'JPG' : value.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {(format === 'jpeg' || (format === 'webp' && !settings.webpLossless)) && (
        <label className={styles.rangeField}>
          <span className={styles.label}>Quality</span>
          <div className={styles.rangeRow}>
            <input
              type="range"
              min="1"
              max="100"
              value={settings.quality}
              disabled={disabled}
              onChange={(event) =>
                onSettings({ quality: Number(event.target.value) })
              }
            />
            <output>{settings.quality}</output>
          </div>
        </label>
      )}

      {format === 'png' && (
        <label className={styles.rangeField}>
          <span className={styles.label}>Compression</span>
          <div className={styles.rangeRow}>
            <input
              type="range"
              min="1"
              max="6"
              step="1"
              value={settings.pngCompressionLevel}
              disabled={disabled}
              onChange={(event) =>
                onSettings({
                  pngCompressionLevel: Number(
                    event.target.value,
                  ) as WorkspaceSettings['pngCompressionLevel'],
                })
              }
            />
            <output>{settings.pngCompressionLevel}</output>
          </div>
        </label>
      )}

      {format === 'webp' && (
        <label className={styles.toggle}>
          <input
            type="checkbox"
            checked={settings.webpLossless}
            disabled={disabled}
            onChange={(event) =>
              onSettings({ webpLossless: event.target.checked })
            }
          />
          <span>Lossless</span>
        </label>
      )}

      <div className={styles.actions}>
        {activeCount > 0 ? (
          <button
            type="button"
            className={styles.secondaryButton}
            onClick={onCancelAll}
          >
            Cancel all
          </button>
        ) : (
          <button
            type="button"
            className={styles.primaryButton}
            onClick={onConvertAll}
          >
            Convert all
          </button>
        )}

        <button
          type="button"
          className={styles.secondaryButton}
          disabled={completedCount === 0 || activeCount > 0}
          onClick={onDownloadAll}
        >
          Download all
        </button>

        <button
          type="button"
          className={styles.quietButton}
          disabled={activeCount > 0}
          onClick={onClear}
        >
          Clear
        </button>
      </div>
    </section>
  );
}
