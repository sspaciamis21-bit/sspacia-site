import prisma from '@/lib/prisma';

export interface SuspenseCenterAllocationData {
  id: number;
  suspensePaymentId: number;
  centerName: string; // 'mercado', 'premier house', 'agarwal complex'
  centerDisplayName: string; // 'Mercado', 'Premier House', 'Agarwal Complex'
  centerOrder: number; // 1, 2, 3
  decision: 'PENDING' | 'ACCEPTED' | 'REJECTED';
  companyName?: string | null;
  identifiedType?: string | null;
  cmRemarks?: string | null;
  reviewedById?: number | null;
  reviewedByName?: string | null;
  reviewedAt?: string | Date | null;
  actualTimestamp?: string | null;
  fmsStatus: 'Pending' | 'Done' | 'Overdue';
}

export interface SuspensePaymentRecord {
  id: number;
  payReceiveDate: string; // e.g. "14/09/2026"
  suspensePaymentType: string; // e.g. "Advance Rent", "x payment received"
  amount: number;
  bankName?: string | null;
  paymentMode?: string | null;
  utrNumber?: string | null;
  utrDate?: string | null;
  payerName?: string | null;
  remarks?: string | null;
  proofUrl?: string | null;
  proofName?: string | null;
  enteredById?: number | null;
  enteredByName?: string | null;
  enteredAt: string | Date;
  plannedTimestamp: string; // e.g. "14/09/2026 10:45:34 - 14/09/2026 14:45:34"
  deadlineAt: string | Date;
  fmsRowStart?: number | null;
  overallStatus: 'PENDING' | 'IDENTIFIED' | 'REJECTED_ALL' | 'OVERDUE';
  createdAt: string | Date;
  updatedAt: string | Date;
  allocations?: SuspenseCenterAllocationData[];
}

export const ACTIVE_FMS_CENTERS = [
  { name: 'mercado', displayName: 'Mercado', order: 1 },
  { name: 'premier house', displayName: 'Premier House', order: 2 },
  { name: 'agarwal complex', displayName: 'Agarwal Complex', order: 3 },
];

let tablesChecked = false;

