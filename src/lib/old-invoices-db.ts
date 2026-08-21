import prisma from '@/lib/prisma';

export interface OldInvoiceInput {
  companyName: string;
  invoiceNo?: string | null;
  month: string;
  year?: number | null;
  invoiceUrl: string;
  fileName?: string | null;
  fileSize?: string | null;
  amount?: number | null;
  remarks?: string | null;
  locationId?: number | null;
  locationName?: string | null;
  uploadedById?: number | null;
  uploadedByName?: string | null;
  uploadedByRole?: string | null;
}

export async function findOldInvoices(filter: {
  search?: string;
  companyName?: string | null;
  month?: string | null;
  year?: number | null;
  locationId?: number | null;
  locationIds?: number[] | null;
  uploadedByIds?: number[] | null;
}) {
  const p = prisma as any;
  if (p.oldInvoiceHistory && typeof p.oldInvoiceHistory.findMany === 'function') {
    const where: any = {};
    if (filter.search) {
      where.OR = [
        { companyName: { contains: filter.search } },
        { invoiceNo: { contains: filter.search } },
        { remarks: { contains: filter.search } },
        { month: { contains: filter.search } },
        { locationName: { contains: filter.search } },
        { uploadedByName: { contains: filter.search } },
      ];
    }
    if (filter.companyName && filter.companyName !== 'ALL') where.companyName = filter.companyName;
    if (filter.month && filter.month !== 'ALL') where.month = filter.month;
    if (filter.year) where.year = filter.year;
    if (filter.locationId && filter.locationId !== null) {
      where.locationId = filter.locationId;
    } else if (filter.locationIds && filter.locationIds.length > 0) {
      where.locationId = { in: filter.locationIds };
    }
    if (filter.uploadedByIds && filter.uploadedByIds.length > 0) where.uploadedById = { in: filter.uploadedByIds };

    return await p.oldInvoiceHistory.findMany({
      where,
      orderBy: [{ companyName: 'asc' }, { createdAt: 'desc' }],
    });
  }

  // Fallback to raw SQL
  let query = 'SELECT * FROM `OldInvoiceHistory` WHERE 1=1';
  const params: any[] = [];

  if (filter.search) {
    const s = `%${filter.search}%`;
    query += ' AND (`companyName` LIKE ? OR `invoiceNo` LIKE ? OR `remarks` LIKE ? OR `month` LIKE ? OR `locationName` LIKE ? OR `uploadedByName` LIKE ?)';
    params.push(s, s, s, s, s, s);
  }
  if (filter.companyName && filter.companyName !== 'ALL') {
    query += ' AND `companyName` = ?';
    params.push(filter.companyName);
  }
  if (filter.month && filter.month !== 'ALL') {
    query += ' AND `month` = ?';
    params.push(filter.month);
  }
  if (filter.year) {
    query += ' AND `year` = ?';
    params.push(filter.year);
  }
  if (filter.locationId && filter.locationId !== null) {
    query += ' AND `locationId` = ?';
    params.push(filter.locationId);
  } else if (filter.locationIds && filter.locationIds.length > 0) {
    query += ` AND \`locationId\` IN (${filter.locationIds.map(() => '?').join(',')})`;
    params.push(...filter.locationIds);
  }
  if (filter.uploadedByIds && filter.uploadedByIds.length > 0) {
    query += ` AND \`uploadedById\` IN (${filter.uploadedByIds.map(() => '?').join(',')})`;
    params.push(...filter.uploadedByIds);
  }

  query += ' ORDER BY `companyName` ASC, `createdAt` DESC';
  return await (prisma.$queryRawUnsafe(query, ...params) as Promise<any[]>);
}

export async function findOldInvoiceById(id: number) {
  const p = prisma as any;
  if (p.oldInvoiceHistory && typeof p.oldInvoiceHistory.findUnique === 'function') {
    return await p.oldInvoiceHistory.findUnique({ where: { id } });
  }

  const rows = await (prisma.$queryRawUnsafe(
    'SELECT * FROM `OldInvoiceHistory` WHERE `id` = ? LIMIT 1',
    id
  ) as Promise<any[]>);
  return rows?.[0] || null;
}

export async function createOldInvoice(data: OldInvoiceInput) {
  const p = prisma as any;
  if (p.oldInvoiceHistory && typeof p.oldInvoiceHistory.create === 'function') {
    return await p.oldInvoiceHistory.create({ data });
  }

  await prisma.$executeRawUnsafe(
    `INSERT INTO \`OldInvoiceHistory\` 
      (\`companyName\`, \`invoiceNo\`, \`month\`, \`year\`, \`invoiceUrl\`, \`fileName\`, \`fileSize\`, \`amount\`, \`remarks\`, \`locationId\`, \`locationName\`, \`uploadedById\`, \`uploadedByName\`, \`uploadedByRole\`, \`createdAt\`, \`updatedAt\`) 
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
    data.companyName,
    data.invoiceNo || null,
    data.month,
    data.year || null,
    data.invoiceUrl,
    data.fileName || null,
    data.fileSize || null,
    data.amount !== null && data.amount !== undefined ? data.amount : null,
    data.remarks || null,
    data.locationId || null,
    data.locationName || null,
    data.uploadedById || null,
    data.uploadedByName || null,
    data.uploadedByRole || null
  );

  const lastInserted = await (prisma.$queryRawUnsafe(
    'SELECT * FROM `OldInvoiceHistory` ORDER BY `id` DESC LIMIT 1'
  ) as Promise<any[]>);
  return lastInserted?.[0];
}

export async function updateOldInvoice(id: number, data: Partial<OldInvoiceInput>) {
  const p = prisma as any;
  if (p.oldInvoiceHistory && typeof p.oldInvoiceHistory.update === 'function') {
    return await p.oldInvoiceHistory.update({ where: { id }, data });
  }

  const setClauses: string[] = [];
  const params: any[] = [];

  for (const [key, value] of Object.entries(data)) {
    if (value !== undefined) {
      setClauses.push(`\`${key}\` = ?`);
      params.push(value);
    }
  }

  if (setClauses.length > 0) {
    setClauses.push('`updatedAt` = NOW()');
    params.push(id);
    await prisma.$executeRawUnsafe(
      `UPDATE \`OldInvoiceHistory\` SET ${setClauses.join(', ')} WHERE \`id\` = ?`,
      ...params
    );
  }

  return await findOldInvoiceById(id);
}

export async function deleteOldInvoice(id: number) {
  const p = prisma as any;
  if (p.oldInvoiceHistory && typeof p.oldInvoiceHistory.delete === 'function') {
    return await p.oldInvoiceHistory.delete({ where: { id } });
  }

  await prisma.$executeRawUnsafe('DELETE FROM `OldInvoiceHistory` WHERE `id` = ?', id);
  return true;
}

export async function getArchivedCompanyNames(): Promise<string[]> {
  const p = prisma as any;
  if (p.oldInvoiceHistory && typeof p.oldInvoiceHistory.findMany === 'function') {
    const list = await p.oldInvoiceHistory.findMany({
      select: { companyName: true },
      distinct: ['companyName'],
    });
    return list.map((item: any) => item.companyName);
  }

  const rows = await (prisma.$queryRawUnsafe(
    'SELECT DISTINCT `companyName` FROM `OldInvoiceHistory` WHERE `companyName` IS NOT NULL'
  ) as Promise<any[]>);
  return (rows || []).map((r) => r.companyName);
}
