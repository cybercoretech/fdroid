# Self-hosted motion libraries

The F-Droid page uses local, pinned browser builds so opening the page does not
make visitors contact a third-party CDN for its motion effects.

- `anime.umd.min.js` — Anime.js 4.5.0, MIT; used for the short system boot sequence.
- `lenis.mjs` — Lenis 1.3.27, MIT; used for smooth scrolling on desktop pointer devices.

The upstream license texts are included beside these files. Native scrolling
remains the fallback if Lenis cannot load. Both effects respect reduced-motion
preferences; Lenis is not initialized on touch-first devices.

Sources: [Anime.js](https://github.com/juliangarnier/anime),
[Lenis](https://github.com/darkroomengineering/lenis).
