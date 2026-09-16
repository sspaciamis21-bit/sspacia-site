import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const { path: pathSegments } = await params;
    if (!pathSegments || pathSegments.length === 0) {
      return NextResponse.json({ error: 'File path not specified' }, { status: 400 });
    }

    const relativeFilePath = pathSegments.join('/');
    const fileName = pathSegments[pathSegments.length - 1];

    // 1. Try to read from local disk in public/uploads/...
    const diskPath = path.join(process.cwd(), 'public', 'uploads', ...pathSegments);
    if (fs.existsSync(diskPath)) {
      const stats = fs.statSync(diskPath);
      if (stats.isFile()) {
        const fileBuffer = fs.readFileSync(diskPath);
        const ext = path.extname(diskPath).toLowerCase();
        let mimeType = 'application/octet-stream';
        if (ext === '.pdf') mimeType = 'application/pdf';
        else if (ext === '.jpg' || ext === '.jpeg') mimeType = 'image/jpeg';
        else if (ext === '.png') mimeType = 'image/png';
        else if (ext === '.docx') mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
        else if (ext === '.doc') mimeType = 'application/msword';

        return new NextResponse(fileBuffer, {
          status: 200,
          headers: {
            'Content-Type': mimeType,
            'Content-Disposition': `inline; filename="${fileName.replace(/"/g, '')}"`,
            'Content-Length': String(stats.size),
            'Cache-Control': 'public, max-age=86400',
          },
        });
      }
    }

    // 2. If not found on disk, look up in StoredDocument database table by filename
    const cleanFileName = fileName.replace(/^\d+_/, ''); // Remove leading timestamp if present
    const doc = await (prisma as any).storedDocument.findFirst({
      where: {
        OR: [
          { fileName: fileName },
          { fileName: cleanFileName },
          { fileName: { contains: cleanFileName } },
        ],
      },
      orderBy: { id: 'desc' },
    });

    if (doc?.fileData) {
      return new NextResponse(Buffer.from(doc.fileData), {
        status: 200,
        headers: {
          'Content-Type': doc.mimeType || 'application/pdf',
          'Content-Disposition': `inline; filename="${(doc.fileName || fileName).replace(/"/g, '')}"`,
          'Content-Length': String(doc.fileSize || doc.fileData.length),
          'Cache-Control': 'public, max-age=86400',
        },
      });
    }

    // 3. If the actual file is not on disk and not in StoredDocument, return 404 error
    return NextResponse.json(
      {
        error: 'Attached resume file not found on server.',
        message: 'The original resume was delivered as an email attachment to hr.ssinfrazone@gmail.com.',
        fileName: fileName,
      },
      { status: 404 }
    );
  } catch (error: any) {
    console.error('[Uploads Route Error]:', error);
    return NextResponse.json({ error: 'Failed to retrieve file' }, { status: 500 });
  }
}
