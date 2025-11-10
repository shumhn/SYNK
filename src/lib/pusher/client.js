import PusherJS from "pusher-js";

// Client-side Pusher instance for subscribing to events
// Only runs in browser
let pusherClient = null;

export function getPusherClient() {
  if (!pusherClient && typeof window !== "undefined") {
    pusherClient = new PusherJS(process.env.NEXT_PUBLIC_PUSHER_KEY, {
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER,
    });
  }
  return pusherClient;
}

export default getPusherClient;
