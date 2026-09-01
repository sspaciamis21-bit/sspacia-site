/**
 * Generates an official SSPACIA Service Closure & No-Objection Certificate (NOC) HTML document.
 * Can be rendered into a PDF or printed for client signature.
 */

interface ClosureDocData {
  companyName: string;
  clientId: string;
  locationName: string;
  cabinName: string;
  noOfSeats: number;
  agreementStartDate: string;
  agreementEndDate: string;
  lockinEndDate: string;
  noticeReceivedDate: string;
  noticeApplicableEndDate: string;
  sorAmountHeld: number;
  duesHeld: number;
  tdsPending: number;
  sdrRefundAmount: number;
  isSdrRefundApplicable: boolean;
  referenceNo: string;
  generatedDate: string;
}

export function generateClosureDocumentHtml(data: ClosureDocData): string {
  const formatINR = (val: number) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(val || 0);

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Service Closure & No-Objection Certificate - ${data.companyName}</title>
  <style>
    @page { size: A4; margin: 20mm 15mm; }
    body { font-family: 'Helvetica Neue', Arial, sans-serif; color: #1a1a1a; margin: 0; padding: 24px; font-size: 13px; line-height: 1.5; background: #fff; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #006064; padding-bottom: 16px; margin-bottom: 20px; }
    .brand { font-size: 24px; font-weight: 900; color: #006064; letter-spacing: -0.5px; }
    .brand-sub { font-size: 10px; font-weight: 700; color: #666; text-transform: uppercase; letter-spacing: 1.5px; }
    .doc-meta { text-align: right; font-size: 11px; color: #555; }
    .doc-title { text-align: center; font-size: 16px; font-weight: 900; color: #111; text-transform: uppercase; letter-spacing: 1px; margin: 20px 0; background: #f0fdf4; border: 1px solid #bbf7d0; padding: 10px; }
    .section { margin-bottom: 18px; }
    .section-title { font-size: 12px; font-weight: 800; text-transform: uppercase; color: #006064; border-bottom: 1px solid #e5e7eb; padding-bottom: 4px; margin-bottom: 8px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 12px; font-size: 12px; }
    th, td { padding: 6px 10px; border: 1px solid #e5e7eb; text-align: left; }
    th { background-color: #f9fafb; font-weight: 700; color: #374151; width: 35%; }
    .highlight-row { background-color: #f0fdfa; font-weight: 800; }
    .highlight-row td { color: #004d40; }
    .statement { margin: 16px 0; font-size: 12px; text-align: justify; color: #374151; }
    .signatures { display: flex; justify-content: space-between; margin-top: 40px; padding-top: 20px; }
    .sign-box { width: 45%; border-top: 1px dashed #9ca3af; padding-top: 8px; text-align: center; }
    .sign-title { font-weight: 800; font-size: 11px; text-transform: uppercase; color: #111; }
    .sign-meta { font-size: 10px; color: #6b7280; margin-top: 4px; }
    .footer { margin-top: 30px; text-align: center; font-size: 10px; color: #9ca3af; border-top: 1px solid #f3f4f6; padding-top: 12px; }
  </style>
</head>
<body>

  <div class="header">
    <div>
      <div class="brand">SSPACIA</div>
      <div class="brand-sub">Premium Coworking & Managed Workspaces</div>
      <div style="font-size: 11px; color: #555; margin-top: 4px;">Centre: ${data.locationName}</div>
    </div>
    <div class="doc-meta">
      <div><strong>Ref No:</strong> ${data.referenceNo}</div>
      <div><strong>Date:</strong> ${data.generatedDate}</div>
      <div><strong>Client ID:</strong> ${data.clientId}</div>
    </div>
  </div>

  <div class="doc-title">
    OFFICIAL SERVICE CLOSURE & NO-OBJECTION CERTIFICATE (NOC)
  </div>

  <div class="statement">
    This document certifies the formal termination of the Workspace Agreement between <strong>SSPACIA Coworking Spaces</strong> and <strong>${data.companyName}</strong>. All operational services, keycards, access badges, and allocated cabin spaces have been inventoried and cleared as per the termination checklist below.
  </div>

  <div class="section">
    <div class="section-title">1. Client & Space Allocation Details</div>
    <table>
      <tr>
        <th>Company Name</th>
        <td><strong>${data.companyName}</strong></td>
      </tr>
      <tr>
        <th>Allocated Space / Cabin</th>
        <td>${data.cabinName || 'Dedicated Cabin / Desks'} (${data.noOfSeats || 1} Seats)</td>
      </tr>
      <tr>
        <th>Operating Centre Location</th>
        <td>${data.locationName}</td>
      </tr>
    </table>
  </div>

  <div class="section">
    <div class="section-title">2. Agreement & Notice Timeline</div>
    <table>
      <tr>
        <th>Agreement Start Date</th>
        <td>${data.agreementStartDate || 'N/A'}</td>
      </tr>
      <tr>
        <th>Agreement End Date</th>
        <td>${data.agreementEndDate || 'N/A'}</td>
      </tr>
      <tr>
        <th>Lock-in End Date</th>
        <td>${data.lockinEndDate || 'N/A'}</td>
      </tr>
      <tr>
        <th>Notice Received Date</th>
        <td>${data.noticeReceivedDate || 'N/A'}</td>
      </tr>
      <tr>
        <th>Effective Vacation / Exit Date</th>
        <td>${data.noticeApplicableEndDate || 'N/A'}</td>
      </tr>
    </table>
  </div>

  <div class="section">
    <div class="section-title">3. Security Deposit & Final Financial Settlement</div>
    <table>
      <tr>
        <th>Security Deposit (SOR) Held</th>
        <td>${formatINR(data.sorAmountHeld)}</td>
      </tr>
      <tr>
        <th>Pending Invoices / Utility Dues</th>
        <td style="color: #dc2626;">-${formatINR(data.duesHeld)}</td>
      </tr>
      <tr>
        <th>TDS / Other Deductions</th>
        <td style="color: #dc2626;">-${formatINR(data.tdsPending)}</td>
      </tr>
      <tr class="highlight-row">
        <th>Net SDR Refund Applicable</th>
        <td style="font-size: 14px; font-weight: 900; color: #006064;">
          ${data.isSdrRefundApplicable ? formatINR(data.sdrRefundAmount) : '₹0.00 (No Refund / Adjusted)'}
        </td>
      </tr>
    </table>
  </div>

  <div class="statement">
    <strong>Terms of Clearance:</strong> By signing below, both parties confirm that all keys, inventory, and physical assets have been returned in satisfactory condition. Upon receipt of this signed document and final management sign-off, the Net SDR Refund amount will be disbursed via bank transfer/UTR to the client's registered account, and all active liabilities will stand fully discharged.
  </div>

  <div class="signatures">
    <div class="sign-box">
      <div style="height: 50px;"></div>
      <div class="sign-title">Authorized Signatory</div>
      <div class="sign-meta">${data.companyName} (Client)</div>
      <div class="sign-meta">Name & Seal</div>
    </div>

    <div class="sign-box">
      <div style="height: 50px;"></div>
      <div class="sign-title">Authorized Signatory</div>
      <div class="sign-meta">SSPACIA Coworking Spaces</div>
      <div class="sign-meta">Community & Management Team</div>
    </div>
  </div>

  <div class="footer">
    SSPACIA // Confidential Corporate Document // Generated automatically on ${data.generatedDate}
  </div>

</body>
</html>
`;
}
