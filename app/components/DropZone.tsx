import {
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
} from 'react';
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
      <div
        className={[
          styles.dropZone,
          compact ? styles.compact : '',
          dragging ? styles.dragging : '',
        ]
          .filter(Boolean)
          .join(' ')}
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

        <div className={styles.copy}>
          <strong>{compact ? 'Add more images' : 'Drop images here'}</strong>
          {!compact && (
            <span>JPG, PNG and WebP · multiple files supported</span>
          )}
        </div>

        <button
          type="button"
          className={styles.browseButton}
          onClick={() => inputRef.current?.click()}
        >
          Choose images
        </button>
      </div>

      {message && (
        <p className={styles.message} role="status">
          {message}
        </p>
      )}
    </div>
  );
}
