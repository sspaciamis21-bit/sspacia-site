import prisma from '@/lib/prisma';

export interface ConsumedItemRow {
  id: number;
  srNo: number;
  entryDate: Date | null;
  productName: string;
  locationId: number | null;
  initialQty: number;
  balanceQty: number;
  bufferLimit: number;
  unitCost: number | null;
  balanceAmount: number | null;
  remarks: string | null;
  createdById: number | null;
  isBufferAlertActive: boolean | number;
  bufferAlertTriggeredAt: Date | null;
  purchaseStatus: string;
  purchasePlannedAt: Date | null;
  purchaseActualAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export async function findManyConsumedItems(options: {
  search?: string;
  locationId?: number | null;
  locationIds?: number[];
}): Promise<ConsumedItemRow[]> {
  const { search, locationId, locationIds } = options;
  const conditions: string[] = [];

  if (search && search.trim()) {
    const s = search.trim().replace(/'/g, "''");
    conditions.push(`(\`productName\` LIKE '%${s}%' OR \`remarks\` LIKE '%${s}%')`);
  }

  if (locationId !== undefined && locationId !== null) {
    conditions.push(`\`locationId\` = ${Number(locationId)}`);
  } else if (locationIds && locationIds.length > 0) {
    const idList = locationIds.map((id) => Number(id)).filter((id) => !isNaN(id)).join(',');
    if (idList) {
      conditions.push(`\`locationId\` IN (${idList})`);
    }
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const sql = `SELECT * FROM \`ConsumedInventoryItem\` ${whereClause} ORDER BY \`createdAt\` DESC, \`srNo\` ASC, \`id\` ASC`;

  const rows = await (prisma as any).$queryRawUnsafe(sql);
  return rows as ConsumedItemRow[];
}

export async function findUniqueConsumedItem(id: number): Promise<ConsumedItemRow | null> {
  const sql = `SELECT * FROM \`ConsumedInventoryItem\` WHERE \`id\` = ${Number(id)} LIMIT 1`;
  const rows = await (prisma as any).$queryRawUnsafe(sql);
  return (rows as ConsumedItemRow[])[0] || null;
}

export async function createConsumedItem(data: {
  srNo?: number;
  entryDate?: Date;
  productName: string;
  locationId: number | null;
  initialQty: number;
  balanceQty: number;
  bufferLimit: number;
  unitCost?: number;
  balanceAmount?: number;
  remarks?: string | null;
  createdById?: number | null;
  isBufferAlertActive: boolean;
  bufferAlertTriggeredAt?: Date | null;
  purchaseStatus: string;
  purchasePlannedAt?: Date | null;
}): Promise<ConsumedItemRow> {
  const now = new Date();
  const entryDateVal = data.entryDate || now;
  const pName = data.productName.replace(/'/g, "''");
  const locId = data.locationId !== null ? Number(data.locationId) : 'NULL';
  const initQty = Number(data.initialQty) || 0;
  const balQty = Number(data.balanceQty) || 0;
  const bufLimit = Number(data.bufferLimit) || 1;
  const uCost = Number(data.unitCost) || 0;
  const balAmt = Number(data.balanceAmount) || 0;
  const rem = data.remarks ? `'${data.remarks.replace(/'/g, "''")}'` : 'NULL';
  const cById = data.createdById ? Number(data.createdById) : 'NULL';
  const isAlert = data.isBufferAlertActive ? 1 : 0;
  const alertAt = data.bufferAlertTriggeredAt ? `'${data.bufferAlertTriggeredAt.toISOString().slice(0, 19).replace('T', ' ')}'` : 'NULL';
  const pStatus = data.purchaseStatus.replace(/'/g, "''");
  const planAt = data.purchasePlannedAt ? `'${data.purchasePlannedAt.toISOString().slice(0, 19).replace('T', ' ')}'` : 'NULL';
  const srNo = data.srNo ? Number(data.srNo) : 1;
  const createdAtFormatted = entryDateVal.toISOString().slice(0, 19).replace('T', ' ');
  const updatedAtFormatted = now.toISOString().slice(0, 19).replace('T', ' ');

  const sql = `
    INSERT INTO \`ConsumedInventoryItem\` (
      \`srNo\`, \`entryDate\`, \`productName\`, \`locationId\`, \`initialQty\`, \`balanceQty\`,
      \`bufferLimit\`, \`unitCost\`, \`balanceAmount\`, \`remarks\`, \`createdById\`,
      \`isBufferAlertActive\`, \`bufferAlertTriggeredAt\`, \`purchaseStatus\`, \`purchasePlannedAt\`,
      \`createdAt\`, \`updatedAt\`
    ) VALUES (
      ${srNo}, '${createdAtFormatted}', '${pName}', ${locId}, ${initQty}, ${balQty},
      ${bufLimit}, ${uCost}, ${balAmt}, ${rem}, ${cById},
      ${isAlert}, ${alertAt}, '${pStatus}', ${planAt},
      '${createdAtFormatted}', '${updatedAtFormatted}'
    )
  `;

  await (prisma as any).$executeRawUnsafe(sql);
  const lastInserted = await (prisma as any).$queryRawUnsafe(`SELECT * FROM \`ConsumedInventoryItem\` WHERE \`productName\` = '${pName}' ORDER BY \`id\` DESC LIMIT 1`);
  return (lastInserted as ConsumedItemRow[])[0];
}

export async function updateConsumedItem(
  id: number,
  data: Partial<{
    productName: string;
    locationId: number | null;
    initialQty: number;
    balanceQty: number;
    bufferLimit: number;
    unitCost: number;
    balanceAmount: number;
    remarks: string | null;
    isBufferAlertActive: boolean;
    bufferAlertTriggeredAt: Date | null;
    purchaseStatus: string;
    purchasePlannedAt: Date | null;
    purchaseActualAt: Date | null;
    createdAt: Date;
  }>
): Promise<ConsumedItemRow | null> {
  const updates: string[] = [];
  const now = new Date();
  updates.push(`\`updatedAt\` = '${now.toISOString().slice(0, 19).replace('T', ' ')}'`);

  if (data.productName !== undefined) {
    updates.push(`\`productName\` = '${data.productName.replace(/'/g, "''")}'`);
  }
  if (data.locationId !== undefined) {
    updates.push(`\`locationId\` = ${data.locationId !== null ? Number(data.locationId) : 'NULL'}`);
  }
  if (data.initialQty !== undefined) {
    updates.push(`\`initialQty\` = ${Number(data.initialQty)}`);
  }
  if (data.balanceQty !== undefined) {
    updates.push(`\`balanceQty\` = ${Number(data.balanceQty)}`);
  }
  if (data.bufferLimit !== undefined) {
    updates.push(`\`bufferLimit\` = ${Number(data.bufferLimit)}`);
  }
  if (data.unitCost !== undefined) {
    updates.push(`\`unitCost\` = ${Number(data.unitCost)}`);
  }
  if (data.balanceAmount !== undefined) {
    updates.push(`\`balanceAmount\` = ${Number(data.balanceAmount)}`);
  }
  if (data.remarks !== undefined) {
    updates.push(`\`remarks\` = ${data.remarks ? `'${data.remarks.replace(/'/g, "''")}'` : 'NULL'}`);
  }
  if (data.isBufferAlertActive !== undefined) {
    updates.push(`\`isBufferAlertActive\` = ${data.isBufferAlertActive ? 1 : 0}`);
  }
  if (data.bufferAlertTriggeredAt !== undefined) {
    updates.push(`\`bufferAlertTriggeredAt\` = ${data.bufferAlertTriggeredAt ? `'${data.bufferAlertTriggeredAt.toISOString().slice(0, 19).replace('T', ' ')}'` : 'NULL'}`);
  }
  if (data.purchaseStatus !== undefined) {
    updates.push(`\`purchaseStatus\` = '${data.purchaseStatus.replace(/'/g, "''")}'`);
  }
  if (data.purchasePlannedAt !== undefined) {
    updates.push(`\`purchasePlannedAt\` = ${data.purchasePlannedAt ? `'${data.purchasePlannedAt.toISOString().slice(0, 19).replace('T', ' ')}'` : 'NULL'}`);
  }
  if (data.purchaseActualAt !== undefined) {
    updates.push(`\`purchaseActualAt\` = ${data.purchaseActualAt ? `'${data.purchaseActualAt.toISOString().slice(0, 19).replace('T', ' ')}'` : 'NULL'}`);
  }
  if (data.createdAt !== undefined) {
    updates.push(`\`createdAt\` = '${data.createdAt.toISOString().slice(0, 19).replace('T', ' ')}'`);
  }

  const sql = `UPDATE \`ConsumedInventoryItem\` SET ${updates.join(', ')} WHERE \`id\` = ${Number(id)}`;
  await (prisma as any).$executeRawUnsafe(sql);
  return findUniqueConsumedItem(id);
}

export async function deleteConsumedItem(id: number): Promise<boolean> {
  const sql = `DELETE FROM \`ConsumedInventoryItem\` WHERE \`id\` = ${Number(id)}`;
  await (prisma as any).$executeRawUnsafe(sql);
  return true;
}
