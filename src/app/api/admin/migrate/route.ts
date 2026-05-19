import { NextRequest } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { apiSuccess, handleApiError } from '@/lib/api-utils';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export async function POST(request: NextRequest) {
  try {
    await requireAdmin();

    // Run prisma db push to sync schema
    try {
      const { stdout, stderr } = await execAsync('npx prisma db push --accept-data-loss', {
        timeout: 60000,
        env: { ...process.env },
      });

      return apiSuccess({
        message: 'Schema sincronizado com sucesso!',
        stdout: stdout.slice(-500),
        stderr: stderr.slice(-500) || '',
      });
    } catch (execError: any) {
      return apiSuccess({
        message: 'Tentativa de sync concluída (pode haver avisos)',
        error: execError.message?.slice(-500),
        stdout: execError.stdout?.slice(-500) || '',
        stderr: execError.stderr?.slice(-500) || '',
      });
    }
  } catch (error) {
    return handleApiError(error);
  }
}
