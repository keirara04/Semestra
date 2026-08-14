export function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path
        fill="#4285F4"
        d="M23.5 12.3c0-.85-.08-1.66-.22-2.45H12v4.63h6.46a5.53 5.53 0 0 1-2.4 3.63v3h3.88c2.27-2.09 3.56-5.17 3.56-8.81Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.96-1.07 7.94-2.9l-3.88-3c-1.08.72-2.46 1.15-4.06 1.15-3.12 0-5.77-2.11-6.71-4.94H1.28v3.1A12 12 0 0 0 12 24Z"
      />
      <path fill="#FBBC05" d="M5.29 14.31A7.2 7.2 0 0 1 4.91 12c0-.8.14-1.58.38-2.31v-3.1H1.28A12 12 0 0 0 0 12c0 1.94.46 3.77 1.28 5.41l4.01-3.1Z" />
      <path
        fill="#EA4335"
        d="M12 4.75c1.76 0 3.34.6 4.58 1.79l3.44-3.44C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.69 1.28 6.59l4.01 3.1C6.23 6.86 8.88 4.75 12 4.75Z"
      />
    </svg>
  );
}

export function AppleIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M16.36 1c.1 1.02-.3 2.02-.9 2.75-.62.75-1.65 1.33-2.65 1.25-.12-1 .38-2.05.96-2.7C14.4 1.58 15.44 1.06 16.36 1Zm3.34 17.02c-.5 1.13-.74 1.63-1.38 2.63-.9 1.4-2.16 3.14-3.73 3.16-1.4.02-1.76-.9-3.65-.9-1.9 0-2.3.88-3.68.92-1.5.05-2.65-1.5-3.55-2.9C1.15 17.9.35 14.1 1.7 11.4c.7-1.4 1.94-2.28 3.28-2.3 1.4-.02 2.72.94 3.58.94.85 0 2.45-1.16 4.14-.99.7.03 2.67.28 3.94 2.1-.1.06-2.35 1.37-2.33 4.09.02 3.24 2.85 4.32 2.89 4.33Z" />
    </svg>
  );
}

export function EyeIcon({ open, className }: { open: boolean; className?: string }) {
  if (open) {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
        <path
          d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7Z"
          stroke="currentColor"
          strokeWidth="1.5"
        />
        <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.5" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path
        d="M3 3l18 18M10.6 10.6a3 3 0 0 0 4.24 4.24M6.6 6.7C3.9 8.3 1 12 1 12s4 7 11 7c1.6 0 3-.35 4.24-.9M9.9 5.2A10.9 10.9 0 0 1 12 5c7 0 11 7 11 7-.4.7-1.1 1.7-2.1 2.7"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}
