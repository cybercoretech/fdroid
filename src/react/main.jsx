import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './widgets.css';

const REPO_URL = 'https://cybercoretech.github.io/fdroid/repo';
const REPO_FP = 'DE3718769E4C4BE6E26344C7031B88FA9671AF25EA957981552EC420E34FF3C3';
const REPO_FP_SPACED = REPO_FP.match(/.{1,4}/g).join(' ');
const REPO_KEY_SHORT = `${REPO_FP.slice(0, 12)}…${REPO_FP.slice(-8)}`;
const latestVersion = (pkg) => Object.values(pkg.versions || {}).sort((a, b) => b.manifest.versionCode - a.manifest.versionCode)[0];
const localized = (value) => (value && (value['en-US'] ?? Object.values(value)[0])) || '';
const packagesFrom = (index) => Object.entries(index?.packages || {}).map(([id, pkg]) => ({ id, pkg, version: latestVersion(pkg) }))
  .filter((item) => item.version).sort((a, b) => localized(a.pkg.metadata.name).localeCompare(localized(b.pkg.metadata.name)));

let repositorySnapshot = window.fdroidRepositoryStatus || { state: window.fdroidRepositoryIndex ? 'online' : 'loading' };
const repositoryListeners = new Set();
window.addEventListener('fdroid-index-status', (event) => {
  repositorySnapshot = event.detail || { state: 'offline' };
  repositoryListeners.forEach((listener) => listener());
});
function useRepository() {
  const [snapshot, setSnapshot] = useState(repositorySnapshot);
  useEffect(() => {
    const update = () => setSnapshot(repositorySnapshot);
    repositoryListeners.add(update);
    update();
    return () => repositoryListeners.delete(update);
  }, []);
  return { ...snapshot, index: window.fdroidRepositoryIndex };
}

async function copyText(value, setCopied) {
  try {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  } catch {
    setCopied(false);
    window.alert('Copy was unavailable. Select and copy the text manually.');
  }
}

function CopyButton({ value, children = 'COPY' }) {
  const [copied, setCopied] = useState(false);
  return <button className="widget-copy" type="button" onClick={() => copyText(value, setCopied)}>{copied ? 'COPIED ✓' : children}</button>;
}

function RepositoryStatus() {
  const state = useRepository();
  const stamp = state.timestamp ? new Date(state.timestamp).toISOString().replace('T', ' ').slice(0, 16) + ' UTC' : 'Not available yet';
  return <section className={`repo-status is-${state.state}`} aria-live="polite" aria-atomic="true">
    <span className="status-lamp" aria-hidden="true" />
    <div className="status-copy"><b>REPOSITORY INDEX · {state.state === 'online' ? 'ONLINE' : state.state === 'offline' ? 'UNAVAILABLE' : 'CONNECTING'}</b>
      <span>{state.state === 'online' ? `${state.appCount} apps · index timestamp ${stamp}` : state.state === 'offline' ? `Could not load index in this page · ${state.error || 'check your connection'}` : 'Loading the current app index…'}</span></div>
    <a href={`${REPO_URL}/index-v2.json`} target="_blank" rel="noreferrer">INDEX JSON ↗</a>
  </section>;
}

function StatInfo({ kind }) {
  const state = useRepository();
  const apps = packagesFrom(state.index);
  const info = window.fdroidRepositoryInfo || {};
  const names = apps.map((app) => <a key={app.id} href={`#app=${encodeURIComponent(app.id)}`}>{localized(app.pkg.metadata.name)}</a>);
  const latestSizeRows = apps.map((app) => <li key={app.id}><a href={`#app=${encodeURIComponent(app.id)}`}>{localized(app.pkg.metadata.name)}</a><span>{(app.version.file.size / 1e6).toFixed(1)} MB</span></li>);
  const items = {
    apps: { title: 'Apps in this repository', body: <>{info.appCount || apps.length || 0} distinct Android applications, loaded from the current F-Droid index. Choose one to open its manifest-backed details.</>, links: <div className="stat-pop-list">{names}</div> },
    versions: { title: 'Signed builds', body: <>{info.versionCount || 0} APK versions are listed across {info.appCount || apps.length || 0} apps. F-Droid offers compatible updates from the repository.</>, links: <a href="#updates">VIEW RECENT BUILDS ↗</a> },
    size: { title: 'Latest APK download size', body: <>About {((info.latestApkBytes || 0) / 1e6).toFixed(1)} MB combined for one latest APK per app. This is download size, not installed storage.</>, links: <ul className="stat-size-list">{latestSizeRows}</ul> },
    trackers: { title: 'Declared tracker anti-feature', body: <>{info.trackerCount || 0} app listings currently declare F-Droid’s “Tracking” anti-feature. This is metadata—not a live network or code audit. Apps that need your own server are separately identified.</>, links: <a href="#trust">HOW THE LISTING IS VERIFIED ↗</a> },
  };
  const content = items[kind];
  if (!content) return null;
  return <details className="stat-info"><summary aria-label={`Show details: ${content.title}`} title={`Open ${content.title}`}><span className="stat-info-icon" aria-hidden="true">i</span></summary><div className="stat-popover"><b>{content.title}</b><p>{content.body}</p>{content.links}</div></details>;
}

