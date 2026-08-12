// Thin client for the Laravel API — no request logic implemented yet, skeleton only.
// Auth is Sanctum SPA token auth (see Technical direction in the plan); this
// module is where cookie/token handling gets wired in once auth is built.

const API_URL = process.env.NEXT_PUBLIC_API_URL;

if (!API_URL) {
  throw new Error("NEXT_PUBLIC_API_URL is not set");
}

export { API_URL };
