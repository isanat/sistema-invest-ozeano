'use client';

// Prevent static prerendering of this error page
// This avoids the "Cannot read properties of null (reading 'useContext')" bug
// that occurs during Next.js 16 static generation
export const dynamic = 'force-dynamic';

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="es">
      <body>
        <div style={{alignItems:'center',display:'flex',flexDirection:'column',height:'100vh',justifyContent:'center',fontFamily:'system-ui,sans-serif',backgroundColor:'#0a0a0a',color:'#fff'}}>
          <h2 style={{fontSize:'24px',marginBottom:'16px'}}>Algo deu errado!</h2>
          <p style={{marginBottom:'24px',color:'#999'}}>Ocorreu um erro inesperado.</p>
          <button
            onClick={() => reset()}
            style={{padding:'12px 24px',borderRadius:'8px',border:'none',backgroundColor:'#22c55e',color:'#fff',cursor:'pointer',fontSize:'16px'}}
          >
            Tentar novamente
          </button>
        </div>
      </body>
    </html>
  );
}
