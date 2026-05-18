import { NextRequest, NextResponse } from 'next/server';
import { clearSession } from '@/lib/auth';
import { apiSuccess, handleApiError } from '@/lib/api-utils';

export async function POST(request: NextRequest) {
  try {
    await clearSession();
    return apiSuccess({ message: 'Logout realizado com sucesso' });
  } catch (error) {
    return handleApiError(error);
  }
}
