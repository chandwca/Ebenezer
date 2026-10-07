import WebSocket from 'ws';
// ws implements the browser-style transport API, but its overloaded constructor
// types include a server-only null address that Supabase's type does not model.
export const nodeWebSocket = WebSocket;
