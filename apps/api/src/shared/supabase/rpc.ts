import { rpcError } from '../errors/rpc-error.js';

/** Unwraps a Supabase RPC result, translating database errors into API errors. */
export async function unwrapRpc<T>(
  call: PromiseLike<{ data: T | null; error: { code: string } | null }>,
): Promise<T | null> {
  const { data, error } = await call;
  if (error) rpcError(error);
  return data;
}
