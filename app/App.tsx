import { AnimatePresence, motion } from 'motion/react';
import { ConversionControls } from './components/ConversionControls.js';
import { DropZone } from './components/DropZone.js';
import { FileList } from './components/FileList.js';
import { useImageWorkspace } from './features/workspace/useImageWorkspace.js';
import { formatBytes } from './lib/format.js';
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
  const totalInputBytes = items.reduce(
    (total, item) => total + item.file.size,
    0,
  );

  return (
    <div className={styles.app}>
      <header className={styles.header}>
        <a className={styles.brand} href="./" aria-label="PFx Image3 home">
          <span className={styles.mark} aria-hidden="true">
            <span />
            <span />
          </span>
          <span className={styles.brandCopy}>
            <strong>PFx Image3</strong>
            <small>Image converter</small>
          </span>
        </a>

        <div className={styles.headerMeta}>
          <span className={styles.statusDot} aria-hidden="true" />
          <span>Local processing</span>
        </div>
      </header>

      <main className={styles.main}>
        <AnimatePresence mode="wait" initial={false}>
          {items.length === 0 ? (
            <motion.section
              key="empty"
              className={styles.emptyState}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
            >
              <div className={styles.intro}>
                <div className={styles.formatLine} aria-label="Supported formats">
                  <span>JPG</span>
                  <i />
                  <span>PNG</span>
                  <i />
                  <span>WEBP</span>
                </div>

                <div className={styles.introCopy}>
                  <h1>Convert images in your browser.</h1>
                  <p>
                    Fast batch conversion with no upload step. Your files stay
                    on this device.
                  </p>
                </div>

                <div className={styles.trustLine}>
                  <span>Private by default</span>
                  <span>Batch ready</span>
                  <span>No account</span>
                </div>
              </div>

              <DropZone onFiles={workspace.addFiles} />
            </motion.section>
          ) : (
            <motion.div
              key="workspace"
              className={styles.workspace}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
            >
              <div className={styles.workspaceTop}>
                <div className={styles.workspaceHeading}>
                  <p className={styles.eyebrow}>Workspace</p>
                  <h1>Image conversion</h1>
                  <div className={styles.workspaceMeta}>
                    <span>
                      {items.length} {items.length === 1 ? 'image' : 'images'}
                    </span>
                    <i />
                    <span>{formatBytes(totalInputBytes)}</span>
                    {completedCount > 0 && (
                      <>
                        <i />
                        <span>{completedCount} complete</span>
                      </>
                    )}
                  </div>
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
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
