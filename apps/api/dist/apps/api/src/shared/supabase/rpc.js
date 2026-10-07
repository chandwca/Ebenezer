import { rpcError } from '../errors/rpc-error.js';
/** Unwraps a Supabase RPC result, translating database errors into API errors. */
export async function unwrapRpc(call) {
    const { data, error } = await call;
    if (error)
        rpcError(error);
    return data;
}
