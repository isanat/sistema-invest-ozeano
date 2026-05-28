import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { registerSchema } from '@/lib/validations';
import { hashPassword, setSessionCookie } from '@/lib/auth';
import { generateAffiliateCode } from '@/lib/affiliate';
import { apiError, apiSuccess, handleApiError } from '@/lib/api-utils';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const data = registerSchema.parse(body);

    // Check email uniqueness
    const existingUser = await db.user.findUnique({
      where: { email: data.email },
    });

    if (existingUser) {
      return apiError('Email já cadastrado', 409);
    }

    // Hash password
    const hashedPassword = await hashPassword(data.password);

    // Generate affiliate code
    const affiliateCode = generateAffiliateCode(data.name);

    // Handle referral code (case-insensitive: affiliate codes are uppercase, but users may type lowercase)
    let referredBy: string | null = null;
    if (data.referralCode) {
      const referrer = await db.user.findFirst({
        where: { affiliateCode: { equals: data.referralCode.toUpperCase(), mode: 'insensitive' } },
      });
      if (referrer) {
        referredBy = referrer.id;
      }
    }

    // Create user
    const user = await db.user.create({
      data: {
        email: data.email,
        password: hashedPassword,
        name: data.name,
        affiliateCode,
        referredBy,
      },
    });

    // Set session cookie
    await setSessionCookie({
      userId: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
    });

    // Return user data without password
    const { password: _, ...userWithoutPassword } = user;
    return apiSuccess({ user: userWithoutPassword }, 201);
  } catch (error: any) {
    // Handle Prisma unique constraint violation (P2002) - race condition on email
    if (error?.code === 'P2002' && error?.meta?.target?.includes('email')) {
      return apiError('Email já cadastrado no sistema', 409);
    }
    return handleApiError(error);
  }
}
