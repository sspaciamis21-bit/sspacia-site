import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { withPermission } from '@/lib/auth/withPermission';
import crypto from 'crypto';

const CLOUDINARY_CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME;
const CLOUDINARY_API_KEY    = process.env.CLOUDINARY_API_KEY;
const CLOUDINARY_API_SECRET = process.env.CLOUDINARY_API_SECRET;
const CLOUDINARY_UPLOAD_PRESET = process.env.CLOUDINARY_UPLOAD_PRESET;

// POST /api/admin/upload-image — Upload an image to Cloudinary (no cloudinary SDK needed)
export const POST = withPermission('products', 'update', async (req: NextRequest) => {
  try {
    if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
      return NextResponse.json(
        { error: 'Cloudinary environment variables are not configured' },
        { status: 500 }
      );
    }

    const formData = await req.formData();
    const file = formData.get('file');

    if (!file || !(file instanceof Blob)) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const timestamp = Math.floor(Date.now() / 1000);
    const uploadData = new FormData();
    uploadData.append('file', file);

    if (CLOUDINARY_UPLOAD_PRESET) {
      uploadData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
    } else {
      // Signed upload
      const folder = (formData.get('folder') as string | null) ?? 'sspacia';
      const toSign = `folder=${folder}&timestamp=${timestamp}${CLOUDINARY_API_SECRET}`;
      const signature = crypto.createHash('sha1').update(toSign).digest('hex');

      uploadData.append('api_key',   CLOUDINARY_API_KEY);
      uploadData.append('timestamp', String(timestamp));
      uploadData.append('signature', signature);
      uploadData.append('folder',    folder);
    }

    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
      { method: 'POST', body: uploadData }
    );

    const result = await response.json() as {
      secure_url?: string;
      public_id?: string;
      width?: number;
      height?: number;
      format?: string;
      error?: { message: string };
    };

    if (!response.ok || result.error) {
      console.error('[UPLOAD_IMAGE] Cloudinary error:', result.error);
      return NextResponse.json({ error: result.error?.message ?? 'Upload failed' }, { status: 500 });
    }

    return NextResponse.json({
      data: {
        url:      result.secure_url,
        publicId: result.public_id,
        width:    result.width,
        height:   result.height,
        format:   result.format,
      },
    });
  } catch (error) {
    console.error('[UPLOAD_IMAGE]', error);
    return NextResponse.json({ error: 'Failed to upload image' }, { status: 500 });
  }
});