function SetupAssistant() {
  const [device, setDevice] = useState('android');
  const [client, setClient] = useState('F-Droid');
  const addLink = `fdroidrepos://cybercoretech.github.io/fdroid/repo?fingerprint=${REPO_FP}`;
  const steps = device === 'desktop'
    ? ['Keep this page open on your computer so the QR code is easy to scan.', 'On your Android device, open your F-Droid-compatible client → Repositories → Add.', 'Scan the QR code or paste the URL, then verify the signing fingerprint before accepting.']
    : client === 'F-Droid'
      ? ['Tap the add button to open F-Droid, or choose Repositories → + and scan the QR code.', 'Confirm the repository fingerprint matches the value shown below.', 'Refresh repositories; install an app and receive updates through your client.']
      : [`Open ${client} and find its repository management screen.`, 'Choose Add repository and scan the QR code or paste the repository URL.', 'Compare the signing fingerprint before saving, then refresh the repository.'];
  return <section className="widget-card setup-widget" aria-labelledby="setupTitle">
    <header className="widget-headingline"><div><span className="eyebrow">REPOSITORY SETUP</span><h3 id="setupTitle">Add the right way.</h3></div><span className="widget-index">01 / CONNECT</span></header>
    <div className="widget-controls">
      <fieldset><legend>DEVICE</legend><label><input type="radio" name="setup-device" checked={device === 'android'} onChange={() => setDevice('android')} /> Android phone / tablet</label><label><input type="radio" name="setup-device" checked={device === 'desktop'} onChange={() => setDevice('desktop')} /> Desktop instructions</label></fieldset>
      {device === 'android' && <label className="select-label">CLIENT<select value={client} onChange={(event) => setClient(event.target.value)}><option>F-Droid</option><option>Droid-ify</option><option>Neo Store</option></select></label>}
    </div>
    <div className="setup-content"><div className="setup-symbol" aria-hidden="true">↗</div>
      <div className="setup-details"><span className="label">ONE REPOSITORY KEY FOR EVERY CLIENT</span><p>The QR code, repository URL, and SHA-256 fingerprint are in the panel above. Confirm that fingerprint inside your client before adding this source.</p></div>
    </div>
    <ol className="widget-steps">{steps.map((step) => <li key={step}>{step}</li>)}</ol>
    {device === 'android' && client === 'F-Droid' ? <a className="widget-action" href={addLink}>ADD IN F-DROID ↗</a> : <CopyButton value={REPO_URL}>COPY REPOSITORY URL</CopyButton>}
  </section>;
}

const permissionGroups = [
  { id: 'network', title: 'Network access', match: (names) => names.some((name) => /INTERNET|ACCESS_NETWORK_STATE|CHANGE_NETWORK_STATE|ACCESS_WIFI_STATE|CHANGE_WIFI_STATE|NEARBY_WIFI_DEVICES/.test(name)) },
  { id: 'camera', title: 'Camera & sensors', match: (names) => names.some((name) => /CAMERA|RECORD_AUDIO|BODY_SENSORS|ACTIVITY_RECOGNITION/.test(name)) },
  { id: 'biometric', title: 'Biometrics', match: (names) => names.some((name) => /USE_BIOMETRIC|USE_FINGERPRINT/.test(name)) },
  { id: 'media', title: 'Photos & files', match: (names) => names.some((name) => /READ_MEDIA|READ_EXTERNAL_STORAGE|WRITE_EXTERNAL_STORAGE|MANAGE_EXTERNAL_STORAGE|ACCESS_MEDIA_LOCATION/.test(name)) },
  { id: 'background', title: 'Background work', match: (names) => names.some((name) => /FOREGROUND_SERVICE|WAKE_LOCK|RECEIVE_BOOT_COMPLETED|SCHEDULE_EXACT_ALARM/.test(name)) },
];
function permissionNames(item) {
  return new Set((item.version.manifest.usesPermission || []).map((permission) => permission.name.split('.').pop()).filter((name) => !name.endsWith('DYNAMIC_RECEIVER_NOT_EXPORTED_PERMISSION')));
}

