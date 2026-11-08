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
