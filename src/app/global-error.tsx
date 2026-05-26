'use client';

import { useEffect } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

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
            backgroundColor: 'hsl(var(--background, 0 0% 100%))',
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
              backgroundColor: 'hsl(0 84% 60% / 0.1)',
            }}
          >
            <AlertTriangle
              style={{ height: '2.5rem', width: '2.5rem', color: 'hsl(0 84% 60%)' }}
            />
          </div>
          <h1
            style={{
              fontSize: '1.5rem',
              fontWeight: 700,
              marginBottom: '0.5rem',
              color: 'hsl(var(--foreground, 222 47% 11%))',
            }}
          >
            Application Error
          </h1>
          <p
            style={{
              marginBottom: '2rem',
              maxWidth: '28rem',
              color: 'hsl(var(--muted-foreground, 215 16% 47%))',
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
                color: 'hsl(var(--muted-foreground, 215 16% 47%))',
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
              backgroundColor: 'hsl(var(--primary, 0 0% 9%))',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            <RotateCcw style={{ height: '1rem', width: '1rem' }} />
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