export async function ensureSuspenseTablesExist() {
  if (tablesChecked) return;

  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS \`SuspensePayment\` (
        \`id\` INT AUTO_INCREMENT PRIMARY KEY,
        \`payReceiveDate\` VARCHAR(50) NOT NULL,
        \`suspensePaymentType\` VARCHAR(255) NOT NULL,
        \`amount\` DECIMAL(14, 2) NOT NULL DEFAULT 0.00,
        \`bankName\` VARCHAR(100) NULL,
        \`paymentMode\` VARCHAR(50) NULL,
        \`utrNumber\` VARCHAR(100) NULL,
        \`utrDate\` VARCHAR(50) NULL,
        \`payerName\` VARCHAR(255) NULL,
        \`remarks\` TEXT NULL,
        \`proofUrl\` TEXT NULL,
        \`proofName\` VARCHAR(255) NULL,
        \`enteredById\` INT NULL,
        \`enteredByName\` VARCHAR(150) NULL,
        \`enteredAt\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        \`plannedTimestamp\` VARCHAR(150) NOT NULL,
        \`deadlineAt\` DATETIME NOT NULL,
        \`fmsRowStart\` INT NULL,
        \`overallStatus\` VARCHAR(50) NOT NULL DEFAULT 'PENDING',
        \`createdAt\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        \`updatedAt\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX \`idx_suspense_date\` (\`payReceiveDate\`),
        INDEX \`idx_suspense_status\` (\`overallStatus\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS \`SuspenseCenterAllocation\` (
        \`id\` INT AUTO_INCREMENT PRIMARY KEY,
        \`suspensePaymentId\` INT NOT NULL,
        \`centerName\` VARCHAR(100) NOT NULL,
        \`centerDisplayName\` VARCHAR(100) NOT NULL,
        \`centerOrder\` INT NOT NULL DEFAULT 1,
        \`decision\` VARCHAR(50) NOT NULL DEFAULT 'PENDING',
        \`companyName\` VARCHAR(255) NULL,
        \`identifiedType\` VARCHAR(100) NULL,
        \`cmRemarks\` TEXT NULL,
        \`reviewedById\` INT NULL,
        \`reviewedByName\` VARCHAR(150) NULL,
        \`reviewedAt\` DATETIME NULL,
        \`actualTimestamp\` VARCHAR(100) NULL,
        \`fmsStatus\` VARCHAR(50) NOT NULL DEFAULT 'Pending',
        \`createdAt\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        \`updatedAt\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX \`idx_alloc_payment_id\` (\`suspensePaymentId\`),
        INDEX \`idx_alloc_center\` (\`centerName\`),
        INDEX \`idx_alloc_decision\` (\`decision\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    tablesChecked = true;
  } catch (err: any) {
    console.error('[Suspense DB] Error ensuring tables exist:', err?.message || err);
  }
}

/**
 * Format IST timestamp: "DD/MM/YYYY HH:mm:ss"
 */
export function formatIstDateTime(date: Date = new Date()): string {
  const istDate = new Date(date.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
  const d = String(istDate.getDate()).padStart(2, '0');
  const m = String(istDate.getMonth() + 1).padStart(2, '0');
  const y = istDate.getFullYear();
  const hh = String(istDate.getHours()).padStart(2, '0');
  const mm = String(istDate.getMinutes()).padStart(2, '0');
  const ss = String(istDate.getSeconds()).padStart(2, '0');
  return `${d}/${m}/${y} ${hh}:${mm}:${ss}`;
}

/**
 * Format IST Date: "DD/MM/YYYY"
 */
export function formatIstDate(date: Date = new Date()): string {
  const istDate = new Date(date.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
  const d = String(istDate.getDate()).padStart(2, '0');
  const m = String(istDate.getMonth() + 1).padStart(2, '0');
  const y = istDate.getFullYear();
  return `${d}/${m}/${y}`;
}

/**
 * Create a new suspense payment and initialize 3 center allocations
 */
export async function createSuspensePayment(data: {
  payReceiveDate: string;
  suspensePaymentType: string;
  amount: number;
  bankName?: string | null;
  paymentMode?: string | null;
  utrNumber?: string | null;
  utrDate?: string | null;
  payerName?: string | null;
  remarks?: string | null;
  proofUrl?: string | null;
  proofName?: string | null;
  enteredById?: number | null;
  enteredByName?: string | null;
}) {
  await ensureSuspenseTablesExist();

  const now = new Date();
  const fourHoursLater = new Date(now.getTime() + 4 * 60 * 60 * 1000);

  const startTimestampStr = formatIstDateTime(now);
  const endTimestampStr = formatIstDateTime(fourHoursLater);
  const plannedTimestamp = `${startTimestampStr} - ${endTimestampStr}`;

  // Insert SuspensePayment
  await prisma.$executeRawUnsafe(
    `
    INSERT INTO \`SuspensePayment\` (
      \`payReceiveDate\`, \`suspensePaymentType\`, \`amount\`, \`bankName\`, \`paymentMode\`,
      \`utrNumber\`, \`utrDate\`, \`payerName\`, \`remarks\`, \`proofUrl\`, \`proofName\`,
      \`enteredById\`, \`enteredByName\`, \`enteredAt\`, \`plannedTimestamp\`, \`deadlineAt\`,
      \`overallStatus\`
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING')
    `,
    data.payReceiveDate,
    data.suspensePaymentType,
    data.amount,
    data.bankName || null,
    data.paymentMode || null,
    data.utrNumber || null,
    data.utrDate || null,
    data.payerName || null,
    data.remarks || null,
    data.proofUrl || null,
    data.proofName || null,
    data.enteredById || null,
    data.enteredByName || null,
    now,
    plannedTimestamp,
    fourHoursLater
  );

  const lastInsert: any[] = await prisma.$queryRawUnsafe('SELECT LAST_INSERT_ID() as id');
  const paymentId = Number(lastInsert[0]?.id);

  // Initialize the 3 center allocations (Mercado, Premier House, Agarwal Complex)
  for (const c of ACTIVE_FMS_CENTERS) {
    await prisma.$executeRawUnsafe(
      `
      INSERT INTO \`SuspenseCenterAllocation\` (
        \`suspensePaymentId\`, \`centerName\`, \`centerDisplayName\`, \`centerOrder\`,
        \`decision\`, \`fmsStatus\`
      ) VALUES (?, ?, ?, ?, 'PENDING', 'Pending')
      `,
      paymentId,
      c.name,
      c.displayName,
      c.order
    );
  }

  return getSuspensePaymentById(paymentId);
}

/**
 * Fetch a single suspense payment by ID with its allocations
 */
export async function getSuspensePaymentById(id: number): Promise<SuspensePaymentRecord | null> {
  await ensureSuspenseTablesExist();

  const payments: any[] = await prisma.$queryRawUnsafe(
    'SELECT * FROM `SuspensePayment` WHERE `id` = ? LIMIT 1',
    id
  );
  if (!payments || payments.length === 0) return null;

  const payment = payments[0];
  const allocations: any[] = await prisma.$queryRawUnsafe(
    'SELECT * FROM `SuspenseCenterAllocation` WHERE `suspensePaymentId` = ? ORDER BY `centerOrder` ASC',
    id
  );

  return {
    ...payment,
    amount: Number(payment.amount),
    allocations,
  };
}

