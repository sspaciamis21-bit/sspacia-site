import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import mammoth from 'mammoth';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);

    // Template variable substitutions
    const subs: Record<string, string> = {
      '{date}': searchParams.get('date') || '___________',
      '{My Company address}': 'M/s Sspacia India Private Limited, Unit 205, Corporate House, Bodakdev, Ahmedabad - 380 054',
      '{User company name}': searchParams.get('customerOrg') || '_____________________',
      '{user company name}': searchParams.get('customerOrg') || '_____________________',
      '{User Company name}': searchParams.get('customerOrg') || '_____________________',
      '{user name}': searchParams.get('customerName') || '_____________________',
      '{user designation}': searchParams.get('customerDesignation') || '_________________',
      '{User Pan Number}': searchParams.get('customerPan') || '______________',
      '{user id}': searchParams.get('userId') || '______',
      '{Product type }': searchParams.get('productType') || '_____________',
      '{product name}': searchParams.get('productName') || '_____________',
      '{product type}': searchParams.get('productType') || '_____________',
      '{Address}': searchParams.get('centerAddress') || '_______________________',
      '{period}': searchParams.get('period') || '______',
      '{Start Date}': searchParams.get('startDate') || '____________',
      '{Expiry Date}': searchParams.get('expiryDate') || '____________',
      '{cost}': searchParams.get('cost') || '______',
      '{const in words}': searchParams.get('costInWords') || '______________________________',
      '{capacity}': searchParams.get('capacity') || '__',
      '{calculated cost}': searchParams.get('calculatedCost') || '_________',
    };

    const docxPath = path.join(process.cwd(), 'public', 'Draft Agreement.docx');
    const result = await mammoth.convertToHtml({ path: docxPath });

    let html = result.value;

    // Apply all substitutions
    for (const [placeholder, value] of Object.entries(subs)) {
      html = html.split(placeholder).join(value);
    }

    return NextResponse.json({ html }, { status: 200 });
  } catch (err: unknown) {
    console.error('[doc-preview] Error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to load document' },
      { status: 500 }
    );
  }
}
