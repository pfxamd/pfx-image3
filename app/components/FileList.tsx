import type { WorkspaceItem } from '../features/workspace/types.js';
import { FileRow } from './FileRow.js';
import styles from './FileList.module.css';

interface FileListProps {
  readonly items: readonly WorkspaceItem[];
  readonly onConvert: (id: string) => void;
  readonly onCancel: (id: string) => void;
  readonly onRetry: (id: string) => void;
  readonly onDownload: (id: string) => void;
  readonly onRemove: (id: string) => void;
}

export function FileList({
  items,
  onConvert,
  onCancel,
  onRetry,
  onDownload,
  onRemove,
}: FileListProps) {
  return (
    <section className={styles.section} aria-label="Images">
      <div className={styles.header}>
        <h2>Images</h2>
        <span>{items.length}</span>
      </div>

      <div className={styles.list}>
        {items.map((item) => (
          <FileRow
            key={item.id}
            item={item}
            onConvert={onConvert}
            onCancel={onCancel}
            onRetry={onRetry}
            onDownload={onDownload}
            onRemove={onRemove}
          />
        ))}
      </div>
    </section>
  );
}
