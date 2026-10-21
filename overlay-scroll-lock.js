// Shared lock for overlays that must scroll without moving the page beneath.
(() => {
  const owners = new Set();
  const root = document.documentElement;
  window.cybercorePageScrollLock = {
    lock(owner) {
      if (!owner) return;
      owners.add(owner);
      root.classList.add('overlay-scroll-locked');
      window.cybercoreLenis?.stop();
    },
    unlock(owner) {
      owners.delete(owner);
      if (owners.size) return;
      root.classList.remove('overlay-scroll-locked');
      window.cybercoreLenis?.start();
    },
    get locked() { return owners.size > 0; },
  };
})();
