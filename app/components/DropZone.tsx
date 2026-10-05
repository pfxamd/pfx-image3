import {
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
} from 'react';
import { motion } from 'motion/react';
import styles from './DropZone.module.css';

interface DropZoneProps {
  readonly compact?: boolean;
  readonly onFiles: (
    files: readonly File[],
  ) => { accepted: number; rejected: number };
}

export function DropZone({
  compact = false,
  onFiles,
}: DropZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [message, setMessage] = useState<string>();

  const handleFiles = (files: readonly File[]) => {
    if (files.length === 0) return;
    const result = onFiles(files);

    if (result.rejected > 0) {
      setMessage(
        result.accepted > 0
          ? `${result.rejected} unsupported file${result.rejected === 1 ? '' : 's'} skipped.`
          : 'Only JPG, PNG and WebP images are supported.',
      );
    } else {
      setMessage(undefined);
    }
  };

  const onInput = (event: ChangeEvent<HTMLInputElement>) => {
    handleFiles(Array.from(event.target.files ?? []));
    event.target.value = '';
  };

  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragging(false);
    handleFiles(Array.from(event.dataTransfer.files));
  };

  return (
    <div className={styles.wrapper}>
      <motion.div
        data-testid="drop-zone"
        className={[
          styles.dropZone,
          compact ? styles.compact : '',
          dragging ? styles.dragging : '',
        ]
          .filter(Boolean)
          .join(' ')}
        animate={dragging ? { scale: 1.008 } : { scale: 1 }}
        transition={{ duration: 0.16 }}
        onDragEnter={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragOver={(event) => event.preventDefault()}
        onDragLeave={(event) => {
          if (event.currentTarget === event.target) setDragging(false);
        }}
        onDrop={onDrop}
      >
        <input
          ref={inputRef}
          className={styles.input}
          type="file"
          accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
          multiple
          onChange={onInput}
        />

        {!compact && (
          <div className={styles.dropVisual} aria-hidden="true">
            <span className={styles.frame}>
              <span className={styles.frameDot} />
              <span className={styles.frameLine} />
            </span>
            <span className={styles.plus}>+</span>
          </div>
        )}

        <div className={styles.copy}>
          <strong>{compact ? 'Add images' : 'Drop images here'}</strong>
          {!compact && (
            <span>One image or a batch · JPG, PNG and WebP</span>
          )}
        </div>

        <button
          type="button"
          className={styles.browseButton}
          onClick={() => inputRef.current?.click()}
        >
          {compact ? 'Browse' : 'Choose images'}
        </button>
      </motion.div>

      {message && (
        <p className={styles.message} role="status">
          {message}
        </p>
      )}
    </div>
  );
}
