import { z } from 'zod';
const supabaseConfigSchema = z.object({
    url: z.url().refine((value) => {
        const url = new URL(value);
        return (!url.username &&
            !url.password &&
            (url.protocol === 'https:' ||
                (url.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(url.hostname))));
    }),
    publishableKey: z.string().startsWith('sb_publishable_').min(20),
});
export function readSupabaseConfig(env = process.env) {
    if (!env.SUPABASE_URL && !env.SUPABASE_PUBLISHABLE_KEY)
        return undefined;
    const result = supabaseConfigSchema.safeParse({
        url: env.SUPABASE_URL,
        publishableKey: env.SUPABASE_PUBLISHABLE_KEY,
    });
    if (!result.success) {
        throw new Error('Set a valid SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY together.');
    }
    return result.data;
}
