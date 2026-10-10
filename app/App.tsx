import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { FileRail } from './components/FileRail.js';
import { PreviewStage } from './components/PreviewStage.js';
import { ProcessingPanel, type SettingsScope } from './components/ProcessingPanel.js';
import { useImageWorkspace } from './features/workspace/useImageWorkspace.js';
import logoUrl from './assets/Red-pfx.svg';
import styles from './App.module.css';
import { studioReleaseLabel } from './release.js';

type StudioTheme = 'dark' | 'light';

const THEME_KEY = 'pfx-image-studio.theme';

function getInitialTheme(): StudioTheme {
  if (typeof window === 'undefined') return 'dark';
  try {
    const saved = window.localStorage.getItem(THEME_KEY);
    if (saved === 'light' || saved === 'dark') return saved;
  } catch {
    // Private browsing may disable storage.
  }
  return window.matchMedia?.('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
}

export function App() {
  const workspace = useImageWorkspace();
  const { items, settings } = workspace.state;
  const [selectedId, setSelectedId] = useState<string>();
  const [scope, setScope] = useState<SettingsScope>('all');
  const [notice, setNotice] = useState('');
  const [theme, setTheme] = useState<StudioTheme>(getInitialTheme);

  useEffect(() => {
    document.documentElement.dataset.studioTheme = theme;
    try {
      window.localStorage.setItem(THEME_KEY, theme);
    } catch {
      // Theme still works for this session when storage is unavailable.
    }
  }, [theme]);
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
    <div className={styles.app} data-theme={theme}>
      <header className={styles.appHeader}>
        <a href="./" className={styles.brand} aria-label="PFx Image Studio home">
          <img src={logoUrl} alt="" />
          <span className={styles.brandWords}>
            <strong>PFx Image Studio</strong>
          </span>
          <span className={styles.version}>{studioReleaseLabel}</span>
        </a>
        <div className={styles.headerActions}>
          <button
            type="button"
            className={styles.themeToggle}
            aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
            onClick={() => setTheme((current) => current === 'dark' ? 'light' : 'dark')}
          >
            {theme === 'dark' ? (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
                <circle cx="12" cy="12" r="4" />
                <path d="M12 2v2m0 16v2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M2 12h2m16 0h2M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M20.7 13.2A9 9 0 0 1 10.8 3.3 9 9 0 1 0 20.7 13.2Z" />
              </svg>
            )}
          </button>
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
          <span>{items.length} {items.length === 1 ? 'image' : 'images'} in workspace</span><span>Processed locally · No uploads</span>
        </footer>
      </main>
    </div>
  );
}
