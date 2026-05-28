import { NextResponse } from 'next/server';

// This route has been disabled for security reasons.
// Bitget API keys should never be exposed via a public endpoint.
export async function GET() {
  return NextResponse.json({ error: 'Endpoint disabled' }, { status: 404 });
}

export async function POST() {
  return NextResponse.json({ error: 'Endpoint disabled' }, { status: 404 });
}
