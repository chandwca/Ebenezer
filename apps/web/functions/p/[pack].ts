import { buildPackMeta, metaTags } from '../../src/lib/word-card-meta';

type Env = { ASSETS: { fetch(request: Request | URL | string): Promise<Response> } };
type Context = { request: Request; env: Env; params: { pack?: string | string[] } };
type Rewriter = {
  on(selector: string, handlers: object): unknown;
  transform(response: Response): Response;
};

export const onRequestGet = async ({ request, env, params }: Context) => {
  const url = new URL(request.url);
  const shell = await env.ASSETS.fetch(new URL('/', url));
  const meta = buildPackMeta({
    origin: url.origin,
    pack: String(params.pack),
    from: url.searchParams.get('from'),
    start: url.searchParams.get('start'),
  });
  if (!meta) return shell;
  const rewriter = new (
    globalThis as unknown as { HTMLRewriter: new () => Rewriter }
  ).HTMLRewriter();
  rewriter.on('title', {
    element(element: { setInnerContent(content: string): void }) {
      element.setInnerContent(`${meta.title} · Ebenezer`);
    },
  });
  rewriter.on('head', {
    element(element: { append(content: string, options: { html: boolean }): void }) {
      element.append(metaTags(meta), { html: true });
    },
  });
  const response = rewriter.transform(shell);
  const headers = new Headers(response.headers);
  headers.set('Cache-Control', 'public, max-age=300');
  return new Response(response.body, { status: response.status, headers });
};
