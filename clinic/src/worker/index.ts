// The Worker in front: the API and the live channel go to the clinic's Durable Object; everything
// else is the built web app (out/), served with the same security headers.
import { originsOf, type Env } from './env';
import { secure } from './http';

export { Clinic } from './clinic';

function clinic(env: Env) {
  return env.CLINIC.get(env.CLINIC.idFromName('clinic'));
}

export default {
  async fetch(request, env): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname.startsWith('/api/') || url.pathname === '/healthz') return clinic(env).fetch(request);

    const res = await env.ASSETS.fetch(request);
    const out = new Response(res.body, res);
    // Build files are content-hashed: cache for good. Pages, sw.js, icons: always revalidate.
    out.headers.set(
      'cache-control',
      url.pathname.startsWith('/_next/static/') ? 'public, max-age=31536000, immutable' : 'no-cache',
    );
    return secure(out, originsOf(env).https);
  },

  async scheduled(_controller, env, ctx): Promise<void> {
    ctx.waitUntil(clinic(env).dailyBackup());
  },
} satisfies ExportedHandler<Env>;
