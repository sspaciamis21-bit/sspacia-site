import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { withPermission } from '@/lib/auth/withPermission';
import crypto from 'crypto';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

const CLOUDINARY_CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME;
const CLOUDINARY_API_KEY    = process.env.CLOUDINARY_API_KEY;
const CLOUDINARY_API_SECRET = process.env.CLOUDINARY_API_SECRET;
const CLOUDINARY_UPLOAD_PRESET = process.env.CLOUDINARY_UPLOAD_PRESET;

// POST /api/admin/upload-image — Upload image (Cloudinary or Local Public Uploads fallback)
export const POST = withPermission('products', 'update', async (req: NextRequest) => {
  try {
    const formData = await req.formData();
    const file = formData.get('file');

    if (!file || !(file instanceof Blob)) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // 1. If Cloudinary credentials exist, upload to Cloudinary
    if (CLOUDINARY_CLOUD_NAME && CLOUDINARY_API_KEY && CLOUDINARY_API_SECRET) {
      const timestamp = Math.floor(Date.now() / 1000);
      const uploadData = new FormData();
      uploadData.append('file', file);

      if (CLOUDINARY_UPLOAD_PRESET) {
        uploadData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
      } else {
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
        error?: { message: string };
      };

      if (response.ok && result.secure_url) {
        return NextResponse.json({
          data: {
            url: result.secure_url,
            publicId: result.public_id,
          },
        });
      }
    }

    // 2. Local File System Upload Fallback (Saves to /public/uploads/)
    const buffer = Buffer.from(await file.arrayBuffer());
    const originalName = (file as any).name || 'uploaded_image.jpg';
    const sanitizedName = originalName.toLowerCase().replace(/[^a-z0-9._-]/g, '_');
    const fileName = `${Date.now()}_${sanitizedName}`;

    const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
    await mkdir(uploadsDir, { recursive: true });

    const filePath = path.join(uploadsDir, fileName);
    await writeFile(filePath, buffer);

    const localUrl = `/uploads/${fileName}`;

    return NextResponse.json({
      data: {
        url: localUrl,
        filename: fileName,
      },
    });

  } catch (error) {
    console.error('[UPLOAD_IMAGE]', error);
    return NextResponse.json({ error: 'Failed to upload image' }, { status: 500 });
  }
});
