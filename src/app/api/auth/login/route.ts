import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { loginSchema } from '@/lib/validations';
import { verifyPassword, createToken, setSessionCookie } from '@/lib/auth';
import { apiError, apiSuccess, handleApiError } from '@/lib/api-utils';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const data = loginSchema.parse(body);

    console.log(`[AUTH] Login attempt: email=${data.email}`);

    // Find user by email
    const user = await db.user.findUnique({
      where: { email: data.email },
    });

    if (!user) {
      console.log(`[AUTH] User not found: ${data.email}`);
      return apiError('Email ou senha inválidos', 401);
    }

    if (!user.isActive) {
      console.log(`[AUTH] Account deactivated: ${data.email}`);
      return apiError('Conta desativada. Contate o suporte.', 403);
    }

    // Verify password
    const isValid = await verifyPassword(data.password, user.password);
    if (!isValid) {
      console.log(`[AUTH] Invalid password for: ${data.email} (hash format: ${user.password.substring(0, 4)}..., len: ${user.password.length})`);
      return apiError('Email ou senha inválidos', 401);
    }

    console.log(`[AUTH] Login successful: ${data.email} (role: ${user.role})`);

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
