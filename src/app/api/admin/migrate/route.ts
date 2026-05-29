import { NextRequest } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { apiError, apiSuccess, handleApiError, getClientIp } from '@/lib/api-utils';
import { verifyAdminPin } from '@/lib/admin-pin';
import { verifyPinForAction } from '@/lib/admin-pin-middleware';
import { db } from '@/lib/db';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export async function POST(request: NextRequest) {
  try {
    const session = await requireAdmin();

    // Require PIN verification via x-admin-pin header or body PIN
    const headerPin = request.headers.get('x-admin-pin');
    const body = await request.json().catch(() => ({}));
    const bodyPin = body.pin;

    if (headerPin) {
      const pinResult = await verifyPinForAction(request, 'migrate_db');
      if (!pinResult.success) {
        return apiError(pinResult.error!, 403);
      }
    } else if (bodyPin) {
      const pinValid = await verifyAdminPin(session.userId, bodyPin);
      if (!pinValid) {
        return apiError('PIN de segurança inválido', 403);
      }
    } else {
      return apiError('PIN de segurança é obrigatório para esta ação', 403);
    }

    // Run prisma db push to sync schema
    let result: { stdout: string; stderr: string; error?: string; message: string };
    try {
      const { stdout, stderr } = await execAsync('npx prisma db push --accept-data-loss', {
        timeout: 60000,
        env: { ...process.env },
      });

      result = {
        message: 'Schema sincronizado com sucesso!',
        stdout: stdout.slice(-500),
        stderr: stderr.slice(-500) || '',
      };
    } catch (execError: any) {
      result = {
        message: 'Tentativa de sync concluída (pode haver avisos)',
        error: execError.message?.slice(-500),
        stdout: execError.stdout?.slice(-500) || '',
        stderr: execError.stderr?.slice(-500) || '',
      };
    }

    // Audit log
    await db.adminLog.create({
      data: {
        adminId: session.userId,
        action: 'migrate',
        entity: 'system',
        description: `Schema migration executed: ${result.message}`,
        newValue: JSON.stringify({ stdout: result.stdout, stderr: result.stderr, error: result.error }),
        ipAddress: getClientIp(request),
      },
    });

    return apiSuccess(result);
  } catch (error) {
    return handleApiError(error);
  }
}
