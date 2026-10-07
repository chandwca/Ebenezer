// The Deno APIs the reminder functions use, for type checking under Node's TypeScript.
declare namespace Deno {
  const env: { get(name: string): string | undefined };
  function serve(handler: (request: Request) => Response | Promise<Response>): unknown;
}
