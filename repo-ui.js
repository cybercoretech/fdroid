// Cybercore F-Droid landing page. App cards, stats and the update timeline are
// built from the signed repository index (repo/index-v2.json, same origin), so
// the page always matches what F-Droid clients see. Everything is rendered with
// textContent / DOM nodes: no innerHTML from index data.
(() => {
  'use strict';
  const REPO = 'repo';
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (s, r = document) => r.querySelector(s);
  const el = (tag, props = {}, ...kids) => {
    const n = Object.assign(document.createElement(tag), props);
    for (const k of kids.flat()) if (k != null) n.append(k);
    return n;
  };
  const en = (o) => (o && (o['en-US'] ?? Object.values(o)[0])) || '';
  const mb = (b) => (b / 1e6).toFixed(1);
  const ago = (ms) => {
    const d = Math.max(0, Math.round((Date.now() - ms) / 864e5));
    return d === 0 ? 'TODAY' : d === 1 ? 'YESTERDAY' : d < 31 ? `${d} DAYS AGO` : new Date(ms).toISOString().slice(0, 10);
  };
  const PERM = {
    INTERNET: '🌐 Network access', ACCESS_NETWORK_STATE: '📶 See network state', CAMERA: '📷 Camera',
    USE_BIOMETRIC: '🧬 Biometric prompt', POST_NOTIFICATIONS: '🔔 Notifications', FOREGROUND_SERVICE: '⚙️ Foreground service',
    FOREGROUND_SERVICE_DATA_SYNC: '🔄 Background sync', WAKE_LOCK: '⏰ Keep awake for sync', RECEIVE_BOOT_COMPLETED: '🚀 Start after reboot',
    ACCESS_MEDIA_LOCATION: '📍 Photo location data', READ_MEDIA_IMAGES: '🖼️ Read photos',
  };
  const permsOf = (v) => (v.manifest.usesPermission || []).map((p) => p.name.split('.').pop())
    .filter((p) => !p.endsWith('DYNAMIC_RECEIVER_NOT_EXPORTED_PERMISSION'));

  // ---- toast + copy ------------------------------------------------------
  const toast = el('div', { className: 'toast', role: 'status' });
  document.body.append(toast);
  let toastTimer;
  const say = (msg) => { toast.textContent = msg; toast.classList.add('on'); clearTimeout(toastTimer); toastTimer = setTimeout(() => toast.classList.remove('on'), 1800); };
  document.addEventListener('click', async (e) => {
    const b = e.target.closest('[data-copy-text]');
    if (!b) return;
    try { await navigator.clipboard.writeText(b.dataset.copyText); say('COPIED ✓'); } catch { say('COPY FAILED: SELECT IT MANUALLY'); }
  });

  // ---- fingerprint, grouped for eyeballing --------------------------------
  const fpBox = $('#fpGrid');
  if (fpBox) for (const g of fpBox.dataset.fp.match(/.{4}/g)) fpBox.append(el('span', { textContent: g }));

  // ---- radar sweep behind the hero ----------------------------------------
  const cv = $('#radar');
  if (cv && !reduced) {
    const ctx = cv.getContext('2d');
    const css = getComputedStyle(document.documentElement);
    const col = (v, f) => (css.getPropertyValue(v).trim() || f);
    let w = 0, h = 0, t = 0;
    const blips = Array.from({ length: 14 }, () => ({ a: Math.random() * Math.PI * 2, r: .25 + Math.random() * .7, life: 0 }));
    const size = () => { const r = cv.getBoundingClientRect(); w = cv.width = r.width * devicePixelRatio; h = cv.height = r.height * devicePixelRatio; };
    size(); addEventListener('resize', size);
    const draw = () => {
      if (document.hidden) { requestAnimationFrame(draw); return; }
      const cx = w * .74, cy = h * .46, R = Math.min(w, h) * .62, cyan = col('--cyan', '#00f0ff'), pink = col('--pink', '#ff2bd6');
      ctx.clearRect(0, 0, w, h);
      ctx.strokeStyle = cyan; ctx.globalAlpha = .12; ctx.lineWidth = devicePixelRatio;
      for (let i = 1; i <= 4; i++) { ctx.beginPath(); ctx.arc(cx, cy, R * i / 4, 0, Math.PI * 2); ctx.stroke(); }
      const a = (t / 240) % (Math.PI * 2);
      const g = ctx.createConicGradient ? ctx.createConicGradient(a - .9, cx, cy) : null;
      if (g) { g.addColorStop(0, 'transparent'); g.addColorStop(.14, cyan); g.addColorStop(.145, 'transparent'); ctx.globalAlpha = .22; ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.fill(); }
      for (const b of blips) {
        const d = Math.abs(((a - b.a) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2));
        if (d < .05) b.life = 1;
        if (b.life > 0) { ctx.globalAlpha = b.life * .9; ctx.fillStyle = pink; ctx.beginPath(); ctx.arc(cx + Math.cos(b.a) * R * b.r, cy + Math.sin(b.a) * R * b.r, 3 * devicePixelRatio, 0, Math.PI * 2); ctx.fill(); b.life -= .006; }
      }
      ctx.globalAlpha = 1; t++; requestAnimationFrame(draw);
    };
    requestAnimationFrame(draw);
  }

  // ---- counters ------------------------------------------------------------
  const count = (node, to, dec = 0) => {
    node.closest('.stat')?.classList.add('on');
    if (reduced) { node.textContent = to.toFixed(dec); return; }
    const t0 = performance.now(), dur = 1300;
    let done = false;
    const step = (now) => {
      if (done) return;
      const p = Math.min(1, (now - t0) / dur), e = 1 - (1 - p) ** 3;
      node.textContent = (to * e).toFixed(dec);
      if (p < 1) requestAnimationFrame(step); else done = true;
    };
    requestAnimationFrame(step);
    // rAF pauses in background tabs: finish on a timer too, and stop the loop
    // so a late frame can't overwrite the final value.
    setTimeout(() => { done = true; node.textContent = to.toFixed(dec); }, dur + 150);
  };

  // ---- reveal-on-scroll for generated cards -------------------------------
  const io = 'IntersectionObserver' in window
    ? new IntersectionObserver((es) => es.forEach((x) => { if (x.isIntersecting) { x.target.classList.add('in'); io.unobserve(x.target); } }), { threshold: .12 })
    : null;

  // ---- tilt + spotlight ----------------------------------------------------
  const tilt = (card) => {
    if (reduced) return;
    card.addEventListener('pointermove', (e) => {
      const r = card.getBoundingClientRect(), x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
      card.style.setProperty('--mx', `${x * 100}%`); card.style.setProperty('--my', `${y * 100}%`);
      card.style.setProperty('--ry', `${(x - .5) * 8}deg`); card.style.setProperty('--rx', `${(.5 - y) * 8}deg`);
    });
    card.addEventListener('pointerleave', () => { card.style.setProperty('--rx', '0deg'); card.style.setProperty('--ry', '0deg'); });
  };

  // ---- description: F-Droid's light markdown → DOM -------------------------
  const desc = (text) => {
    // Blank lines separate paragraphs; wrapped lines inside one are joined.
    const box = el('div', { className: 'dlg-desc' });
    let list = null, para = null;
    for (const line of text.split('\n')) {
      const l = line.trim();
      if (!l) { list = null; para = null; continue; }
      if (/^[*-]\s+/.test(l)) {
        para = null;
        if (!list) { list = el('ul'); box.append(list); }
        list.append(el('li', { textContent: l.replace(/^[*-]\s+/, '') }));
      } else if (list && list.lastChild) {
        list.lastChild.textContent += ` ${l}`;
      } else if (para) {
        para.textContent += ` ${l}`;
      } else {
        para = el('p', { textContent: l }); box.append(para);
      }
    }
    return box;
  };

  // ---- detail dialog -------------------------------------------------------
  const dlg = $('#appDialog');
  const openApp = (id, p) => {
    const m = p.metadata, v = Object.values(p.versions).sort((a, b) => b.manifest.versionCode - a.manifest.versionCode)[0];
    const perms = permsOf(v), af = v.antiFeatures || {};
    const shots = (m.screenshots?.phone && en(m.screenshots.phone)) || [];
    const signer = v.manifest.signer?.sha256?.[0] || '';
    const link = (href, text, cls = 'btn ghost') => href ? el('a', { className: cls, href, target: '_blank', rel: 'noopener', textContent: text }) : null;
    dlg.replaceChildren(el('div', { className: 'dlg' },
      el('div', { className: 'dlg-head' },
        el('img', { src: REPO + en(m.icon).name, alt: '', width: 92, height: 92 }),
        el('div', {}, el('h2', { textContent: en(m.name) }), el('p', { className: 'sum', textContent: en(m.summary) })),
        el('button', { className: 'chip-btn dlg-close', type: 'button', textContent: 'CLOSE ✕', onclick: () => dlg.close() })),
      el('div', { className: 'badges' },
        el('span', { className: 'badge ver', textContent: `v${v.manifest.versionName}` }),
        el('span', { className: 'badge', textContent: `${mb(v.file.size)} MB` }),
        el('span', { className: 'badge', textContent: `UPDATED ${ago(v.added)}` }),
        el('span', { className: 'badge', textContent: m.license }),
        perms.includes('INTERNET') ? el('span', { className: 'badge net', textContent: 'NETWORK' }) : el('span', { className: 'badge offline', textContent: 'OFFLINE · NO INTERNET' }),
        ...Object.values(af).map((x) => el('span', { className: 'badge self', textContent: en(x).toUpperCase() }))),
      desc(en(m.description)),
      shots.length ? el('div', { className: 'shots' }, shots.map((s, i) => el('img', { src: REPO + s.name, alt: `${en(m.name)} screenshot ${i + 1}`, loading: 'lazy', width: 1080, height: 2400 }))) : null,
      el('div', { className: 'facts' },
        el('div', { className: 'fact' }, el('span', { textContent: 'PACKAGE' }), el('code', { textContent: id })),
        el('div', { className: 'fact' }, el('span', { textContent: 'DEVELOPER SIGNER (SHA-256)' }), el('code', { textContent: signer })),
        el('div', { className: 'fact' }, el('span', { textContent: 'APK SHA-256' }), el('code', { textContent: v.file.sha256 })),
        el('div', { className: 'fact' }, el('span', { textContent: 'ANDROID' }), el('code', { textContent: `min SDK ${v.manifest.usesSdk?.minSdkVersion ?? '?'} · target ${v.manifest.usesSdk?.targetSdkVersion ?? '?'}` }))),
      el('div', {}, el('span', { className: 'label', textContent: 'PERMISSIONS' }),
        el('div', { className: 'perms' }, perms.length ? perms.map((p) => el('span', { className: 'badge', textContent: PERM[p] || p })) : el('span', { className: 'badge offline', textContent: 'NONE' }))),
      el('div', { className: 'dlg-actions' },
        link(`${REPO}${v.file.name}`, 'DOWNLOAD APK ↓', 'btn'),
        link(m.sourceCode, 'SOURCE ↗'), m.webSite !== m.sourceCode ? link(m.webSite, 'SITE ↗') : null, link(m.changelog, 'RELEASES ↗'))));
    dlg.showModal();
    window.cybercorePageScrollLock?.lock('app-details');
  };
  dlg?.addEventListener('click', (e) => { if (e.target === dlg) dlg.close(); });
  dlg?.addEventListener('close', () => {
    window.cybercorePageScrollLock?.unlock('app-details');
    if (location.hash.startsWith('#app=')) history.replaceState(null, '', location.pathname + location.search);
  });

  // ---- render --------------------------------------------------------------
  window.fdroidRepositoryStatus = { state: 'loading', checkedAt: Date.now() };
  window.dispatchEvent(new CustomEvent('fdroid-index-status', { detail: window.fdroidRepositoryStatus }));
  fetch(`${REPO}/index-v2.json`, { cache: 'no-cache' }).then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); }).then((index) => {
    window.fdroidRepositoryInfo = { timestamp: index.repo?.timestamp, appCount: Object.keys(index.packages || {}).length };
    window.fdroidRepositoryIndex = index;
    window.fdroidRepositoryStatus = { state: 'online', checkedAt: Date.now(), timestamp: index.repo?.timestamp, appCount: window.fdroidRepositoryInfo.appCount };
    window.dispatchEvent(new Event('fdroid-index-ready'));
    const pkgs = Object.entries(index.packages).map(([id, p]) => {
      const v = Object.values(p.versions).sort((a, b) => b.manifest.versionCode - a.manifest.versionCode)[0];
      return { id, p, v, m: p.metadata, cats: p.metadata.categories || [] };
    }).sort((a, b) => en(a.m.name).localeCompare(en(b.m.name)));
    const versions = pkgs.reduce((n, x) => n + Object.keys(x.p.versions).length, 0);
    const bytes = pkgs.reduce((n, x) => n + x.v.file.size, 0);
    const trackerApps = pkgs.filter((x) => x.v.antiFeatures?.Tracking || x.m.antiFeatures?.Tracking).length;
    window.fdroidRepositoryInfo = { ...window.fdroidRepositoryInfo, versionCount: versions, latestApkBytes: bytes, trackerCount: trackerApps };
    window.dispatchEvent(new CustomEvent('fdroid-index-status', { detail: window.fdroidRepositoryStatus }));
    count($('#statApps'), pkgs.length); count($('#statVersions'), versions); count($('#statSize'), bytes / 1e6, 1); count($('#statTrackers'), trackerApps);
    const pulsePackages = $('#pulsePackages'), pulseVersions = $('#pulseVersions'), pulseSize = $('#pulseSize');
    const pulseBars = $('#pulseBars'), pulseStamp = $('#pulseStamp');
    if (pulsePackages && pulseVersions && pulseSize && pulseBars && pulseStamp) {
      pulsePackages.textContent = String(pkgs.length).padStart(2, '0');
      pulseVersions.textContent = String(versions).padStart(2, '0');
      pulseSize.textContent = mb(bytes);
      const largest = Math.max(...pkgs.map((x) => x.v.file.size), 1);
      const footprint = [...pkgs].sort((a, b) => b.v.file.size - a.v.file.size);
      pulseBars.replaceChildren(...footprint.map((x) => {
        const bar = el('span', { className: 'pulse-bar' });
        const fill = el('i', { className: 'pulse-bar-fill', 'aria-hidden': 'true' });
        fill.style.width = `${Math.max(5, x.v.file.size / largest * 100)}%`;
        bar.append(fill);
        return el('a', { className: 'pulse-app', href: `#app=${encodeURIComponent(x.id)}`, ariaLabel: `${en(x.m.name)}, ${mb(x.v.file.size)} megabytes, open app details` },
          el('span', { className: 'pulse-app-name', textContent: en(x.m.name) }), bar,
          el('b', { className: 'pulse-app-size', textContent: `${mb(x.v.file.size)} MB` }));
      }));
      pulseStamp.textContent = index.repo?.timestamp ? new Date(index.repo.timestamp).toISOString().replace('T', ' ').slice(0, 16) + ' UTC' : 'NOT PROVIDED';
    }
    const word = ['Zero', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten'][pkgs.length] || String(pkgs.length);
    $('#appsTitle').textContent = `${word} apps,`;

    const grid = $('#apps'), q = $('#appSearch'), chips = $('#appFilters');
    let filter = 'All', drawn = false;
    const cats = ['All', ...new Set(pkgs.flatMap((x) => x.cats))];
    for (const c of cats) chips.append(el('button', { className: 'chip-btn', type: 'button', textContent: c.toUpperCase(), ariaPressed: String(c === 'All'), onclick: (e) => {
      filter = c; for (const b of chips.children) b.setAttribute('aria-pressed', String(b === e.currentTarget)); draw();
    } }));
    const draw = () => {
      const term = q.value.trim().toLowerCase();
      const shown = pkgs.filter((x) => (filter === 'All' || x.cats.includes(filter)) &&
        (!term || `${en(x.m.name)} ${en(x.m.summary)} ${x.id}`.toLowerCase().includes(term)));
      grid.replaceChildren(...(shown.length ? shown.map((x, i) => {
        const perms = permsOf(x.v), af = x.v.antiFeatures || {};
        const card = el('button', { className: 'app', type: 'button', ariaLabel: `${en(x.m.name)}: details` },
          el('div', { className: 'app-head' },
            el('div', { className: 'app-icon' }, el('img', { src: REPO + en(x.m.icon).name, alt: '', width: 68, height: 68, loading: 'lazy' })),
            el('div', {}, el('h3', { textContent: en(x.m.name).toUpperCase() }), el('p', { className: 'sum', textContent: en(x.m.summary) }))),
          el('div', { className: 'badges' },
            el('span', { className: 'badge ver', textContent: `v${x.v.manifest.versionName}` }),
            perms.includes('INTERNET') ? el('span', { className: 'badge net', textContent: 'NETWORK' }) : el('span', { className: 'badge offline', textContent: 'OFFLINE' }),
            Object.keys(af).includes('NonFreeNet') ? el('span', { className: 'badge self', textContent: 'SELF-HOSTED' }) : null,
            el('span', { className: 'badge', textContent: `${mb(x.v.file.size)} MB` }),
            ...x.cats.map((c) => el('span', { className: 'badge', textContent: c.toUpperCase() }))),
          el('div', { className: 'app-foot' },
            el('span', {}, 'SIGNER ', el('b', { textContent: (x.v.manifest.signer?.sha256?.[0] || '').slice(0, 8) + '…' })),
            el('span', { textContent: `UPDATED ${ago(x.v.added)} · ${x.m.license}` })));
        card.addEventListener('click', () => { history.replaceState(null, '', `#app=${x.id}`); openApp(x.id, x.p); });
        card.style.transitionDelay = reduced ? '0s' : `${i * 70}ms`;
        tilt(card); io ? io.observe(card) : card.classList.add('in');
        return card;
      }) : [el('p', { className: 'empty', textContent: 'NO APPS MATCH THAT FILTER.' })]));
      // Re-filtering happens on screen: show the new cards right away.
      if (drawn) grid.querySelectorAll('.app').forEach((c) => { c.style.transitionDelay = '0s'; c.classList.add('in'); });
      drawn = true;
    };
    q.addEventListener('input', draw); draw();
    // Fail-safe: cards must never stay invisible if the observer doesn't fire.
    setTimeout(() => grid.querySelectorAll('.app:not(.in)').forEach((c) => c.classList.add('in')), 1500);

    const tl = $('#timeline');
    const events = pkgs.flatMap((x) => Object.values(x.p.versions).map((v) => ({ name: en(x.m.name), v }))).sort((a, b) => b.v.added - a.v.added).slice(0, 8);
    tl.replaceChildren(...events.map((e) => el('li', {},
      el('time', { textContent: new Date(e.v.added).toISOString().slice(0, 10) }),
      el('b', { textContent: `${e.name} ${e.v.manifest.versionName}` }),
      el('span', { className: 'sum', textContent: `${mb(e.v.file.size)} MB · versionCode ${e.v.manifest.versionCode}` }))));
    // Deep links: #app=<package id> opens that app's details.
    const deep = () => { const id = decodeURIComponent((location.hash.match(/^#app=(.+)$/) || [])[1] || ''); const x = pkgs.find((k) => k.id === id); if (x) openApp(x.id, x.p); };
    addEventListener('hashchange', deep); deep();
    const ts = index.repo.timestamp;
    if (ts) $('#indexStamp').textContent = new Date(ts).toISOString().replace('T', ' ').slice(0, 16) + ' UTC';
  }).catch((error) => {
    window.fdroidRepositoryStatus = { state: 'offline', checkedAt: Date.now(), error: error?.message || 'Index could not be loaded' };
    window.dispatchEvent(new CustomEvent('fdroid-index-status', { detail: window.fdroidRepositoryStatus }));
    $('#apps').replaceChildren(el('p', { className: 'empty', textContent: 'COULD NOT LOAD THE REPOSITORY INDEX. THE APPS ARE STILL AVAILABLE IN F-DROID.' }));
  });

  // ---- "verify it yourself" terminal types itself out --------------------
  const term = $('#verifyTerm');
  if (term) {
    const lines = JSON.parse(term.dataset.lines);
    const out = term.querySelector('code');
    const show = () => {
      if (reduced) { out.textContent = lines.join('\n'); return; }
      let li = 0, ci = 0; out.textContent = '';
      const cur = el('span', { className: 'cursor' });
      const tick = () => {
        if (li >= lines.length) { out.append(cur); return; }
        const line = lines[li];
        if (ci <= line.length) { out.textContent = lines.slice(0, li).join('\n') + (li ? '\n' : '') + line.slice(0, ci); out.append(cur); ci++; setTimeout(tick, line.startsWith('$') ? 22 : 4); }
        else { li++; ci = 0; setTimeout(tick, 260); }
      };
      tick();
    };
    if (io) { const once = new IntersectionObserver((es) => { if (es[0].isIntersecting) { show(); once.disconnect(); } }, { threshold: .4 }); once.observe(term); } else show();
  }
})();