function PermissionCompare() {
  const state = useRepository();
  const apps = useMemo(() => packagesFrom(state.index), [state.index]);
  const [selected, setSelected] = useState([]);
  const [group, setGroup] = useState('all');
  const initialized = useRef(false);
  useEffect(() => { if (apps.length && !initialized.current) { initialized.current = true; setSelected(apps.slice(0, Math.min(3, apps.length)).map((app) => app.id)); } }, [apps]);
  if (!apps.length) return <div className="widget-card widget-loading">{state.state === 'offline' ? 'Permission data is unavailable while the repository index is offline.' : 'Waiting for the current repository index…'}</div>;
  const active = apps.filter((app) => selected.includes(app.id));
  const toggle = (id) => setSelected((current) => current.includes(id) ? current.filter((value) => value !== id) : current.length < 4 ? [...current, id] : current);
  const rows = permissionGroups.filter((item) => group === 'all' || item.id === group).map((item) => ({ title: item.title, has: active.map((app) => item.match(permissionNames(app))) }));
  const allNames = [...new Set(active.flatMap((app) => [...permissionNames(app)]))].sort();
  const knownNames = new Set(['INTERNET', 'ACCESS_NETWORK_STATE', 'CHANGE_NETWORK_STATE', 'ACCESS_WIFI_STATE', 'CHANGE_WIFI_STATE', 'NEARBY_WIFI_DEVICES', 'CAMERA', 'RECORD_AUDIO', 'BODY_SENSORS', 'ACTIVITY_RECOGNITION', 'USE_BIOMETRIC', 'USE_FINGERPRINT', 'READ_MEDIA_IMAGES', 'READ_MEDIA_VIDEO', 'READ_MEDIA_AUDIO', 'READ_EXTERNAL_STORAGE', 'WRITE_EXTERNAL_STORAGE', 'MANAGE_EXTERNAL_STORAGE', 'ACCESS_MEDIA_LOCATION', 'FOREGROUND_SERVICE', 'WAKE_LOCK', 'RECEIVE_BOOT_COMPLETED', 'SCHEDULE_EXACT_ALARM']);
  const otherNames = allNames.filter((name) => !knownNames.has(name));
  if (group === 'all' || group === 'other') rows.push(...otherNames.map((name) => ({ title: name, has: active.map((app) => permissionNames(app).has(name)) })));
  return <section className="widget-card" aria-labelledby="permissionsTitle">
    <header className="widget-headingline"><div><span className="eyebrow">MANIFEST DATA</span><h3 id="permissionsTitle">Permission comparison</h3></div><span className="widget-index">SELECT UP TO 4 APPS</span></header>
    <div className="app-picks" aria-label="Choose apps to compare">{apps.map((app) => <label key={app.id} className="app-pick"><input type="checkbox" checked={selected.includes(app.id)} onChange={() => toggle(app.id)} disabled={!selected.includes(app.id) && selected.length >= 4} /><span>{localized(app.pkg.metadata.name)}</span></label>)}</div>
    <div className="compare-filter" role="group" aria-label="Permission category">{[{ id: 'all', title: 'ALL' }, ...permissionGroups.map(({ id, title }) => ({ id, title: title.toUpperCase() }))].map((item) => <button type="button" key={item.id} aria-pressed={group === item.id} onClick={() => setGroup(item.id)}>{item.title}</button>)}</div>
    {active.length ? <div className="compare-scroll" role="region" aria-label="Permission comparison table" tabIndex="0"><table className="compare-table"><thead><tr><th scope="col">PERMISSION CATEGORY</th>{active.map((app) => <th scope="col" key={app.id}>{localized(app.pkg.metadata.name)}</th>)}</tr></thead><tbody>{rows.map((row) => <tr key={row.title}><th scope="row">{row.title}{row.names && <small>{row.names.join(', ')}</small>}</th>{row.has.map((has, index) => <td key={`${row.title}-${active[index].id}`}><span className={has ? 'perm-present' : 'perm-absent'}>{has ? 'DECLARED ✓' : 'NOT DECLARED'}</span></td>)}</tr>)}</tbody></table></div> : <p className="widget-loading">Select one or more apps to compare.</p>}
  </section>;
}

