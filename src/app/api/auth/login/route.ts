import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { loginSchema } from '@/lib/validations';
import { verifyPassword, createToken, setSessionCookie } from '@/lib/auth';
import { apiError, apiSuccess, handleApiError } from '@/lib/api-utils';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const data = loginSchema.parse(body);

    // Find user by email
    const user = await db.user.findUnique({
      where: { email: data.email },
    });

    if (!user) {
      return apiError('Email ou senha inválidos', 401);
    }

    if (!user.isActive) {
      return apiError('Conta desativada. Contate o suporte.', 403);
    }

    // Verify password
    const isValid = await verifyPassword(data.password, user.password);
    if (!isValid) {
      return apiError('Email ou senha inválidos', 401);
    }

    // Create session
    const payload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
    };

    await setSessionCookie(payload);

    // Return user data without password
    const { password: _, ...userWithoutPassword } = user;
    return apiSuccess({ user: userWithoutPassword });
  } catch (error) {
    return handleApiError(error);
  }
}