/**
 * Update the Google Sheets FMS starting row on the record
 */
export async function updateSuspenseFmsRow(id: number, fmsRowStart: number) {
  await ensureSuspenseTablesExist();
  await prisma.$executeRawUnsafe(
    'UPDATE `SuspensePayment` SET `fmsRowStart` = ? WHERE `id` = ?',
    fmsRowStart,
    id
  );
}

/**
 * Fetch all suspense payments with their center allocations
 */
export async function getSuspensePayments(filter?: {
  status?: string;
  center?: string;
  search?: string;
}): Promise<SuspensePaymentRecord[]> {
  await ensureSuspenseTablesExist();

  let query = 'SELECT * FROM `SuspensePayment` WHERE 1=1';
  const params: any[] = [];

  if (filter?.status && filter.status !== 'ALL') {
    query += ' AND `overallStatus` = ?';
    params.push(filter.status);
  }

  if (filter?.search) {
    const s = `%${filter.search}%`;
    query +=
      ' AND (`suspensePaymentType` LIKE ? OR `payerName` LIKE ? OR `utrNumber` LIKE ? OR `bankName` LIKE ? OR `remarks` LIKE ?)';
    params.push(s, s, s, s, s);
  }

  query += ' ORDER BY `id` DESC';

  const payments: any[] = await prisma.$queryRawUnsafe(query, ...params);
  if (!payments || payments.length === 0) return [];

  const paymentIds = payments.map((p) => p.id);
  const placeholders = paymentIds.map(() => '?').join(',');

  const allAllocations: any[] = await prisma.$queryRawUnsafe(
    `SELECT * FROM \`SuspenseCenterAllocation\` WHERE \`suspensePaymentId\` IN (${placeholders}) ORDER BY \`centerOrder\` ASC`,
    ...paymentIds
  );

  const allocationsByPaymentId: Record<number, SuspenseCenterAllocationData[]> = {};
  for (const alloc of allAllocations) {
    if (!allocationsByPaymentId[alloc.suspensePaymentId]) {
      allocationsByPaymentId[alloc.suspensePaymentId] = [];
    }
    allocationsByPaymentId[alloc.suspensePaymentId].push(alloc);
  }

  const now = new Date();

  return payments.map((p) => {
    const allocs = allocationsByPaymentId[p.id] || [];

    // Check if deadline expired and still pending
    let overall = p.overallStatus;
    const isPastDeadline = new Date(p.deadlineAt).getTime() < now.getTime();
    if (overall === 'PENDING' && isPastDeadline) {
      // If none accepted and deadline passed
      const hasAccepted = allocs.some((a) => a.decision === 'ACCEPTED');
      if (!hasAccepted) {
        overall = 'OVERDUE';
      }
    }

    return {
      ...p,
      amount: Number(p.amount),
      overallStatus: overall,
      allocations: allocs,
    };
  });
}

/**
 * Record a Community Manager's review decision for their center
 */
