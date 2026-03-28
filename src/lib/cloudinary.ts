import crypto from 'crypto';

const CLOUDINARY_CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME;
const CLOUDINARY_API_KEY = process.env.CLOUDINARY_API_KEY;
const CLOUDINARY_API_SECRET = process.env.CLOUDINARY_API_SECRET;
const CLOUDINARY_UPLOAD_PRESET = process.env.CLOUDINARY_UPLOAD_PRESET;

export async function uploadFileToCloudinary(file: File): Promise<string> {
  if (!CLOUDINARY_CLOUD_NAME) {
    throw new Error('Missing CLOUDINARY_CLOUD_NAME in environment');
  }
  if (!CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
    throw new Error('Missing Cloudinary API keys in environment');
  }

  const formData = new FormData();
  formData.append('file', file);

  const timestamp = Math.floor(Date.now() / 1000);

  if (CLOUDINARY_UPLOAD_PRESET) {
    formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
  } else {
    // Signed (server-side) upload in case unsigned preset is not configured.
    const toSign = `timestamp=${timestamp}${CLOUDINARY_API_SECRET}`;
    const signature = crypto.createHash('sha1').update(toSign).digest('hex');

    formData.append('api_key', CLOUDINARY_API_KEY);
    formData.append('timestamp', String(timestamp));
    formData.append('signature', signature);
  }

  const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`, {
    method: 'POST',
    body: formData,
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error?.message ?? 'Cloudinary upload failed');
  }
  return data.secure_url;
}
