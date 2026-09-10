import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import prisma from '@/lib/prisma';
import { verifyToken } from '@/lib/jwt';

const ACCOUNTANT_EMAIL = 'ssinfrazone21@gmail.com';

function parseDateStr(str: any): Date {
  if (!str) return new Date();
  const s = String(str).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const d = new Date(s);
    if (!isNaN(d.getTime())) return d;
  }
  const m = s.match(/^(\d{1,2})\s+([A-Za-z]{3})\s+(\d{4})/);
  if (m) {
    const day = parseInt(m[1], 10);
    const monStr = m[2].toUpperCase();
    const year = parseInt(m[3], 10);
    const months: Record<string, number> = {
      JAN: 0, FEB: 1, MAR: 2, APR: 3, MAY: 4, JUN: 5,
      JUL: 6, AUG: 7, SEP: 8, OCT: 9, NOV: 10, DEC: 11,
    };
    if (months[monStr] !== undefined) {
      return new Date(Date.UTC(year, months[monStr], day, 12, 0, 0));
    }
  }
  const fallback = new Date(s);
  return isNaN(fallback.getTime()) ? new Date() : fallback;
}

export async function POST() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await verifyToken(token);
    if (!payload?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const sheets = await prisma.locationExpenseSheet.findMany({
      include: { location: { select: { id: true, name: true } } },
    });

    let totalSynced = 0;

    for (const sheet of sheets) {
      const locId = sheet.locationId;
      const locName = sheet.location?.name || `Location ${locId}`;

      const cols: any[] = Array.isArray(sheet.columns) ? (sheet.columns as any[]) : [];
      const rows: any[] = Array.isArray(sheet.rows) ? (sheet.rows as any[]) : [];

      let dateCol = 'col_1';
      let descCol = 'col_2';
      let catCol = 'col_3';
      let amtCol = 'col_4';
      let modeCol = 'col_5';
      let recCol = 'col_6';
      let remCol = 'col_7';
      let attCol = '';

      for (const c of cols) {
        const lbl = (c.label || '').toLowerCase();
        const id = c.id;
        if (c.isAccountantCol || id.startsWith('acc_')) continue;

        if (lbl.includes('date')) dateCol = id;
        else if (lbl.includes('desc')) descCol = id;
        else if (lbl.includes('cat') || lbl.includes('section')) catCol = id;
        else if (lbl.includes('amount') || lbl.includes('amt') || lbl.includes('₹')) amtCol = id;
        else if (lbl.includes('mode')) modeCol = id;
        else if (lbl.includes('receipt') || lbl.includes('ref') || lbl === '#') recCol = id;
        else if (lbl.includes('remark') || lbl.includes('note')) remCol = id;
        else if (lbl.includes('attach') || lbl.includes('pfd') || lbl.includes('pdf') || lbl.includes('file')) attCol = id;
      }

      for (const r of rows) {
        const descVal = (r[descCol] || '').trim();
        const catVal = (r[catCol] || '').trim();
        const rawAmt = String(r[amtCol] || '').replace(/[^0-9.-]/g, '');
        const amtVal = parseFloat(rawAmt) || 0;
        const dateVal = (r[dateCol] || '').trim();
        const remVal = (r[remCol] || '').trim();
        const attVal = attCol ? (r[attCol] || '').trim() : '';

        // Skip formula rows or completely blank rows
        const rawAmtCell = String(r[amtCol] || '').trim();
        const isFormula = rawAmtCell.startsWith('=') || /SUM\(/i.test(rawAmtCell);
        if (isFormula && !dateVal && !descVal) {
          continue;
        }
        if (!descVal && !catVal && amtVal === 0 && !dateVal && !attVal) {
          continue;
        }

        const sourceSheetRowId = `sheet_${locId}_${r.id}`;
        const expenseDate = parseDateStr(dateVal);

        const payReceiveDate = (r['acc_pay_receive_date'] || '').trim() || null;
        const receiveAmtRaw = String(r['acc_receive_amount'] || '').replace(/[^0-9.-]/g, '');
        const receiveAmount = receiveAmtRaw ? parseFloat(receiveAmtRaw) : null;
        const accPaymentMode = (r['acc_payment_mode'] || '').trim() || null;
        const utrNumber = (r['acc_utr_number'] || '').trim() || null;
        const utrDate = (r['acc_utr_date'] || '').trim() || null;
        const utrFileUrl = (r['acc_utr_file'] || '').trim() || null;
        const tdsDeducted = (r['acc_tds_deducted'] || '').trim() || 'No';
        const tdsAmtRaw = String(r['acc_tds_amount'] || '').replace(/[^0-9.-]/g, '');
        const tdsAmount = tdsAmtRaw ? parseFloat(tdsAmtRaw) : null;

        const isPaid = Boolean(utrNumber || payReceiveDate || (receiveAmount && receiveAmount > 0));
        const paymentStatus = isPaid ? 'PAID' : 'PENDING';

        const dataPayload = {
          expenseDate,
          expenseDateStr: dateVal || null,
          locationId: locId,
          locationName: locName,
          category: catVal ? catVal.toUpperCase() : 'GENERAL EXPENSE',
          description: descVal || 'Center Operating Expense',
          amount: amtVal,
          paymentMode: (r[modeCol] || '').trim() || 'Bank Transfer',
          receiptNo: (r[recCol] || '').trim() || null,
          attachmentUrl: attVal || null,
          remarks: remVal || null,
          payReceiveDate,
          receiveAmount,
          accPaymentMode,
          utrNumber,
          utrDate,
          utrFileUrl,
          tdsDeducted,
          tdsAmount,
          paymentStatus,
          createdByRole: 'COMMUNITY_MANAGER',
        };

        await prisma.expenseRecord.upsert({
          where: { sourceSheetRowId },
          update: dataPayload,
          create: {
            sourceSheetRowId,
            ...dataPayload,
          },
        });

        totalSynced++;
      }
    }

    return NextResponse.json({
      success: true,
      message: `Successfully synchronized ${totalSynced} expense rows from spreadsheets.`,
      totalSynced,
    });
  } catch (error: any) {
    console.error('[SYNC_SHEETS_POST]', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to sync spreadsheets' },
      { status: 500 }
    );
  }
}
