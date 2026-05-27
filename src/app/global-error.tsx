// NOTE: This file must NOT use 'use client' or React hooks (useEffect, etc.)
// During Next.js prerendering, the React client context is not available,
// causing "Cannot read properties of null (reading 'useContext')" errors.

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  // global-error.tsx must define its own <html> and <body> tags
  // since the root layout is not rendered when this boundary catches
  return (
    <html lang="en">
      <body>
        <div style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',minHeight:'100vh',padding:'1.5rem',textAlign:'center',fontFamily:'system-ui, -apple-system, sans-serif'}}>
          <h1 style={{fontSize:'1.5rem',fontWeight:700,marginBottom:'0.5rem'}}>Application Error</h1>
          <p style={{marginBottom:'2rem',maxWidth:'28rem',color:'#6b7280'}}>
            A critical error occurred. Please refresh the page.
          </p>
          {error.digest && <p style={{fontSize:'0.75rem',color:'#6b7280'}}>Error ID: {error.digest}</p>}
          <button onClick={reset} style={{padding:'0.75rem 1.5rem',fontSize:'0.875rem',fontWeight:500,color:'#fff',backgroundColor:'#111827',border:'none',borderRadius:'0.5rem',cursor:'pointer'}}>
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
