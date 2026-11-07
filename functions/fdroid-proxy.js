// Cloudflare Pages Function – proxy large F-Droid assets from R2
export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const pathname = url.pathname;

  // Only proxy paths under /repo/
  if (!pathname.startsWith('/repo/')) {
    return fetch(request);
  }

  // R2 key matches the request path without leading slash
  const r2Key = pathname.slice(1); // e.g. "repo/com.example.app_1.2.3.apk"

  const object = await env.FDROID_R2.get(r2Key);
  if (!object) {
    return new Response('Not found', { status: 404 });
  }

  const headers = new Headers();
  headers.set('Content-Type', object.httpMetadata?.contentType || 'application/octet-stream');

  // Cache immutable binaries for 1 year
  const immutable = /\.(apk|jar|zip|gz|tgz|xz|tar)$/i.test(r2Key);
  if (immutable) {
    headers.set('Cache-Control', 'public, max-age=31536000, immutable');
  } else {
    headers.set('Cache-Control', 'public, max-age=600');
  }

  return new Response(object.body, { status: 200, headers });
}