function TrustExplorer() {
  const state = useRepository();
  const apps = useMemo(() => packagesFrom(state.index), [state.index]);
  const [appId, setAppId] = useState('');
  useEffect(() => { if (!appId && apps.length) setAppId(apps[0].id); }, [appId, apps]);
  const item = apps.find((app) => app.id === appId);
  if (!item) return <div className="widget-card widget-loading">{state.state === 'offline' ? 'Package verification data is unavailable while the index is offline.' : 'Loading package verification data…'}</div>;
  const name = localized(item.pkg.metadata.name);
  const apkUrl = new URL(`repo${item.version.file.name}`, location.href).href;
  const filename = item.version.file.name.split('/').pop();
  const sha = item.version.file.sha256;
  const signer = item.version.manifest.signer?.sha256?.[0] || 'Not present in index manifest';
  const command = `curl -fsSLO '${apkUrl}' && printf '%s  %s\\n' '${sha}' '${filename}' | sha256sum --check && apksigner verify --print-certs '${filename}'`;
  const indexCommand = `curl -fsSLo index-v1.jar '${REPO_URL}/index-v1.jar' && keytool -printcert -jarfile index-v1.jar`;
  return <section className="widget-card trust-widget" aria-labelledby="trustExplorerTitle">
    <header className="widget-headingline"><div><span className="eyebrow">SIGNED DISTRIBUTION</span><h3 id="trustExplorerTitle">Trust-chain explorer</h3></div><span className="widget-index">APK · INDEX · ANDROID</span></header>
    <label className="select-label trust-select">APP<select value={appId} onChange={(event) => setAppId(event.target.value)}>{apps.map((app) => <option key={app.id} value={app.id}>{localized(app.pkg.metadata.name)} · {app.version.manifest.versionName}</option>)}</select></label>
    <ol className="trust-stages"><li><b>01 / RELEASE APK</b><span>{name} v{item.version.manifest.versionName} · versionCode {item.version.manifest.versionCode}</span><code>SHA-256 · {sha}</code></li><li><b>02 / ANDROID SIGNER</b><span>Android checks updates against the app’s developer signing certificate.</span><code>Certificate · {signer}</code></li><li><b>03 / F-DROID INDEX</b><span>F-Droid checks the repository index signature when refreshing this source.</span><code>Repository key · {REPO_KEY_SHORT}</code></li></ol>
    <div className="verification-command"><div><span className="label">VERIFY APK HASH + INSPECT ANDROID SIGNER</span><pre><code>{command}</code></pre></div><CopyButton value={command}>COPY COMMAND</CopyButton></div>
    <div className="verification-command"><div><span className="label">INSPECT THE INDEX CERTIFICATE FINGERPRINT</span><pre><code>{indexCommand}</code></pre></div><CopyButton value={indexCommand}>COPY COMMAND</CopyButton></div>
    <p className="trust-note">Compare the printed repository certificate with {REPO_FP_SPACED}. This command displays the certificate identity; it does not replace signature verification. Let your F-Droid client validate the signed repository index, then compare the app signer with your expected developer key. This page displays published metadata and does not perform those cryptographic checks itself. <a href="https://f-droid.org/docs/Security_Model/" target="_blank" rel="noreferrer">F-Droid security model ↗</a></p>
  </section>;
}

