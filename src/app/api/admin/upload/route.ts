import { NextRequest } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { apiError, handleApiError } from '@/lib/api-utils';

// Allowed MIME types for upload
const ALLOWED_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/svg+xml',
  'image/x-icon',
  'image/vnd.microsoft.icon',
  'image/webp',
]);

// Max file size: 2MB
const MAX_FILE_SIZE = 2 * 1024 * 1024;

// Valid purpose values
const VALID_PURPOSES = new Set(['logo', 'favicon', 'general']);

export async function POST(request: NextRequest) {
  try {
    // Verify admin auth
    await requireAdmin();

    // Parse form data
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const purpose = formData.get('purpose') as string | null;

    // Validate file
    if (!file) {
      return apiError('Nenhum arquivo enviado', 400);
    }

    // Validate purpose
    if (!purpose || !VALID_PURPOSES.has(purpose)) {
      return apiError('Purpose inválido. Use: logo, favicon, ou general', 400);
    }

    // Validate file type
    if (!ALLOWED_TYPES.has(file.type)) {
      return apiError(
        'Tipo de arquivo não suportado. Use PNG, SVG, JPG, ICO ou WEBP',
        400
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return apiError('Arquivo muito grande. Máximo: 2MB', 400);
    }

    // Convert file to base64 data URL
    // This approach stores images directly in the database config values,
    // ensuring persistence across Docker container restarts/redeployments
    const arrayBuffer = await file.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString('base64');
    const dataUrl = `data:${file.type};base64,${base64}`;

    return Response.json({
      success: true,
      url: dataUrl,
      purpose,
      size: file.size,
      type: file.type,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
