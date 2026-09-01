import prisma from '@/lib/prisma';

export interface TerminationRecord {
  id: number;
  clientMasterId: number;
  agreementStartDate: string | null;
  agreementEndDate: string | null;
  lockinEndDate: string | null;
  noticePeriodMonths: number | null;
  noticeReceivedDate: string | null;
  noticeApplicableEndDate: string | null;
  sorAmountHeld: number;
  duesHeld: number;
  tdsPending: number;
  isSdrRefundApplicable: boolean;
  sdrRefundAmount: number;
  remarks: string | null;
  status: string;
  saApproval1At: string | null;
  saApproval1ById: number | null;
  saApproval1Remarks: string | null;
  closureFormPdfUrl: string | null;
  closureFormPdfName: string | null;
  closureFormGeneratedAt: string | null;
  closureFormSentAt: string | null;
  closureFormSentToEmail: string | null;
  signedClosurePdfUrl: string | null;
  signedClosurePdfName: string | null;
  signedClosureUploadedAt: string | null;
  signedClosureUploadedById: number | null;
  saApproval2At: string | null;
  saApproval2ById: number | null;
  saApproval2Remarks: string | null;
  sentToAccountsAt: string | null;
  accountsProcessedAt: string | null;
  accountsProcessedById: number | null;
  refundPaymentMode: string | null;
  refundUtrNumber: string | null;
  refundUtrDate: string | null;
  refundUtrFileUrl: string | null;
  refundUtrFileName: string | null;
  completedAt: string | null;
  createdById: number | null;
  createdAt: string;
  updatedAt: string;
  clientMaster?: any;
  createdBy?: any;
}

/**
 * Normalizes raw SQL row to consistent TerminationRecord
 */
function mapRawRow(row: any): TerminationRecord {
  return {
    ...row,
    id: Number(row.id),
    clientMasterId: Number(row.clientMasterId),
    sorAmountHeld: Number(row.sorAmountHeld || 0),
    duesHeld: Number(row.duesHeld || 0),
    tdsPending: Number(row.tdsPending || 0),
    isSdrRefundApplicable: Boolean(row.isSdrRefundApplicable),
    sdrRefundAmount: Number(row.sdrRefundAmount || 0),
    noticePeriodMonths: row.noticePeriodMonths ? Number(row.noticePeriodMonths) : null,
    saApproval1ById: row.saApproval1ById ? Number(row.saApproval1ById) : null,
    signedClosureUploadedById: row.signedClosureUploadedById ? Number(row.signedClosureUploadedById) : null,
    saApproval2ById: row.saApproval2ById ? Number(row.saApproval2ById) : null,
    accountsProcessedById: row.accountsProcessedById ? Number(row.accountsProcessedById) : null,
    createdById: row.createdById ? Number(row.createdById) : null,
  };
}

/**
 * Fetches all terminations with clientMaster details
 */
