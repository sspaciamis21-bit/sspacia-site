import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { withPermission } from '@/lib/auth/withPermission';
import { uploadDocument } from '@/lib/driveUpload';

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/admin/documents/drive-upload
// Handles direct upload to Google Drive via Apps Script and creates a Document record.
// ─────────────────────────────────────────────────────────────────────────────
export const POST = withPermission('documents', 'update', async (req: NextRequest, { payload }) => {
  try {
    const formData = await req.formData();
    const file = formData.get('file');

    if (!file || !(file instanceof Blob)) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const title = formData.get('title') as string;
    const categoryIdStr = formData.get('categoryId') as string;
    const bookingIdStr = formData.get('bookingId') as string | null;
    const notes = formData.get('notes') as string | null;

    if (!title || !categoryIdStr) {
      return NextResponse.json({ error: 'Title and categoryId are required' }, { status: 400 });
    }

    const categoryId = parseInt(categoryIdStr, 10);
    const bookingId  = bookingIdStr ? parseInt(bookingIdStr, 10) : null;
    const role       = payload.role as string;
    const email      = payload.email as string;

    // 1. Resolve Customer Identity
    let customer = await prisma.customer.findUnique({ where: { email } });
    if (!customer && role === 'USER') {
        const user = await prisma.user.findUnique({ where: { email } });
        customer = await prisma.customer.create({
            data: {
                email,
                name: user?.name || 'User',
                phone: user?.phone || undefined,
                organization: user?.companyName || undefined,
            }
        });
    } else if (!customer) {
        // For admin/staff, they might be uploading for a specific customer
        const targetCustomerId = formData.get('customerId') as string | null;
        if (targetCustomerId) {
            customer = await prisma.customer.findUnique({ where: { id: parseInt(targetCustomerId, 10) } });
        }
    }

    if (!customer) {
        return NextResponse.json({ error: 'Customer record missing or target customer not specified' }, { status: 400 });
    }

    // 2. Resolve Category Name for Folder Structure
    const category = await prisma.documentCategory.findUnique({ where: { id: categoryId } });
    if (!category) {
        return NextResponse.json({ error: 'Invalid document category' }, { status: 400 });
    }

    // 3. Prepare File Buffer
    const arrayBuffer = await file.arrayBuffer();
    const fileBuffer = Buffer.from(arrayBuffer);

    // 4. Upload to Drive
    const driveResult = await uploadDocument({
        companyName:  'SSPACIA', // Could be dynamic if needed
        customerName: customer.name,
        category:     category.displayName,
        fileName:     file.name,
        mimeType:     file.type,
        fileBuffer:   fileBuffer,
    });

    // 5. Get default PENDING status
    const pendingStatus = await prisma.documentStatus.findFirst({
        where: { name: 'PENDING' }
    });

    // 6. Create Document Record
    const document = await prisma.document.create({
        data: {
            title,
            fileUrl:  driveResult.fileUrl,
            fileName: driveResult.fileName,
            fileSize: driveResult.fileSize,
            mimeType: driveResult.mimeType,
            categoryId,
            bookingId,
            customerId: customer.id,
            statusId:   pendingStatus?.id ?? 1,
            notes,
        },
        include: {
            category: { select: { name: true } },
            status: { select: { name: true } },
        }
    });

    await prisma.activityLog.create({
        data: {
            userId: Number(payload.id),
            action: 'CREATE',
            module: 'documents',
            recordId: document.id,
            newData: JSON.stringify(document),
            ipAddress: req.headers.get('x-forwarded-for') ?? null,
        },
    });

    return NextResponse.json({ 
        data: document, 
        message: 'Document uploaded to Google Drive successfully' 
    });

  } catch (error: unknown) {
    console.error('[DRIVE_UPLOAD_ROUTE]', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
});
