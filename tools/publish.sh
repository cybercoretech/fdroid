#!/usr/bin/env bash
# Refresh the Cybercore F-Droid repository from the apps' GitHub releases.
#
#   tools/publish.sh           # add any new releases, re-sign the index
#
# For every app in apps.tsv, this downloads the latest release APK and its
# .sha256, checks the checksum and the developer signing certificate pinned in
# apps.tsv, and adds the APK as repo/<appid>_<versionCode>.apk if it's new.
# Then `fdroid update` rebuilds and signs the index with the repo key, which
# lives only on Blackbox (~/Vaults/android/fdroid-index.{p12,env}).
# Review `git status`, then commit and open a PR; Pages serves `main`.
set -euo pipefail

FDROID="${FDROID:-$HOME/.local/share/fdroidserver-venv/bin/fdroid}"
KEY_ENV="${FDROID_KEY_ENV:-$HOME/Vaults/android/fdroid-index.env}"
export ANDROID_HOME="${ANDROID_HOME:-$HOME/android}"
APKSIGNER="$ANDROID_HOME/build-tools/36.0.0/apksigner"
AAPT2="$ANDROID_HOME/build-tools/36.0.0/aapt2"

die() { printf '✖ %s\n' "$*" >&2; exit 1; }
say() { printf '▸ %s\n' "$*"; }

cd "$(dirname "$0")/.."
[[ -x "$FDROID" ]] || die "fdroidserver not found at $FDROID (python3 -m venv … && pip install fdroidserver)"
[[ -r "$KEY_ENV" ]] || die "repo signing env not found: $KEY_ENV"

tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT
added=0
while IFS=$'\t' read -r repo asset appid cert; do
  [[ -z "$repo" || "$repo" == \#* ]] && continue
  tag=$(gh release view -R "cybercoretech/$repo" --json tagName --jq .tagName) || die "no release for $repo"
  gh release download "$tag" -R "cybercoretech/$repo" -p "$asset" -p "$asset.sha256" -D "$tmp/$repo" --clobber
  (cd "$tmp/$repo" && sha256sum --check --status "$asset.sha256") || die "$repo $tag: SHA-256 mismatch"
  signers=$("$APKSIGNER" verify --print-certs "$tmp/$repo/$asset")
  got=$(sed -n 's/.*certificate SHA-256 digest: //p' <<<"$signers"); got=${got%%$'\n'*}
  [[ "$got" == "$cert" ]] || die "$repo $tag: signed by $got, expected $cert"
  badging=$("$AAPT2" dump badging "$tmp/$repo/$asset"); badging=${badging%%$'\n'*}
  [[ "$badging" == *"name='$appid'"* ]] || die "$repo $tag: package isn't $appid"
  code=$(sed -E "s/.*versionCode='([0-9]+)'.*/\1/" <<<"$badging")
  if [[ -f "repo/${appid}_$code.apk" ]]; then
    say "$appid $tag ($code): already listed"
  else
    cp "$tmp/$repo/$asset" "repo/${appid}_$code.apk"; added=$((added + 1))
    say "$appid $tag ($code): verified and added"
  fi
done < apps.tsv

say "Rebuilding and signing the index…"
set -a
# shellcheck source=/dev/null
. "$KEY_ENV"
set +a
# Every file the signed index points at (APKs, icons, screenshots) must exist.
# fdroidserver has been seen dropping other apps' hashed icon files on the run
# that adds a new app; a second run restores them. Never commit a broken repo.
missing_refs() {
  python3 -I - <<'PY'
import json, os
d = json.load(open("repo/index-v2.json"))
miss = []
for p in d["packages"].values():
    m = p["metadata"]
    refs = [x["name"] for x in m.get("icon", {}).values()]
    for kind in (m.get("screenshots") or {}).values():
        for lst in kind.values():
            refs += [x["name"] for x in lst]
    refs += [v["file"]["name"] for v in p["versions"].values()]
    miss += [r for r in refs if not os.path.exists("repo" + r)]
print("\n".join(miss))
PY
}
for attempt in 1 2; do
  "$FDROID" update --use-date-from-apk 2>&1 | grep -v 'unsafe permissions' | grep -E 'ERROR|WARNING|Finished' || true
  missing=$(missing_refs)
  [[ -z "$missing" ]] && break
  say "index references missing files (attempt $attempt):"; printf '%s\n' "$missing" | sed 's/^/  /'
done
[[ -z "$missing" ]] || die "the index still references missing files; not safe to commit"
say "Index verified: every referenced APK, icon and screenshot exists."
say "$added new APK(s). Review 'git status', then commit and open a PR."
