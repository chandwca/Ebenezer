import { buildWordCardMeta, metaTags } from '../../src/lib/word-card-meta';
import { wordMoment } from '../../src/lib/word-card';

type Env = {
  ASSETS: { fetch(request: Request | URL | string): Promise<Response> };
  API_URL?: string;
};
type Context = { request: Request; env: Env; params: { moment?: string | string[] } };

const PASSAGE_TIMEOUT_MS = 2500;

async function passageFor(moment: NonNullable<ReturnType<typeof wordMoment>>, apiUrl?: string) {
  if (!apiUrl) return undefined;
  try {
    const response = await fetch(`${apiUrl.replace(/\/$/, '')}/v1/word/${moment.id}`, {
      signal: AbortSignal.timeout(PASSAGE_TIMEOUT_MS),
    });
    if (!response.ok) return undefined;
    const body = (await response.json()) as { text?: unknown; reference?: unknown };
    return typeof body.text === 'string' && typeof body.reference === 'string'
      ? { text: body.text, reference: body.reference }
      : undefined;
  } catch {
    return undefined;
  }
}

export const onRequestGet = async ({ request, env, params }: Context) => {
  const url = new URL(request.url);
  const shell = await env.ASSETS.fetch(new URL('/', url));
  const moment = wordMoment(String(params.moment));
  if (!moment) return shell;
  const meta = buildWordCardMeta({
    origin: url.origin,
    moment: moment.id,
    from: url.searchParams.get('from'),
    passage: await passageFor(moment, env.API_URL),
  });
  if (!meta) return shell;
  const rewriter = new (
    globalThis as unknown as {
      HTMLRewriter: new () => {
        on(selector: string, handlers: object): unknown;
        transform(response: Response): Response;
      };
    }
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
