// Cybercore startup sequence and optional desktop smooth scrolling.
// Anime.js and Lenis are self-hosted; native scroll remains the fallback.
(() => {
  'use strict';
  const root = document.documentElement;
  const panel = document.getElementById('systemBoot');
  const skip = document.getElementById('bootSkip');
  const bar = document.getElementById('bootProgress');
  const status = document.getElementById('bootStatus');
  const indexState = document.getElementById('bootIndexState');
  const lines = [...document.querySelectorAll('[data-boot-line]')];
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let ended = false;
  let finishTimer;
  const phaseTimers = [];

  const showIndex = () => {
    const info = window.fdroidRepositoryInfo;
    if (!info || !indexState) return;
    const date = info.timestamp ? new Date(info.timestamp).toISOString().slice(0, 10) : 'DATE UNAVAILABLE';
    indexState.textContent = `${info.appCount} APPS · ${date}`;
  };
  window.addEventListener('fdroid-index-ready', showIndex);
  showIndex();

  const finish = () => {
    if (ended) return;
    ended = true;
    clearTimeout(finishTimer);
    phaseTimers.forEach(clearTimeout);
    root.classList.add('boot-leaving');
    setTimeout(() => {
      root.classList.remove('boot-pending', 'boot-leaving');
      panel?.setAttribute('hidden', '');
    }, 260);
  };

  if (!panel || reduced || !root.classList.contains('boot-pending')) {
    root.classList.remove('boot-pending');
  } else {
    panel.removeAttribute('hidden');
    skip?.addEventListener('click', finish, { once: true });
    finishTimer = setTimeout(finish, 10_600);

    const bootPhases = [
      [1500, 'CORE SHELL INITIALIZED · MOUNTING INTERFACE'],
      [3400, 'CYBERGRID THEME MATRIX · LOADING PALETTES'],
      [5500, 'REPOSITORY CHANNEL · READING INDEX METADATA'],
      [7700, 'CLIENT TRUST MODEL · PREPARING F-DROID HANDOFF'],
      [9400, 'FINAL SYSTEM CHECK · BRINGING PORTAL ONLINE'],
      [10_050, 'SYSTEM READY · INDEX MAY CONTINUE LOADING'],
    ];
    bootPhases.forEach(([delay, message]) => {
      phaseTimers.push(setTimeout(() => { if (status && !ended) status.textContent = message; }, delay));
    });

    // A CSS/timer fallback guarantees the page is never held for a CDN or animation.
    const anime = window.anime;
    if (anime?.animate) {
      anime.animate('.boot-core', { opacity: [0, 1], translateY: [12, 0], duration: 430, ease: 'outCubic' });
      anime.animate(lines, { opacity: [0, 1], translateX: [-8, 0], delay: anime.stagger(105, { start: 180 }), duration: 300, ease: 'outCubic' });
      const progress = { value: 0 };
      anime.animate(progress, {
        value: 100, duration: 10_250, ease: 'inOutQuad',
        onUpdate: () => { if (bar) bar.style.width = `${progress.value}%`; },
        onComplete: finish,
      });
    } else {
      lines.forEach((line, i) => setTimeout(() => { line.style.opacity = '1'; }, 180 + i * 105));
      if (bar) bar.style.transition = 'width 10.2s ease-in-out';
      requestAnimationFrame(() => { if (bar) bar.style.width = '100%'; });
    }
  }

  // Keep touch devices and reduced-motion users on native scrolling.
  if (!reduced && matchMedia('(pointer: fine)').matches && innerWidth > 760) {
    import('./vendor/lenis.mjs').then(({ default: Lenis }) => {
      if (matchMedia('(prefers-reduced-motion: reduce)').matches || !Lenis) return;
      const lenis = new Lenis({ autoRaf: true, anchors: true, respectReducedMotion: true });
      window.cybercoreLenis = lenis;
      root.classList.add('lenis');
    }).catch(() => { /* native browser scrolling is the intentional fallback */ });
  }
})();
