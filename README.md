# 📦 Cybercore F-Droid repository

**Every Cybercore Android app, one tap, kept up to date.**

🌐 **Add it:** <https://cybercoretech.github.io/fdroid/> (tap *Add to F-Droid* or scan the QR code)

| | |
|---|---|
| 🔗 **Repository URL** | `https://cybercoretech.github.io/fdroid/repo` |
| 🪪 **Signing fingerprint (SHA-256)** | `DE3718769E4C4BE6E26344C7031B88FA9671AF25EA957981552EC420E34FF3C3` |

Works with [F-Droid](https://f-droid.org/), Droid-ify and Neo Store.

## 📱 Apps

| App | Package | License | Source |
|---|---|---|---|
| 🔐 **CyberVault**: offline password vault with Keysmith | `dev.cybercore.cybervault` | MIT | [cybervault-android-app](https://github.com/cybercoretech/cybervault-android-app) |
| 🖼️ **Cybermeta**: see and strip photo metadata | `dev.cybercore.cybermeta` | MIT | [cybermeta-android-app](https://github.com/cybercoretech/cybermeta-android-app) |
| 🧊 **Holodrive Photos**: client for your self-hosted Holodrive | `dev.cybercore.holodrive.photos` | Apache-2.0 | [holodrive-android-app](https://github.com/cybercoretech/holodrive-android-app) |
| 🌙 **Nightwatch**: watch and control your self-hosted services | `dev.cybercore.nightwatch` | MIT | [nightwatch-android-app](https://github.com/cybercoretech/nightwatch-android-app) |
| 🛰️ **SignalWarden**: private network diagnostics | `dev.cybercore.signalwarden` | Apache-2.0 | [signalwarden](https://github.com/cybercoretech/signalwarden) |

Deep link to an app's details: `https://cybercoretech.github.io/fdroid/#app=<package>`.

## 🛡️ Trust model

- **Same APKs as GitHub.** Every APK here is the exact signed release from the app's GitHub releases. Before it's listed, its SHA-256 and its **developer signing certificate** (pinned in [`apps.tsv`](apps.tsv)) are checked again. Installing from F-Droid, Obtainium or GitHub is interchangeable, and updates work across all three.
- **Signed index.** The repository index is signed with the Cybercore repo key (fingerprint above). The key lives only on the maintainer's machine; it's never in this repo or in GitHub.
- **Not the main F-Droid catalog.** F-Droid doesn't build these APKs. Main-catalog listings may follow once builds are reproducible.

## 🤖 CyberDroid identity

The landing page features Sentinel 01, a Cybercore Universal Defense cyborg with a compact endoskeleton head, paired optics, articulated mechanics, and lightly battle-worn graphite titanium armor. The wordmark uses clean Orbitron display typography in titanium and cyan; the header keeps its Cybercore / F-Droid lettering while replacing the old `CC` badge with a precision optical-core emblem. The static background leaves clear space for page copy, and repository cards share a quiet graphite-and-cyan treatment.

The complete **SVG / PNG / ICO asset pack** and usage notes are in [`assets/cyberdroid/`](assets/cyberdroid/). The F-Droid client repository icon under `repo/icons/` is kept separate from the site's favicon and branding.

## 🛠️ Maintaining

Needs `fdroidserver` (`python3 -m venv ~/.local/share/fdroidserver-venv && …/pip install fdroidserver`), `gh`, and the Android build-tools.

```sh
tools/publish.sh      # fetch latest releases → verify sha256 + cert pin → add new APKs → re-sign index → check every referenced file exists
git status            # review, then commit on a branch and open a PR (Pages serves main)
```

- **Add an app:** one line in `apps.tsv` (repo, release asset, application id, cert SHA-256), plus `metadata/<appid>.yml` and an optional `metadata/<appid>/en-US/` with `images/icon.png`, `images/phoneScreenshots/` and `changelogs/<versionCode>.txt`.
- **Landing page:** `index.html` + `repo-ui.{css,js}` render the app cards, stats and update timeline live from `repo/index-v2.json`, so the page never goes stale.
- **Interactive page tools:** React source lives in `src/react/`; run `npm ci && npm run build:react` to rebuild the committed static assets in `assets/fdroid-react.{js,css}`. GitHub Pages serves those assets directly from `main`, so no client-side build service is needed.
- **Page CI:** GitHub Actions installs the locked dependencies, rebuilds the React bundle, and fails if the committed bundle is stale.
- **Keep it small:** `archive_older: 3` keeps the last three versions of each app.
- **Signing key:** `~/Vaults/android/fdroid-index.{p12,env}`. `config.yml` holds no secrets; it reads `FDROID_KEYSTORE_PASS` and `FDROID_KEY_PASS` from that env file.
