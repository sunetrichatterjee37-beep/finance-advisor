import server from '../dist/server/server.js';
import { hostedContext } from '../src/server/runtime';
export default {
  async fetch(request: Request, env: Record<string, any>, ctx: any) {
    const user = request.headers.get('oai-authenticated-user-id');
    if (!user) return new Response('Sign in to open this private workspace.', { status: 401 });
    if (!['GET', 'HEAD', 'OPTIONS'].includes(request.method)) {
      const origin = request.headers.get('origin');
      if (!origin || origin !== new URL(request.url).origin || request.headers.get('sec-fetch-site') === 'cross-site') {
        return new Response('Request origin is not allowed.', { status: 403 });
      }
    }
    return hostedContext.run({ env, user }, async () => {
      const response = await server.fetch(request, { context: { env, executionCtx: ctx } });
      const headers = new Headers(response.headers);
      headers.set('Cache-Control', 'private, no-store');
      headers.set('X-Content-Type-Options', 'nosniff');
      headers.set('Referrer-Policy', 'same-origin');
      return new Response(response.body, { status: response.status, headers });
    });
  },
};
