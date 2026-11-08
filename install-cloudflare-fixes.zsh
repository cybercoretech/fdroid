#!/usr/bin/env zsh
set -euo pipefail

if [[ ! -e .git ]]; then
  print -u2 "Run this script from the root of your fdroid Git repository."
  exit 1
fi

mkdir -p .github/workflows 'functions/repo'

cat > .github/workflows/deploy.yml <<'YAML'
name: Deploy F-Droid to Cloudflare

on:
  push:
    branches: [main]
    paths:
      - '**/*'
  workflow_dispatch:

permissions:
  contents: read

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Install Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install dependencies
        run: npm ci

      - name: Build site
        run: npm run build:react

      - name: Install Wrangler
        run: npm install --global wrangler@3.90.0

      - name: Verify Cloudflare credentials
        shell: bash
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CF_API_TOKEN }}
          CLOUDFLARE_ACCOUNT_ID: ${{ secrets.CF_ACCOUNT_ID }}
        run: |
          set -euo pipefail

          if [[ -z "${CLOUDFLARE_API_TOKEN:-}" ]]; then
            echo "::error::GitHub secret CF_API_TOKEN is missing, empty, or unavailable to this workflow."
            exit 1
          fi

          if [[ -z "${CLOUDFLARE_ACCOUNT_ID:-}" ]]; then
            echo "::error::GitHub secret CF_ACCOUNT_ID is missing, empty, or unavailable to this workflow."
            exit 1
          fi

          echo "Cloudflare credentials are present."

      - name: Sync repository to R2
        shell: bash
        env:
          R2_BUCKET: fdroid-repo
          CLOUDFLARE_API_TOKEN: ${{ secrets.CF_API_TOKEN }}
          CLOUDFLARE_ACCOUNT_ID: ${{ secrets.CF_ACCOUNT_ID }}
        run: |
          set -euo pipefail

          if [[ ! -d repo ]]; then
            echo "::error::repo directory does not exist."
            exit 1
          fi

          file_count=0

          while IFS= read -r -d '' file; do
            rel_path="${file#./}"

            case "${file,,}" in
              *.apk) content_type="application/vnd.android.package-archive" ;;
              *.jar) content_type="application/java-archive" ;;
              *.xml) content_type="application/xml" ;;
              *.json) content_type="application/json" ;;
              *.png) content_type="image/png" ;;
              *.jpg|*.jpeg) content_type="image/jpeg" ;;
              *.webp) content_type="image/webp" ;;
              *.zip) content_type="application/zip" ;;
              *.gz) content_type="application/gzip" ;;
              *.txt) content_type="text/plain; charset=utf-8" ;;
              *) content_type="application/octet-stream" ;;
            esac

            echo "Uploading ${rel_path}"

            wrangler r2 object put \
              "${R2_BUCKET}/${rel_path}" \
              --file "$file" \
              --content-type "$content_type"

            file_count=$((file_count + 1))
          done < <(find repo -type f -print0)

          if [[ "$file_count" -eq 0 ]]; then
            echo "::error::No files found under repo/."
            exit 1
          fi

          echo "Uploaded ${file_count} files to R2."

      - name: Deploy Cloudflare Pages
        shell: bash
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CF_API_TOKEN }}
          CLOUDFLARE_ACCOUNT_ID: ${{ secrets.CF_ACCOUNT_ID }}
        run: |
          set -euo pipefail

          wrangler pages deploy ./dist \
            --project-name fdroid-pages \
            --branch main
YAML

cat > 'functions/repo/[[path]].js' <<'JS'
// Cloudflare Pages Function for serving F-Droid repository files from R2.
// Install at: functions/repo/[[path]].js
export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);

  // This catch-all function is mounted under /repo/.
  if (!url.pathname.startsWith("/repo/")) {
    return new Response("Not found", { status: 404 });
  }

  if (request.method !== "GET" && request.method !== "HEAD") {
    return new Response("Method Not Allowed", {
      status: 405,
      headers: { Allow: "GET, HEAD" },
    });
  }

  // /repo/com.example.app.apk -> R2 key "repo/com.example.app.apk"
  const r2Key = url.pathname.slice(1);

  const immutable = /\.(apk|jar|zip|gz|tgz|xz|tar)$/i.test(r2Key);

  let object;
  if (request.method === "HEAD") {
    object = await env.FDROID_R2.head(r2Key);
  } else {
    // Passing the incoming Range header lets R2 return only the requested bytes.
    object = await env.FDROID_R2.get(r2Key, {
      range: request.headers,
    });
  }

  if (!object) {
    return new Response("Not found", { status: 404 });
  }

  const headers = new Headers();
  object.writeHttpMetadata(headers);

  // Supply sensible content types for older objects uploaded without metadata.
  if (!headers.has("Content-Type")) {
    const lowerKey = r2Key.toLowerCase();

    if (lowerKey.endsWith(".apk")) {
      headers.set("Content-Type", "application/vnd.android.package-archive");
    } else if (lowerKey.endsWith(".jar")) {
      headers.set("Content-Type", "application/java-archive");
    } else if (lowerKey.endsWith(".xml")) {
      headers.set("Content-Type", "application/xml");
    } else if (lowerKey.endsWith(".json")) {
      headers.set("Content-Type", "application/json");
    } else if (lowerKey.endsWith(".png")) {
      headers.set("Content-Type", "image/png");
    } else if (lowerKey.endsWith(".jpg") || lowerKey.endsWith(".jpeg")) {
      headers.set("Content-Type", "image/jpeg");
    } else if (lowerKey.endsWith(".webp")) {
      headers.set("Content-Type", "image/webp");
    } else if (lowerKey.endsWith(".zip")) {
      headers.set("Content-Type", "application/zip");
    } else if (lowerKey.endsWith(".gz")) {
      headers.set("Content-Type", "application/gzip");
    } else {
      headers.set("Content-Type", "application/octet-stream");
    }
  }

  headers.set("ETag", object.httpEtag);
  headers.set(
    "Cache-Control",
    immutable
      ? "public, max-age=31536000, immutable"
      : "public, max-age=600"
  );
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("Accept-Ranges", "bytes");

  if (request.method === "HEAD") {
    headers.set("Content-Length", String(object.size));
    return new Response(null, { status: 200, headers });
  }

  let status = 200;

  // R2 exposes the actual returned range on the object.
  if (
    object.range &&
    Number.isFinite(object.range.offset) &&
    Number.isFinite(object.range.length)
  ) {
    const start = object.range.offset;
    const end = start + object.range.length - 1;

    headers.set(
      "Content-Range",
      `bytes ${start}-${end}/${object.size}`
    );
    headers.set("Content-Length", String(object.range.length));
    status = 206;
  } else {
    headers.set("Content-Length", String(object.size));
  }

  return new Response(object.body, { status, headers });
}
JS

cat > wrangler.toml <<'TOML'
name = "fdroid-pages"
pages_build_output_dir = "./dist"
compatibility_date = "2024-09-01"

[[r2_buckets]]
binding = "FDROID_R2"
bucket_name = "fdroid-repo"
TOML

if [[ -f functions/fdroid-proxy.js ]]; then
  rm functions/fdroid-proxy.js
fi

print "Updated deploy.yml, wrangler.toml, and the /repo/* Pages Function route."
print "Review the changes with: git diff -- .github/workflows/deploy.yml wrangler.toml functions"
