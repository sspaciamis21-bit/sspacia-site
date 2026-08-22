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
    let isSuperAdmin = false;
    let userAssignedLocationIds: number[] = [];
    let userAssignedLocations: { id: number; name: string; slug?: string }[] = [];

    let isAccountant = false;

    if (token) {
      const payload = await verifyToken(token);
      if (payload?.id) {
        currentUserId = Number(payload.id);
        currentUserRole = String(payload.role || '').toUpperCase();

        const dbUser = await (prisma as any).user.findUnique({
          where: { id: currentUserId },
          select: {
            name: true,
            email: true,
            role: { select: { name: true } },
            assignedLocations: {
              select: {
                locationId: true,
                location: { select: { id: true, name: true, slug: true } }
              }
            }
          }
        });

        if (dbUser) {
          const roleName = dbUser.role?.name ? String(dbUser.role.name).toUpperCase() : currentUserRole;
          currentUserRole = roleName;
          isSuperAdmin = roleName === 'ADMIN' || roleName === 'SUPER_ADMIN';
          isAccountant = (dbUser.email || '').toLowerCase() === 'ssinfrazone21@gmail.com' || (dbUser.name || '').toLowerCase() === 'accounts';

          userAssignedLocations = (dbUser.assignedLocations || [])
            .map((al: any) => al.location)
            .filter(Boolean);
          userAssignedLocationIds = userAssignedLocations.map((loc: any) => loc.id);
        }
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
    let targetLocationId: number | null = locationId;
    let targetLocationIds: number[] | null = null;

    // ── ROLE-BASED LOCATION ACCESS CONTROL ──
    // Community Managers can ONLY view old invoices for their assigned center(s) (e.g. Agarwal Complex)
    // Super Admins and Accountants can view and filter any center across all companies
    if (!isSuperAdmin && !isAccountant) {
      if (userAssignedLocationIds.length > 0) {
        if (locationId && userAssignedLocationIds.includes(locationId)) {
          targetLocationId = locationId;
        } else {
          targetLocationId = null;
          targetLocationIds = userAssignedLocationIds;
        }
      } else if (currentUserId) {
        const scopedUserIds = await getNodeScopedUserIds(currentUserId);
        if (scopedUserIds !== null) {
          uploadedByIds = scopedUserIds;
        }
      }
    }

    // Fetch Old Invoice records via helper with location scoping
    const oldInvoices = await findOldInvoices({
      search,
      companyName,
      month,
      year,
      locationId: targetLocationId,
      locationIds: targetLocationIds,
      uploadedByIds,
    });

    // Fetch existing companies from ClientMaster for auto-suggestions
    // ClientMaster doesn't have locationId — scope by createdById for non-admin users
    let clientMasterWhere: any = undefined;
    if (!isSuperAdmin && !isAccountant && userAssignedLocationIds.length > 0) {
      // Find user IDs assigned to the same locations
      const scopedUsers = await (prisma as any).userLocation.findMany({
        where: { locationId: { in: userAssignedLocationIds } },
        select: { userId: true },
      });
      const scopedUserIds = scopedUsers.map((u: any) => u.userId).filter(Boolean);
      if (scopedUserIds.length > 0) {
        clientMasterWhere = { createdById: { in: scopedUserIds } };
      }
    }
    const clientMasterCompanies = await (prisma as any).clientMaster.findMany({
      where: clientMasterWhere,
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

    // Fetch locations for filter dropdown (All for Admin & Accountant, assigned for CM)
    const locations = (isSuperAdmin || isAccountant)
      ? await (prisma as any).location.findMany({
          select: { id: true, name: true, slug: true },
          orderBy: { name: 'asc' },
        })
      : userAssignedLocations;

    // Determine the user's primary location name for frontend display
    const userLocationName = userAssignedLocations.length > 0 ? userAssignedLocations[0].name : null;

    return NextResponse.json({
      success: true,
      data: oldInvoices || [],
      companySuggestions,
      locations: locations || [],
      isSuperAdmin: isSuperAdmin || isAccountant,
      userLocationName,
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
    let isSuperAdmin = false;
    let userPrimaryLocationId: number | null = null;
    let userPrimaryLocationName: string | null = null;

    if (token) {
      const payload = await verifyToken(token);
      if (payload?.id) {
        currentUserId = Number(payload.id);
        currentUserRole = String(payload.role || 'COMMUNITY_MANAGER').toUpperCase();

        const dbUser = await (prisma as any).user.findUnique({
          where: { id: currentUserId },
          select: {
            name: true,
            role: { select: { name: true } },
            assignedLocations: {
              select: {
                locationId: true,
                location: { select: { id: true, name: true, slug: true } }
              }
            }
          },
        });

        if (dbUser) {
          currentUserName = dbUser.name || currentUserName;
          const roleName = dbUser.role?.name ? String(dbUser.role.name).toUpperCase() : currentUserRole;
          currentUserRole = roleName;
          isSuperAdmin = roleName === 'ADMIN' || roleName === 'SUPER_ADMIN';

          const locs = (dbUser.assignedLocations || [])
            .map((al: any) => al.location)
            .filter(Boolean);
          if (locs.length > 0) {
            userPrimaryLocationId = locs[0].id;
            userPrimaryLocationName = locs[0].name;
          }
        }
      }
    }

    if (currentUserRole === 'ACCOUNTANT') {
      return NextResponse.json(
        { success: false, error: 'Accountants cannot upload old invoices. Uploading invoices is restricted to Community Managers and Admins.' },
        { status: 403 }
      );
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

    // ── ENFORCE CENTER FOR COMMUNITY MANAGER ──
    // Community Manager is strictly locked to their assigned center (e.g. Agarwal Complex)
    // Super Admin can specify any center
    let finalLocationId = locationId ? parseInt(String(locationId), 10) : null;
    let finalLocationName = locationName || null;

    if (!isSuperAdmin) {
      if (userPrimaryLocationId) {
        finalLocationId = userPrimaryLocationId;
        finalLocationName = userPrimaryLocationName;
      }
    } else if (finalLocationId && !finalLocationName) {
      const loc = await (prisma as any).location.findUnique({
        where: { id: finalLocationId },
        select: { name: true },
      });
      if (loc) finalLocationName = loc.name;
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
          locationId: finalLocationId,
          locationName: finalLocationName,
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
        message: `Successfully archived ${createdList.length} invoice(s) for ${companyName.trim()}`,
      });
    }

    // ── SINGLE INVOICE CREATION ──
    if (!invoiceUrl || !invoiceUrl.trim()) {
      return NextResponse.json(
        { success: false, error: 'Invoice PDF file is required' },
        { status: 400 }
      );
    }

    const invMonth = (month || 'April 2026').trim();
    let parsedYear = year ? parseInt(String(year), 10) : null;
    if (!parsedYear) {
      const yearMatch = invMonth.match(/\b(20\d{2})\b/);
      parsedYear = yearMatch ? parseInt(yearMatch[1], 10) : new Date().getFullYear();
    }
    const parsedAmount = amount ? parseFloat(String(amount).replace(/[^0-9.-]+/g, '')) : null;

    const record = await createOldInvoice({
      companyName: companyName.trim(),
      invoiceNo: invoiceNo ? invoiceNo.trim() : null,
      month: invMonth,
      year: isNaN(parsedYear) ? null : parsedYear,
      invoiceUrl: invoiceUrl.trim(),
      fileName: fileName || 'Invoice.pdf',
      fileSize: fileSize ? String(fileSize) : null,
      amount: parsedAmount !== null && !isNaN(parsedAmount) ? parsedAmount : null,
      remarks: remarks ? remarks.trim() : null,
      locationId: finalLocationId,
      locationName: finalLocationName,
      uploadedById: currentUserId,
      uploadedByName: currentUserName,
      uploadedByRole: currentUserRole,
    });

    return NextResponse.json({
      success: true,
      data: record,
      message: 'Old invoice archived successfully',
    });
  } catch (error: any) {
    console.error('Error creating old invoice:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to archive old invoice' },
      { status: 500 }
    );
  }
}
