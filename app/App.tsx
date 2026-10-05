import { ConversionControls } from './components/ConversionControls.js';
import { DropZone } from './components/DropZone.js';
import { FileList } from './components/FileList.js';
import { useImageWorkspace } from './features/workspace/useImageWorkspace.js';
import styles from './App.module.css';

export function App() {
  const workspace = useImageWorkspace();
  const { items, settings } = workspace.state;

  const activeCount = items.filter(
    (item) => item.status === 'converting',
  ).length;
  const completedCount = items.filter(
    (item) => item.result !== undefined,
  ).length;

  return (
    <div className={styles.app}>
      <header className={styles.header}>
        <a className={styles.brand} href="./" aria-label="PFx Image3 home">
          <span className={styles.mark} aria-hidden="true">
            P
          </span>
          <span>
            <strong>PFx Image3</strong>
            <small>Image converter</small>
          </span>
        </a>

        <span className={styles.localBadge}>Local processing</span>
      </header>

      <main className={styles.main}>
        {items.length === 0 ? (
          <section className={styles.emptyState}>
            <div className={styles.intro}>
              <p className={styles.eyebrow}>JPG · PNG · WEBP</p>
              <h1>Convert images in your browser.</h1>
              <p>
                Add one image or a batch. Files stay on this device.
              </p>
            </div>

            <DropZone onFiles={workspace.addFiles} />
          </section>
        ) : (
          <div className={styles.workspace}>
            <div className={styles.workspaceTop}>
              <div>
                <p className={styles.eyebrow}>Workspace</p>
                <h1>Image conversion</h1>
              </div>

              <DropZone compact onFiles={workspace.addFiles} />
            </div>

            <ConversionControls
              settings={settings}
              disabled={activeCount > 0}
              activeCount={activeCount}
              completedCount={completedCount}
              onSettings={workspace.updateSettings}
              onConvertAll={() => void workspace.convertAll()}
              onCancelAll={workspace.cancelAll}
              onDownloadAll={workspace.downloadAll}
              onClear={workspace.clearItems}
            />

            <FileList
              items={items}
              onConvert={(id) => void workspace.convertItem(id)}
              onCancel={workspace.cancelItem}
              onRetry={(id) => void workspace.retryItem(id)}
              onDownload={workspace.downloadItem}
              onRemove={workspace.removeItem}
            />
          </div>
        )}
      </main>
    </div>
  );
}
