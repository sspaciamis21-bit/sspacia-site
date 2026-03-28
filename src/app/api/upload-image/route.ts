import { NextResponse } from 'next/server';
import { uploadFileToCloudinary } from '@/lib/cloudinary';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: 'File is required' }, { status: 400 });
    }

    const imageUrl = await uploadFileToCloudinary(file);
    return NextResponse.json({ data: { url: imageUrl } }, { status: 201 });
  } catch (error) {
    console.error('POST /api/upload-image error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