export async function getTerminationsList(params: {
  status?: string;
  createdByIds?: number[] | null;
  search?: string;
}) {
  const { status, createdByIds, search } = params;

  // Try Prisma client model first if generated
  if (typeof (prisma as any).clientTermination?.findMany === 'function') {
    try {
      const whereClause: any = {};
      if (status && status !== 'ALL') {
        whereClause.status = status;
      }
      if (createdByIds && createdByIds.length > 0) {
        whereClause.clientMaster = { createdById: { in: createdByIds } };
      }
      if (search) {
        whereClause.clientMaster = {
          ...(whereClause.clientMaster || {}),
          OR: [
            { companyName: { contains: search } },
            { clientId: { contains: search } },
          ],
        };
      }

      return await (prisma as any).clientTermination.findMany({
        where: whereClause,
        include: {
          clientMaster: {
            include: {
              createdBy: { select: { id: true, name: true, email: true } },
              contactPersons: true,
              products: true,
            },
          },
          createdBy: { select: { id: true, name: true, email: true } },
        },
        orderBy: { updatedAt: 'desc' },
      });
    } catch (e) {
      console.warn('[Prisma clientTermination fallback to raw query]:', e);
    }
  }

  // Raw SQL query fallback
  let sql = `
    SELECT 
      t.*,
      c.companyName, c.clientId, c.cabinName, c.amount, c.totalAmount,
      c.agreementStartDate as cm_agreementStartDate, c.agreementEndDate as cm_agreementEndDate,
      c.lockinEndDate as cm_lockinEndDate, c.clientStatus as cm_clientStatus,
      u.id as creator_id, u.name as creator_name, u.email as creator_email
    FROM ClientTermination t
    JOIN ClientMaster c ON t.clientMasterId = c.id
    LEFT JOIN User u ON t.createdById = u.id
    WHERE 1=1
  `;

  if (status && status !== 'ALL') {
    const safeStatus = status.replace(/['";\\]/g, '');
    sql += ` AND t.status = '${safeStatus}'`;
  }

  if (createdByIds && createdByIds.length > 0) {
    sql += ` AND c.createdById IN (${createdByIds.map((id) => Number(id)).join(',')})`;
  }

  if (search) {
    const safeSearch = search.replace(/['";\\]/g, '');
    sql += ` AND (c.companyName LIKE '%${safeSearch}%' OR c.clientId LIKE '%${safeSearch}%')`;
  }

  sql += ` ORDER BY t.updatedAt DESC`;

  const rows: any = await prisma.$queryRawUnsafe(sql);
  if (!Array.isArray(rows)) return [];

  // Populate related client contactPersons & products for each termination
  const clientIds = rows.map((r: any) => Number(r.clientMasterId)).filter(Boolean);
  let contactPersonsMap: Record<number, any[]> = {};
  let productsMap: Record<number, any[]> = {};

  if (clientIds.length > 0) {
    try {
      const contacts = await prisma.clientContactPerson.findMany({
        where: { clientMasterId: { in: clientIds } },
      });
      contacts.forEach((cp) => {
        if (!contactPersonsMap[cp.clientMasterId]) contactPersonsMap[cp.clientMasterId] = [];
        contactPersonsMap[cp.clientMasterId].push(cp);
      });

      const prods = await (prisma as any).clientProductAllocation.findMany({
        where: { clientMasterId: { in: clientIds } },
      });
      prods.forEach((p: any) => {
        if (!productsMap[p.clientMasterId]) productsMap[p.clientMasterId] = [];
        productsMap[p.clientMasterId].push(p);
      });
    } catch {
      // Ignore if relations empty
    }
  }

  return rows.map((row: any) => {
    const base = mapRawRow(row);
    return {
      ...base,
      clientMaster: {
        id: Number(row.clientMasterId),
        companyName: row.companyName,
        clientId: row.clientId,
        cabinName: row.cabinName,
        amount: row.amount,
        totalAmount: row.totalAmount,
        clientStatus: row.cm_clientStatus,
        agreementStartDate: row.cm_agreementStartDate,
        agreementEndDate: row.cm_agreementEndDate,
        lockinEndDate: row.cm_lockinEndDate,
        createdBy: row.creator_id
          ? { id: Number(row.creator_id), name: row.creator_name, email: row.creator_email }
          : null,
        contactPersons: contactPersonsMap[Number(row.clientMasterId)] || [],
        products: productsMap[Number(row.clientMasterId)] || [],
      },
      createdBy: row.creator_id
        ? { id: Number(row.creator_id), name: row.creator_name, email: row.creator_email }
        : null,
    };
  });
}

/**
 * Fetches stats breakdown for termination workflow stages
 */
export async function getTerminationsStats(createdByIds?: number[] | null) {
  let sql = `
    SELECT t.status, COUNT(*) as cnt
    FROM ClientTermination t
    JOIN ClientMaster c ON t.clientMasterId = c.id
    WHERE 1=1
  `;

  if (createdByIds && createdByIds.length > 0) {
    sql += ` AND c.createdById IN (${createdByIds.map((id) => Number(id)).join(',')})`;
  }

  sql += ` GROUP BY t.status`;

  try {
    const rows: any = await prisma.$queryRawUnsafe(sql);
    let total = 0;
    let pendingApproval1 = 0;
    let closureSent = 0;
    let signedUploaded = 0;
    let inAccounts = 0;
    let completed = 0;

    if (Array.isArray(rows)) {
      rows.forEach((r: any) => {
        const count = Number(r.cnt || 0);
        total += count;
        if (r.status === 'PENDING_SA_APPROVAL_1') pendingApproval1 += count;
        if (r.status === 'CLOSURE_FORM_SENT') closureSent += count;
        if (r.status === 'SIGNED_FORM_UPLOADED') signedUploaded += count;
        if (r.status === 'IN_ACCOUNTS_QUEUE') inAccounts += count;
        if (r.status === 'COMPLETED_TERMINATED') completed += count;
      });
    }

    return {
      total,
      pendingApproval1,
      closureSent,
      signedUploaded,
      pendingApproval2: signedUploaded,
      inAccounts,
      completed,
    };
  } catch (e) {
    console.error('[getTerminationsStats error]:', e);
    return {
      total: 0,
      pendingApproval1: 0,
      closureSent: 0,
      signedUploaded: 0,
      pendingApproval2: 0,
      inAccounts: 0,
      completed: 0,
    };
  }
}

/**
 * Fetches single termination record by ID with full client relations
 */
export async function getTerminationById(id: number) {
  const list = await getTerminationsList({});
  return list.find((item: any) => Number(item.id) === Number(id)) || null;
}

/**
 * Fetches termination record by clientMasterId
 */
export async function getTerminationByClientId(clientMasterId: number) {
  const rows: any = await prisma.$queryRawUnsafe(
    `SELECT * FROM ClientTermination WHERE clientMasterId = ${Number(clientMasterId)} LIMIT 1`
  );
  if (Array.isArray(rows) && rows.length > 0) {
    return mapRawRow(rows[0]);
  }
  return null;
}

/**
 * Creates or updates termination checklist record
 */
export async function saveTerminationChecklist(data: {
  clientMasterId: number;
  agreementStartDate?: Date | null;
  agreementEndDate?: Date | null;
  lockinEndDate?: Date | null;
  noticePeriodMonths?: number | null;
  noticeReceivedDate?: Date | null;
  noticeApplicableEndDate?: Date | null;
  sorAmountHeld?: number;
  duesHeld?: number;
  tdsPending?: number;
  isSdrRefundApplicable?: boolean;
  sdrRefundAmount?: number;
  remarks?: string;
  createdById?: number;
}) {
  const existing = await getTerminationByClientId(data.clientMasterId);

  const formatDateForSql = (d?: Date | null) => (d ? `'${d.toISOString().slice(0, 19).replace('T', ' ')}'` : 'NULL');
  const safeStr = (s?: string) => (s ? `'${s.replace(/'/g, "''")}'` : 'NULL');

  const nowStr = `'${new Date().toISOString().slice(0, 19).replace('T', ' ')}'`;

  if (existing) {
    const updateSql = `
      UPDATE ClientTermination SET
        agreementStartDate = ${formatDateForSql(data.agreementStartDate)},
        agreementEndDate = ${formatDateForSql(data.agreementEndDate)},
        lockinEndDate = ${formatDateForSql(data.lockinEndDate)},
        noticePeriodMonths = ${data.noticePeriodMonths ? Number(data.noticePeriodMonths) : 'NULL'},
        noticeReceivedDate = ${formatDateForSql(data.noticeReceivedDate)},
        noticeApplicableEndDate = ${formatDateForSql(data.noticeApplicableEndDate)},
        sorAmountHeld = ${Number(data.sorAmountHeld || 0)},
        duesHeld = ${Number(data.duesHeld || 0)},
        tdsPending = ${Number(data.tdsPending || 0)},
        isSdrRefundApplicable = ${data.isSdrRefundApplicable ? 1 : 0},
        sdrRefundAmount = ${Number(data.sdrRefundAmount || 0)},
        remarks = ${safeStr(data.remarks)},
        status = 'PENDING_SA_APPROVAL_1',
        updatedAt = ${nowStr}
      WHERE id = ${existing.id}
    `;
    await prisma.$executeRawUnsafe(updateSql);
    return getTerminationById(existing.id);
  } else {
    const insertSql = `
      INSERT INTO ClientTermination (
        clientMasterId, agreementStartDate, agreementEndDate, lockinEndDate,
        noticePeriodMonths, noticeReceivedDate, noticeApplicableEndDate,
        sorAmountHeld, duesHeld, tdsPending, isSdrRefundApplicable,
        sdrRefundAmount, remarks, status, createdById, createdAt, updatedAt
      ) VALUES (
        ${Number(data.clientMasterId)},
        ${formatDateForSql(data.agreementStartDate)},
        ${formatDateForSql(data.agreementEndDate)},
        ${formatDateForSql(data.lockinEndDate)},
        ${data.noticePeriodMonths ? Number(data.noticePeriodMonths) : 'NULL'},
        ${formatDateForSql(data.noticeReceivedDate)},
        ${formatDateForSql(data.noticeApplicableEndDate)},
        ${Number(data.sorAmountHeld || 0)},
        ${Number(data.duesHeld || 0)},
        ${Number(data.tdsPending || 0)},
        ${data.isSdrRefundApplicable ? 1 : 0},
        ${Number(data.sdrRefundAmount || 0)},
        ${safeStr(data.remarks)},
        'PENDING_SA_APPROVAL_1',
        ${data.createdById ? Number(data.createdById) : 'NULL'},
        ${nowStr},
        ${nowStr}
      )
    `;
    await prisma.$executeRawUnsafe(insertSql);
    return getTerminationByClientId(data.clientMasterId);
  }
}

/**
 * Updates arbitrary fields on ClientTermination
 */
export async function updateTerminationFields(id: number, fields: Record<string, any>) {
  const setClauses: string[] = [];
  const nowStr = `'${new Date().toISOString().slice(0, 19).replace('T', ' ')}'`;

  for (const [key, value] of Object.entries(fields)) {
    if (value === undefined) continue;
    if (value === null) {
      setClauses.push(`${key} = NULL`);
    } else if (value instanceof Date) {
      setClauses.push(`${key} = '${value.toISOString().slice(0, 19).replace('T', ' ')}'`);
    } else if (typeof value === 'boolean') {
      setClauses.push(`${key} = ${value ? 1 : 0}`);
    } else if (typeof value === 'number') {
      setClauses.push(`${key} = ${value}`);
    } else if (typeof value === 'string') {
      setClauses.push(`${key} = '${value.replace(/'/g, "''")}'`);
    }
  }

  setClauses.push(`updatedAt = ${nowStr}`);

  if (setClauses.length > 0) {
    const sql = `UPDATE ClientTermination SET ${setClauses.join(', ')} WHERE id = ${Number(id)}`;
    await prisma.$executeRawUnsafe(sql);
  }

  return getTerminationById(id);
}
