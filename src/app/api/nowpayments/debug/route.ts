import { NextResponse } from 'next/server';

// ============================================================================
// DEPRECATED: This endpoint has been moved to /api/admin/nowpayments-debug
// for proper admin access control. This route returns 410 Gone.
// ============================================================================

export async function GET() {
  return NextResponse.json(
    { error: 'Endpoint movido para /api/admin/nowpayments-debug', movedTo: '/api/admin/nowpayments-debug' },
    { status: 410 }
  );
}
