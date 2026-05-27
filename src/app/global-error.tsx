'use client';

import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[GlobalErrorBoundary]', error);
  }, [error]);

  // global-error.tsx must define its own <html> and <body> tags
  // since the root layout is not rendered when this boundary catches
  // NOTE: Do NOT import from lucide-react or other component libraries here
  // as they rely on React context which may not be available during SSR/static generation
  return (
    <html lang="en">
      <body style={{ margin: 0, padding: 0 }}>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '100vh',
            padding: '1.5rem',
            textAlign: 'center',
            backgroundColor: '#ffffff',
            fontFamily: 'system-ui, -apple-system, sans-serif',
          }}
        >
          <div
            style={{
              marginBottom: '1.5rem',
              display: 'flex',
              height: '5rem',
              width: '5rem',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '9999px',
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
            }}
          >
            {/* Alert Triangle SVG - inline to avoid context issues */}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="40"
              height="40"
              viewBox="0 0 24 24"
              fill="none"
              stroke="rgb(239, 68, 68)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3" />
              <path d="M12 9v4" />
              <path d="M12 17h.01" />
            </svg>
          </div>
          <h1
            style={{
              fontSize: '1.5rem',
              fontWeight: 700,
              marginBottom: '0.5rem',
              color: '#111827',
            }}
          >
            Application Error
          </h1>
          <p
            style={{
              marginBottom: '2rem',
              maxWidth: '28rem',
              color: '#6b7280',
            }}
          >
            A critical error occurred and the application could not recover.
            Please refresh the page or contact support if the problem persists.
          </p>
          {error.digest && (
            <p
              style={{
                marginBottom: '1rem',
                fontSize: '0.75rem',
                color: '#6b7280',
              }}
            >
              Error ID: {error.digest}
            </p>
          )}
          <button
            onClick={reset}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              borderRadius: '0.5rem',
              padding: '0.75rem 1.5rem',
              fontSize: '0.875rem',
              fontWeight: 500,
              color: '#fff',
              backgroundColor: '#111827',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            {/* RotateCcw SVG - inline to avoid context issues */}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
              <path d="M3 3v5h5" />
            </svg>
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
