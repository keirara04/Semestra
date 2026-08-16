"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { ApiError } from "@/lib/api";

// One QueryClient per browser tab (useState, not module scope) so SSR
// never leaks one request's cache into another's, and so it survives Fast
// Refresh in dev without recreating on every render.
//
// Defaults tuned for what actually caused the repeated-429 problem this
// replaces: every page fetching its own data on every mount with no cache
// meant navigating dashboard -> calendar -> dashboard re-issued the same
// handful of GETs each time, and doubled again under Next dev's Strict
// Mode. `staleTime` of 30s means a remount within that window serves the
// cached value with zero network traffic instead of refetching; `gcTime`
// keeps unmounted queries' data around for 5 minutes so a quick trip to
// another page and back is instant. Individual queries override staleTime
// where the data is genuinely more (or less) volatile — see query-keys.ts.
function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        gcTime: 5 * 60_000,
        refetchOnWindowFocus: false,
        retry: (failureCount, error) => {
          // 4xx (bad request, not found, validation, throttled) won't
          // succeed on retry — only worth retrying transient failures.
          if (error instanceof ApiError && error.status >= 400 && error.status < 500) {
            return false;
          }
          return failureCount < 2;
        },
      },
      mutations: {
        retry: false,
      },
    },
  });
}

export function AppQueryProvider({ children }: { children: ReactNode }) {
  const [client] = useState(makeQueryClient);
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
