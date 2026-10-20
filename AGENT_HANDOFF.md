# 📦 Cybercore F-Droid repository: agent handoff

## 📍 State (2026-10-20)

- **Repo:** `cybercoretech/fdroid`, local checkout `~/Devspace/Android/fdroid`. GitHub Pages serves `main` `/` → <https://cybercoretech.github.io/fdroid/>, and the F-Droid repo is at `/repo`.
- **Apps:** CyberVault 0.1.0 (1000), Cybermeta 0.1.0 (100), Holodrive Photos 0.2.1 (2001).
- **Not listed** (no GitHub release yet): Nightwatch, CyberAuth, SignalWarden, Cybernote. Continuity has no license or remote.

## ✅ Resume checklist

1. `tools/publish.sh`, then review `git status`.
2. Branch, commit, PR. The user merges; Pages deploys `main`.
3. Commit identity: `19244308+darkstardevx@users.noreply.github.com`.

## 🧭 Decisions

- Our own repo first (the user chose this 2026-10-20); the main F-Droid catalog comes later, with reproducible builds.
- **The index key never leaves Blackbox:** `~/Vaults/android/fdroid-index.p12` + `.env`, fingerprint `DE37…F3C3`. Never regenerate it: every phone that added the repo pins it.
- Only list APKs that match a GitHub release (sha256) **and** the developer cert pinned in `apps.tsv`.

## ⚠️ Gotchas

- `fdroid update` can't extract icons from vector adaptive icons, so icons come from `metadata/<appid>/en-US/images/icon.png`.
- The "unsafe permissions on config.yml" warning is expected: it holds no secrets.
- **Never run `tools/publish.sh` under `bash -x`:** it sources the key env.
- The landing page uses the shared Cybercore Pages kit (`styles.css`, `app.js`, contact block from the org site). Mashups: SIGNAL RELAY, OPEN SOURCE GRID, SIDELOAD SUNSET.
