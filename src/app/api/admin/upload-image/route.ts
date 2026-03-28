import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/jwt';
import { uploadFileToCloudinary } from '@/lib/cloudinary';

async function requireAdmin() {
  const cookieStore = await cookies();
  const token = cookieStore.get('auth-token')?.value;
  if (!token) return null;
  const payload = await verifyToken(token);
  if (!payload || (payload.role as string) !== 'ADMIN') return null;
  return payload;
}

export async function POST(request: Request) {
  try {
    const auth = await requireAdmin();
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file');

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: 'File is required' }, { status: 400 });
    }

    const imageUrl = await uploadFileToCloudinary(file);
    return NextResponse.json({ data: { url: imageUrl } }, { status: 201 });
  } catch (error) {
    console.error('POST /api/admin/upload-image error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
