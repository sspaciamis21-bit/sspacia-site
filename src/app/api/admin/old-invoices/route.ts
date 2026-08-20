import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/jwt';
import prisma from '@/lib/prisma';
import { getNodeScopedUserIds } from '@/lib/auth/getNodeScopedUserIds';
import { findOldInvoices, createOldInvoice, getArchivedCompanyNames } from '@/lib/old-invoices-db';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value;
    let currentUserId: number | null = null;
    let currentUserRole = '';

    if (token) {
      const payload = await verifyToken(token);
      if (payload?.id) {
        currentUserId = Number(payload.id);
        currentUserRole = String(payload.role || '').toUpperCase();
      }
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const companyName = searchParams.get('companyName');
    const month = searchParams.get('month');
    const yearStr = searchParams.get('year');
    const locationIdStr = searchParams.get('locationId');

    const year = yearStr && yearStr !== 'ALL' ? parseInt(yearStr, 10) : null;
    let locationId = locationIdStr && locationIdStr !== 'ALL' ? parseInt(locationIdStr, 10) : null;
    let uploadedByIds: number[] | null = null;

    if (!locationId && currentUserId && currentUserRole !== 'SUPER_ADMIN' && currentUserRole !== 'ADMIN') {
      const scopedUserIds = await getNodeScopedUserIds(currentUserId);
      if (scopedUserIds !== null) {
        uploadedByIds = scopedUserIds;
      }
    }

    // Fetch Old Invoice records via robust helper
    const oldInvoices = await findOldInvoices({
      search,
      companyName,
      month,
      year,
      locationId,
      uploadedByIds,
    });

    // Fetch existing companies from ClientMaster for auto-suggestions
    const clientMasterCompanies = await (prisma as any).clientMaster.findMany({
      select: { companyName: true },
      distinct: ['companyName'],
    });

    const archivedCompanies = await getArchivedCompanyNames();

    const companySet = new Set<string>();
    (clientMasterCompanies || []).forEach((c: any) => {
      if (c.companyName?.trim()) companySet.add(c.companyName.trim());
    });
    (archivedCompanies || []).forEach((c: any) => {
      if (typeof c === 'string' && c.trim()) companySet.add(c.trim());
    });

    const companySuggestions = Array.from(companySet).sort();

    // Fetch locations for filter dropdown
    const locations = await (prisma as any).location.findMany({
      select: { id: true, name: true, slug: true },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json({
      success: true,
      data: oldInvoices || [],
      companySuggestions,
      locations: locations || [],
    });
  } catch (error: any) {
    console.error('Error fetching old invoices:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch old invoices' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value;
    let currentUserId: number | null = null;
    let currentUserName = 'Community Manager';
    let currentUserRole = 'COMMUNITY_MANAGER';

    if (token) {
      const payload = await verifyToken(token);
      if (payload?.id) {
        currentUserId = Number(payload.id);
        currentUserRole = String(payload.role || 'COMMUNITY_MANAGER').toUpperCase();

        const user = await (prisma as any).user.findUnique({
          where: { id: currentUserId },
          select: { name: true, role: { select: { name: true } } },
        });
        if (user) {
          currentUserName = user.name || currentUserName;
          if (user.role?.name) currentUserRole = user.role.name;
        }
      }
    }

    const body = await request.json();
    const {
      companyName,
      locationId,
      locationName,
      invoices,
      invoiceNo,
      month,
      year,
      invoiceUrl,
      fileName,
      fileSize,
      amount,
      remarks,
    } = body;

    if (!companyName || !companyName.trim()) {
      return NextResponse.json(
        { success: false, error: 'Company name is required' },
        { status: 400 }
      );
    }

    // ── BATCH CREATION SUPPORT (MULTIPLE INVOICES FOR SAME COMPANY) ──
    if (Array.isArray(invoices) && invoices.length > 0) {
      const validInvoices = invoices.filter((inv: any) => inv && inv.invoiceUrl && inv.invoiceUrl.trim());
      if (validInvoices.length === 0) {
        return NextResponse.json(
          { success: false, error: 'At least one invoice file is required' },
          { status: 400 }
        );
      }

      const createdList = [];
      for (const inv of validInvoices) {
        const invMonth = (inv.month || month || 'April 2026').trim();
        let parsedYear = inv.year ? parseInt(String(inv.year), 10) : null;
        if (!parsedYear) {
          const yearMatch = invMonth.match(/\b(20\d{2})\b/);
          parsedYear = yearMatch ? parseInt(yearMatch[1], 10) : new Date().getFullYear();
        }

        const parsedAmount = inv.amount ? parseFloat(String(inv.amount).replace(/[^0-9.-]+/g, '')) : null;

        const record = await createOldInvoice({
          companyName: companyName.trim(),
          invoiceNo: inv.invoiceNo ? inv.invoiceNo.trim() : null,
          month: invMonth,
          year: isNaN(parsedYear) ? null : parsedYear,
          invoiceUrl: inv.invoiceUrl.trim(),
          fileName: inv.fileName || 'Invoice.pdf',
          fileSize: inv.fileSize ? String(inv.fileSize) : null,
          amount: parsedAmount !== null && !isNaN(parsedAmount) ? parsedAmount : null,
          remarks: inv.remarks ? inv.remarks.trim() : null,
          locationId: locationId ? parseInt(String(locationId), 10) : null,
          locationName: locationName || null,
          uploadedById: currentUserId,
          uploadedByName: currentUserName,
          uploadedByRole: currentUserRole,
        });
        createdList.push(record);
      }

      return NextResponse.json({
        success: true,
        data: createdList,
        count: createdList.length,
        message: `Successfully archived ${createdList.length} invoice(s) for ${companyName}!`,
      });
    }

    // ── SINGLE INVOICE CREATION (BACKWARD COMPATIBILITY) ──
    if (!month || !month.trim()) {
      return NextResponse.json(
        { success: false, error: 'Billing month is required' },
        { status: 400 }
      );
    }

    if (!invoiceUrl || !invoiceUrl.trim()) {
      return NextResponse.json(
        { success: false, error: 'Invoice PDF file is required' },
        { status: 400 }
      );
    }

    // Auto-extract year if not explicitly passed
    let parsedYear = year ? parseInt(String(year), 10) : null;
    if (!parsedYear) {
      const yearMatch = month.match(/\b(20\d{2})\b/);
      if (yearMatch) {
        parsedYear = parseInt(yearMatch[1], 10);
      } else {
        parsedYear = new Date().getFullYear();
      }
    }

    const parsedAmount = amount ? parseFloat(String(amount).replace(/[^0-9.-]+/g, '')) : null;

    const newRecord = await createOldInvoice({
      companyName: companyName.trim(),
      invoiceNo: invoiceNo ? invoiceNo.trim() : null,
      month: month.trim(),
      year: isNaN(parsedYear) ? null : parsedYear,
      invoiceUrl: invoiceUrl.trim(),
      fileName: fileName || 'Invoice.pdf',
      fileSize: fileSize ? String(fileSize) : null,
      amount: parsedAmount !== null && !isNaN(parsedAmount) ? parsedAmount : null,
      remarks: remarks ? remarks.trim() : null,
      locationId: locationId ? parseInt(String(locationId), 10) : null,
      locationName: locationName || null,
      uploadedById: currentUserId,
      uploadedByName: currentUserName,
      uploadedByRole: currentUserRole,
    });

    return NextResponse.json({
      success: true,
      data: newRecord,
      message: 'Old invoice uploaded successfully!',
    });
  } catch (error: any) {
    console.error('Error creating old invoice record:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to create old invoice record' },
      { status: 500 }
    );
  }
}
