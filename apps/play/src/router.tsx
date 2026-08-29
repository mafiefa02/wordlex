import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createRouter as createTanStackRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

export function getRouter() {
  /*
    Made here rather than at module scope: this runs once per request on the
    server, and a client shared across requests would hand one Player's board to
    the next. Nothing actually fetches during SSR — the Game token is host-only
    to the API (ADR 0003) — so on the server this client stays empty.

    These defaults are the whole cache policy (ADR 0031). `retry` is off because
    the API answers rather than fails for everything a Player can cause (ADR
    0023), so a retry only ever repeats a network failure they are already being
    told about. Refetching on focus and on reconnect is off because the board
    changes only through this app's own writes, and one landing mid-reveal would
    swap the board out from under the animation.

    `staleTime` is left at zero on purpose: a Track's board is re-read every
    time its screen mounts, which is what keeps a cached board honest.
  */
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, refetchOnWindowFocus: false, refetchOnReconnect: false },
    },
  });

  return createTanStackRouter({
    routeTree,
    scrollRestoration: true,
    defaultPreload: "intent",
    Wrap: ({ children }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    ),
  });
}

declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof getRouter>;
  }
}
