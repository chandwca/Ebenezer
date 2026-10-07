import type { z } from 'zod';
import type { BrowserAuthClient } from '@/lib/auth/client';

export class AccountApiError extends Error {
  constructor(
    public readonly code: string,
    public readonly status = 0,
  ) {
    super(code);
  }
}

function apiBaseUrl() {
  const value = import.meta.env.VITE_API_URL;
  if (!value) throw new AccountApiError('unavailable');
  const url = new URL(value);
  if (
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    !(
      url.protocol === 'https:' ||
      (url.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(url.hostname))
    )
  )
    throw new AccountApiError('unavailable');
  return value.replace(/\/$/, '');
}

export async function accountRequest<T>(
  client: BrowserAuthClient,
  actorId: string,
  path: string,
  schema: z.ZodType<T>,
  options: { method?: 'GET' | 'PATCH'; body?: unknown; signal?: AbortSignal } = {},
): Promise<T> {
  const { data, error } = await client.auth.getSession();
  const session = data.session;
  if (error || !session || session.user.is_anonymous || session.user.id !== actorId)
    throw new AccountApiError('signed_out', 401);
  const response = await fetch(`${apiBaseUrl()}${path}`, {
    method: options.method ?? 'GET',
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      ...(options.body === undefined ? {} : { 'Content-Type': 'application/json' }),
    },
    ...(options.body === undefined ? {} : { body: JSON.stringify(options.body) }),
    signal: options.signal
      ? AbortSignal.any([options.signal, AbortSignal.timeout(15000)])
      : AbortSignal.timeout(15000),
    cache: 'no-store',
    credentials: 'omit',
  });
  if (!response.ok) {
    // Only known status codes reach UI translations. Never render raw database/Auth errors.
    const codes: Record<number, string> = {
      400: 'invalid_profile',
      401: 'signed_out',
      403: 'forbidden',
      404: 'profile_missing',
      409: 'handle_taken',
      503: 'unavailable',
    };
    throw new AccountApiError(codes[response.status] ?? 'request_failed', response.status);
  }
  const parsed = schema.safeParse(await response.json());
  if (!parsed.success) throw new AccountApiError('invalid_response');
  return parsed.data;
}

type Method = 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';

async function send(
  path: string,
  options: {
    method?: Method;
    body?: unknown;
    signal?: AbortSignal;
    token?: string;
    timeoutMs?: number;
  },
) {
  const timeout = AbortSignal.timeout(options.timeoutMs ?? 15000);
  const response = await fetch(`${apiBaseUrl()}${path}`, {
    method: options.method ?? 'GET',
    headers: {
      ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
      ...(options.body === undefined ? {} : { 'Content-Type': 'application/json' }),
    },
    ...(options.body === undefined ? {} : { body: JSON.stringify(options.body) }),
    signal: options.signal ? AbortSignal.any([options.signal, timeout]) : timeout,
    cache: 'no-store',
    credentials: 'omit',
  });
  if (!response.ok) {
    const codes: Record<number, string> = {
      400: 'invalid',
      401: 'signed_out',
      403: 'forbidden',
      404: 'not_found',
      409: 'conflict',
      429: 'rate_limited',
      503: 'unavailable',
    };
    let code = codes[response.status] ?? 'request_failed';
    if (response.status === 409) {
      const reply = (await response.json().catch(() => null)) as {
        error?: { code?: string };
      } | null;
      if (reply?.error?.code === 'profile_required') code = 'profile_required';
    }
    throw new AccountApiError(code, response.status);
  }
  return response;
}

async function parse<T>(response: Response, schema: z.ZodType<T> | null) {
  if (!schema || response.status === 204) return undefined as T;
  const parsed = schema.safeParse(await response.json());
  if (!parsed.success) throw new AccountApiError('invalid_response');
  return parsed.data;
}

/** Signed-in community request. Error codes are stable keys for translated messages. */
export async function communityRequest<T>(
  client: BrowserAuthClient,
  actorId: string,
  path: string,
  schema: z.ZodType<T> | null,
  options: { method?: Method; body?: unknown; signal?: AbortSignal } = {},
): Promise<T> {
  const { data, error } = await client.auth.getSession();
  const session = data.session;
  if (error || !session || session.user.is_anonymous || session.user.id !== actorId)
    throw new AccountApiError('signed_out', 401);
  return parse(await send(path, { ...options, token: session.access_token }), schema);
}

/** Request for the signed-out prayer-link page. */
export async function publicRequest<T>(
  path: string,
  schema: z.ZodType<T>,
  options: {
    method?: 'GET' | 'POST';
    body?: unknown;
    signal?: AbortSignal;
    timeoutMs?: number;
  } = {},
): Promise<T> {
  return parse(await send(path, options), schema);
}
