// Client for the Laravel API, using Sanctum SPA cookie auth (see Technical
// direction in the plan). Every mutating request needs the XSRF-TOKEN
// cookie (fetched via /sanctum/csrf-cookie) echoed back as a header;
// getCsrfCookie() + apiFetch() below handle that so callers never touch it.

import type { ZodType } from "zod";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

if (!API_URL) {
  throw new Error("NEXT_PUBLIC_API_URL is not set");
}

export { API_URL };

export class ApiError extends Error {
  status: number;
  errors?: Record<string, string[]>;

  constructor(status: number, message: string, errors?: Record<string, string[]>) {
    super(message);
    this.status = status;
    this.errors = errors;
  }
}

// Session expiring mid-use (cookie timeout, logout in another tab) means
// every in-flight and future apiFetch call starts throwing 401s with no
// single place watching for that — this event is how auth-context finds
// out without apiFetch needing to import React or hold any auth state
// itself.
const UNAUTHORIZED_EVENT = "api:unauthorized";

export function onUnauthorized(callback: () => void): () => void {
  window.addEventListener(UNAUTHORIZED_EVENT, callback);
  return () => window.removeEventListener(UNAUTHORIZED_EVENT, callback);
}

// A bare `apiFetch(...).then(setState)` with no `.catch` throws an
// unhandled promise rejection on any failure (expired session, 500, a
// dropped network connection) and leaves the calling component's state
// stuck wherever it was — usually permanently blank. Callers that don't
// need bespoke error handling (most `useEffect` load-on-mount calls)
// should end the chain with `.catch(logApiError)` at minimum, so a
// failure is visible instead of silent.
export function logApiError(error: unknown): void {
  if (error instanceof ApiError && error.status === 401) {
    // onUnauthorized() (see above) already handles this — a second
    // console.error per stale request would just be noise once the
    // redirect-to-login is already underway.
    return;
  }
  console.error(error);
}

function readCookie(name: string): string | null {
  const match = document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${name}=`));
  return match ? decodeURIComponent(match.split("=").slice(1).join("=")) : null;
}

/** Must be called before the first mutating request in a session (register/login). */
export async function getCsrfCookie(): Promise<void> {
  await fetch(`${API_URL}/sanctum/csrf-cookie`, {
    credentials: "include",
  });
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
  // Optional: most responses still just trust the compile-time type, same
  // as before — pass a schema only for shapes worth catching drift on at
  // the boundary rather than as a runtime TypeError somewhere downstream.
  schema?: ZodType<T>,
): Promise<T> {
  const xsrfToken = readCookie("XSRF-TOKEN");
  // FormData bodies (file uploads) need the browser to set their own
  // multipart boundary header; forcing application/json here would break it.
  const isFormData = options.body instanceof FormData;

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    credentials: "include",
    headers: {
      Accept: "application/json",
      ...(isFormData ? {} : { "Content-Type": "application/json" }),
      ...(xsrfToken ? { "X-XSRF-TOKEN": xsrfToken } : {}),
      ...options.headers,
    },
  });

  if (response.status === 204) {
    return undefined as T;
  }

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    if (response.status === 401 && typeof window !== "undefined") {
      window.dispatchEvent(new Event(UNAUTHORIZED_EVENT));
    }

    throw new ApiError(
      response.status,
      data?.message ?? response.statusText,
      data?.errors,
    );
  }

  if (schema) {
    const parsed = schema.safeParse(data);
    if (!parsed.success) {
      console.error(`Unexpected response shape from ${path}`, parsed.error);
      throw new ApiError(response.status, "Unexpected response shape from server.");
    }
    return parsed.data;
  }

  return data as T;
}
