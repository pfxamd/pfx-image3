import { useRef, useState, type ChangeEvent } from 'react';
import { FileRail } from './components/FileRail.js';
import { PreviewStage } from './components/PreviewStage.js';
import { ProcessingPanel, type SettingsScope } from './components/ProcessingPanel.js';
import { useImageWorkspace } from './features/workspace/useImageWorkspace.js';
import logoUrl from './assets/Red-pfx.svg';
import styles from './App.module.css';

export function App() {
  const workspace = useImageWorkspace();
  const { items, settings } = workspace.state;
  const [selectedId, setSelectedId] = useState<string>();
  const [scope, setScope] = useState<SettingsScope>('all');
  const [notice, setNotice] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const selected = items.find((item) => item.id === selectedId) ?? items[0];
  const effectiveSettings = scope === 'selected'
    ? (selected?.overrideSettings ?? settings)
    : settings;
  const activeCount = items.filter((item) => item.status === 'converting').length;
  const completedCount = items.filter((item) => item.result !== undefined).length;
  const readyCount = items.filter((item) => item.result === undefined && item.status !== 'converting').length;

  function handleFiles(files: readonly File[]) {
    const outcome = workspace.addFiles(files);
    if (outcome.rejected) setNotice(String(outcome.rejected) + ' unsupported file(s) skipped.');
    else setNotice('');
    return outcome;
  }

  function handlePicker(event: ChangeEvent<HTMLInputElement>) {
    handleFiles(Array.from(event.target.files ?? []));
    event.target.value = '';
  }

  function onSettings(patch: Parameters<typeof workspace.updateSettings>[0]) {
    workspace.updateSettings(patch, scope === 'selected' ? selected?.id : undefined);
  }

  function clearAll() {
    if (activeCount || !items.length) return;
    if (window.confirm('Remove all images and their processed results?')) {
      workspace.clearItems();
      setSelectedId(undefined);
      setNotice('');
    }
  }

  return (
    <div className={styles.app}>
      <header className={styles.appHeader}>
        <a href="./" className={styles.brand} aria-label="PFx Image Studio home">
          <img src={logoUrl} alt="" />
          <span className={styles.brandWords}>
            <strong>PFx Image Studio</strong><small>IMAGE WORKSPACE</small>
          </span>
          <span className={styles.version}>Beta 0.1</span>
        </a>
        <div className={styles.headerActions}>
          <span className={styles.localStatus}><i /> Local processing</span>
          <button className={styles.headerAdd} type="button" onClick={() => inputRef.current?.click()}>
            <span aria-hidden="true">＋</span> Add images
          </button>
          <input ref={inputRef} className={styles.srOnly} type="file" multiple
            accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
            onChange={handlePicker} aria-label="Choose images to add" />
        </div>
      </header>

      <main className={styles.workArea}>
        {notice && <p className={styles.globalNotice} role="status">{notice}</p>}
        <div className={styles.workspaceGrid}>
          <FileRail items={items} selectedId={selected?.id} onSelect={setSelectedId} onFiles={handleFiles} />
          <PreviewStage selected={selected} onFiles={handleFiles} />
          <ProcessingPanel selected={selected} settings={effectiveSettings} scope={scope}
            onScope={setScope} onSettings={onSettings} activeCount={activeCount}
            readyCount={readyCount} completedCount={completedCount} itemCount={items.length}
            onConvert={() => { if (selected) void workspace.convertItem(selected.id); }}
            onConvertAll={() => { void workspace.convertAll(); }}
            onCancel={() => { if (selected) workspace.cancelItem(selected.id); }}
            onCancelAll={workspace.cancelAll}
            onDownload={() => { if (selected) workspace.downloadItem(selected.id); }}
            onDownloadAll={workspace.downloadAll}
            onRetry={() => { if (selected) void workspace.retryItem(selected.id); }}
            onRemove={() => { if (selected) workspace.removeItem(selected.id); }}
            onClear={clearAll}
          />
        </div>
        <footer className={styles.appFooter}>
          <span>PFx Image Studio</span><span>Your images are not uploaded.</span>
        </footer>
      </main>
    </div>
  );
}