export async function recordCenterRecognition(params: {
  suspensePaymentId: number;
  centerName: string; // 'mercado', 'premier house', 'agarwal complex'
  decision: 'ACCEPTED' | 'REJECTED';
  companyName?: string | null;
  identifiedType?: string | null;
  cmRemarks?: string | null;
  reviewedById?: number | null;
  reviewedByName?: string | null;
}) {
  await ensureSuspenseTablesExist();

  const now = new Date();
  const actualTimestampStr = formatIstDateTime(now);

  const existing = await getSuspensePaymentById(params.suspensePaymentId);
  if (!existing) {
    throw new Error('Suspense payment record not found');
  }

  const isOverdue = new Date(existing.deadlineAt).getTime() < now.getTime();
  const fmsStatus = isOverdue ? 'Overdue' : 'Done';

  // Update allocation for this center
  await prisma.$executeRawUnsafe(
    `
    UPDATE \`SuspenseCenterAllocation\`
    SET
      \`decision\` = ?,
      \`companyName\` = ?,
      \`identifiedType\` = ?,
      \`cmRemarks\` = ?,
      \`reviewedById\` = ?,
      \`reviewedByName\` = ?,
      \`reviewedAt\` = ?,
      \`actualTimestamp\` = ?,
      \`fmsStatus\` = ?
    WHERE \`suspensePaymentId\` = ? AND LOWER(\`centerName\`) = ?
    `,
    params.decision,
    params.companyName || null,
    params.identifiedType || null,
    params.cmRemarks || null,
    params.reviewedById || null,
    params.reviewedByName || null,
    now,
    actualTimestampStr,
    fmsStatus,
    params.suspensePaymentId,
    params.centerName.toLowerCase().trim()
  );

  // Recalculate overall status
  const updated = await getSuspensePaymentById(params.suspensePaymentId);
  const allocs = updated?.allocations || [];

  let newOverallStatus = 'PENDING';
  const acceptedAlloc = allocs.find((a) => a.decision === 'ACCEPTED');
  const allRejected = allocs.length === 3 && allocs.every((a) => a.decision === 'REJECTED');
  const allReviewed = allocs.length === 3 && allocs.every((a) => a.decision !== 'PENDING');

  if (acceptedAlloc) {
    newOverallStatus = 'IDENTIFIED';
  } else if (allRejected) {
    newOverallStatus = 'REJECTED_ALL';
  } else if (isOverdue) {
    newOverallStatus = 'OVERDUE';
  } else if (allReviewed) {
    newOverallStatus = 'IDENTIFIED';
  }

  await prisma.$executeRawUnsafe(
    'UPDATE `SuspensePayment` SET `overallStatus` = ? WHERE `id` = ?',
    newOverallStatus,
    params.suspensePaymentId
  );

  return {
    payment: await getSuspensePaymentById(params.suspensePaymentId),
    actualTimestamp: actualTimestampStr,
    fmsStatus,
    isOverdue,
  };
}

/**
 * Update an existing suspense payment (Accountant / Super Admin edit)
 */
export async function updateSuspensePayment(
  id: number,
  data: {
    payReceiveDate?: string;
    suspensePaymentType?: string;
    amount?: number;
    bankName?: string | null;
    paymentMode?: string | null;
    utrNumber?: string | null;
    utrDate?: string | null;
    payerName?: string | null;
    remarks?: string | null;
    proofUrl?: string | null;
    proofName?: string | null;
  }
): Promise<SuspensePaymentRecord | null> {
  await ensureSuspenseTablesExist();

  const current = await getSuspensePaymentById(id);
  if (!current) {
    throw new Error(`Suspense payment #${id} not found`);
  }

  const newPayReceiveDate = data.payReceiveDate !== undefined ? data.payReceiveDate : current.payReceiveDate;
  const newType = data.suspensePaymentType !== undefined ? data.suspensePaymentType : current.suspensePaymentType;
  const newAmount = data.amount !== undefined ? Number(data.amount) : current.amount;
  const newBankName = data.bankName !== undefined ? data.bankName : current.bankName;
  const newPaymentMode = data.paymentMode !== undefined ? data.paymentMode : current.paymentMode;
  const newUtrNumber = data.utrNumber !== undefined ? data.utrNumber : current.utrNumber;
  const newUtrDate = data.utrDate !== undefined ? data.utrDate : current.utrDate;
  const newPayerName = data.payerName !== undefined ? data.payerName : current.payerName;
  const newRemarks = data.remarks !== undefined ? data.remarks : current.remarks;
  const newProofUrl = data.proofUrl !== undefined ? data.proofUrl : current.proofUrl;
  const newProofName = data.proofName !== undefined ? data.proofName : current.proofName;

  await prisma.$executeRawUnsafe(
    `
    UPDATE \`SuspensePayment\`
    SET
      \`payReceiveDate\` = ?,
      \`suspensePaymentType\` = ?,
      \`amount\` = ?,
      \`bankName\` = ?,
      \`paymentMode\` = ?,
      \`utrNumber\` = ?,
      \`utrDate\` = ?,
      \`payerName\` = ?,
      \`remarks\` = ?,
      \`proofUrl\` = ?,
      \`proofName\` = ?,
      \`updatedAt\` = CURRENT_TIMESTAMP
    WHERE \`id\` = ?
    `,
    newPayReceiveDate,
    newType,
    newAmount,
    newBankName,
    newPaymentMode,
    newUtrNumber,
    newUtrDate,
    newPayerName,
    newRemarks,
    newProofUrl,
    newProofName,
    id
  );

  return getSuspensePaymentById(id);
}

/**
 * Delete suspense payment (Super Admin only)
 */
export async function deleteSuspensePayment(id: number) {
  await ensureSuspenseTablesExist();
  await prisma.$executeRawUnsafe('DELETE FROM `SuspenseCenterAllocation` WHERE `suspensePaymentId` = ?', id);
  await prisma.$executeRawUnsafe('DELETE FROM `SuspensePayment` WHERE `id` = ?', id);
  return { success: true };
}