function ParticleEffects() {
  useEffect(() => {
    const canvas = document.createElement('canvas');
    canvas.className = 'effects-canvas';
    canvas.setAttribute('aria-hidden', 'true');
    document.body.append(canvas);
    const ctx = canvas.getContext('2d');
    const fine = matchMedia('(pointer: fine)').matches;
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const particles = [];
    let raf = 0, width = 0, height = 0, lastTrail = 0;
    const resize = () => { const ratio = Math.min(devicePixelRatio || 1, 1.5); width = canvas.width = innerWidth * ratio; height = canvas.height = innerHeight * ratio; canvas.style.width = `${innerWidth}px`; canvas.style.height = `${innerHeight}px`; ctx.setTransform(ratio, 0, 0, ratio, 0, 0); };
    const colors = () => { const css = getComputedStyle(document.documentElement); return [css.getPropertyValue('--a1').trim() || '#00e5ff', css.getPropertyValue('--a2').trim() || '#ff147f', css.getPropertyValue('--a3').trim() || '#39ff33']; };
    const burst = (x, y, count, speed = 1.8) => {
      if (reduced || !fine || document.hidden) return;
      const palette = colors();
      for (let i = 0; i < count && particles.length < 70; i++) { const angle = Math.random() * Math.PI * 2, velocity = .35 + Math.random() * speed; particles.push({ x, y, vx: Math.cos(angle) * velocity, vy: Math.sin(angle) * velocity - .55, life: 1, size: 1 + Math.random() * 2, color: palette[Math.floor(Math.random() * palette.length)] }); }
      if (!raf) raf = requestAnimationFrame(draw);
    };
    const draw = () => {
      raf = 0;
      if (document.hidden) { particles.length = 0; return; }
      ctx.clearRect(0, 0, innerWidth, innerHeight);
      for (let i = particles.length - 1; i >= 0; i--) { const p = particles[i]; p.x += p.vx; p.y += p.vy; p.vy += .025; p.life -= .035; if (p.life <= 0) { particles.splice(i, 1); continue; } ctx.globalAlpha = p.life; ctx.fillStyle = p.color; ctx.shadowBlur = 8; ctx.shadowColor = p.color; ctx.beginPath(); ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2); ctx.fill(); }
      ctx.globalAlpha = 1; ctx.shadowBlur = 0;
      if (particles.length) raf = requestAnimationFrame(draw);
    };
    const move = (event) => { const now = performance.now(); if (now - lastTrail < 28) return; lastTrail = now; burst(event.clientX, event.clientY, 1, .8); };
    const measure = document.createElement('canvas').getContext('2d');
    const onVisibility = () => { if (document.hidden) particles.length = 0; };
    const input = (event) => {
      if (event.target?.id !== 'appSearch' || event.isComposing) return;
      const field = event.target, style = getComputedStyle(field);
      measure.font = style.font;
      const caret = field.selectionStart ?? field.value.length;
      const x = field.getBoundingClientRect().left + parseFloat(style.paddingLeft || 0) + measure.measureText(field.value.slice(0, caret)).width - field.scrollLeft;
      const y = field.getBoundingClientRect().top + field.getBoundingClientRect().height / 2;
      burst(Math.min(x, field.getBoundingClientRect().right - 5), y, 5, 2.1);
    };
    resize();
    if (fine && !reduced) { addEventListener('pointermove', move, { passive: true }); document.addEventListener('input', input); }
    addEventListener('resize', resize, { passive: true });
    document.addEventListener('visibilitychange', onVisibility);
    return () => { removeEventListener('pointermove', move); removeEventListener('input', input); removeEventListener('resize', resize); document.removeEventListener('visibilitychange', onVisibility); if (raf) cancelAnimationFrame(raf); canvas.remove(); };
  }, []);
  return null;
}

function mount(id, Component) {
  const node = document.getElementById(id);
  if (node) createRoot(node).render(<Component />);
}

mount('repositoryStatusMount', RepositoryStatus);
mount('setupAssistantMount', SetupAssistant);
mount('permissionCompareMount', PermissionCompare);
mount('trustExplorerMount', TrustExplorer);
mount('mouseTrailMount', ParticleEffects);
for (const [id, kind] of [['statApps', 'apps'], ['statVersions', 'versions'], ['statSize', 'size'], ['statTrackers', 'trackers']]) {
  const stat = document.getElementById(id)?.closest('.stat');
  if (!stat) continue;
  const node = document.createElement('div');
  node.className = 'stat-info-mount';
  stat.append(node);
  createRoot(node).render(<StatInfo kind={kind} />);
}
