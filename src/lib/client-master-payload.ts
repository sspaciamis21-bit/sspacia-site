import { buildHoAddress } from '@/lib/client-master-utils';

export function mapClientMasterPayload(body: Record<string, unknown>) {
  const {
    companyName,
    hoAddress,
    hoAddressLine1,
    hoAddressLine2,
    hoCity,
    hoState,
    hoCountry,
    hoPinCode,
    gstStatus = 'UNREGISTERED',
    gstNo,
    gstPdfUrl,
    gstPdfName,
    agreementStartDate,
    agreementEndDate,
    agreementPdfUrl,
    agreementPdfName,
    lockinEndDate,
    noticePeriodMonths,
    noticePeriodApplicable,
    escalationPercent,
    escalationApplicable,
    documentationCharges,
    cabinName,
    noOfSeats,
    ratePerAgreement,
    amount,
    gstPercent,
    totalAmount,
    products = [],
    willDeductTds = false,
    tanNo,
    tdsPdfUrl,
    tdsPdfName,
    clientId,
    hasBrokerCommission = false,
    brokerCommissionPercent,
    invoiceToBeRaised,
    sorAmount,
    sorRecdDate,
    sdrAmount,
    sdrRecdDate,
    sdrPdfUrl,
    sdrPdfName,
    paymentDueDay,
    clientStatus = 'Active',
    clientType = 'DEFAULT',
    contactPersons = [],
  } = body;

  const resolvedSdrAmount = sdrAmount !== undefined && sdrAmount !== null && sdrAmount !== ''
    ? Number(sdrAmount)
    : (sorAmount !== undefined && sorAmount !== null && sorAmount !== '' ? Number(sorAmount) : null);

  const resolvedSdrDate = sdrRecdDate
    ? new Date(String(sdrRecdDate))
    : (sorRecdDate ? new Date(String(sorRecdDate)) : null);

  const productList = Array.isArray(products) ? products : [];
  const firstProduct = productList[0] || {};

  const isVirtualOffice = clientType === 'VIRTUAL_OFFICE';
  const isOneTime = clientType === 'ONE_TIME';

  const resolvedCabinName = isVirtualOffice
    ? 'Virtual Office'
    : (productList.length > 0
        ? productList.map((p) => (p.cabinName ? String(p.cabinName).trim() : '')).filter(Boolean).join(', ')
        : (cabinName ? String(cabinName).trim() : (isOneTime ? 'Meeting Room' : null)));

  const resolvedNoOfSeats = isVirtualOffice
    ? 0
    : (isOneTime
        ? (noOfSeats ? Number(noOfSeats) : 1)
        : (productList.length > 0
            ? productList.reduce((sum, p) => sum + (p.noOfSeats ? Number(p.noOfSeats) : 0), 0)
            : (noOfSeats ? Number(noOfSeats) : null)));

  const resolvedRate = isVirtualOffice
    ? 0
    : (productList.length > 0
        ? (firstProduct.ratePerAgreement ? Number(firstProduct.ratePerAgreement) : null)
        : (ratePerAgreement ? Number(ratePerAgreement) : null));

  const resolvedAmount = amount !== undefined && amount !== null && amount !== ''
    ? Number(amount)
    : (productList.length > 0
        ? productList.reduce((sum, p) => sum + (p.amount ? Number(p.amount) : 0), 0)
        : null);

  const resolvedGstPercent = productList.length > 0
    ? (firstProduct.gstPercent ? Number(firstProduct.gstPercent) : 18)
    : (gstPercent ? Number(gstPercent) : 18);

  const resolvedTotalAmount = totalAmount !== undefined && totalAmount !== null && totalAmount !== ''
    ? Number(totalAmount)
    : (productList.length > 0
        ? productList.reduce((sum, p) => sum + (p.totalAmount ? Number(p.totalAmount) : 0), 0)
        : null);

  const structuredAddress = buildHoAddress({
    line1: hoAddressLine1 as string | undefined,
    line2: hoAddressLine2 as string | undefined,
    city: hoCity as string | undefined,
    state: hoState as string | undefined,
    country: hoCountry as string | undefined,
    pinCode: hoPinCode as string | undefined,
  });

  const parsedSessionDate = (raw: unknown) => {
    if (!raw) return null;
    try {
      const d = new Date(String(raw));
      return isNaN(d.getTime()) ? null : d;
    } catch {
      return null;
    }
  };

  return {
    companyName: String(companyName || '').trim(),
    hoAddress: structuredAddress || (hoAddress ? String(hoAddress).trim() : null),
    hoAddressLine1: hoAddressLine1 ? String(hoAddressLine1).trim() : null,
    hoAddressLine2: hoAddressLine2 ? String(hoAddressLine2).trim() : null,
    hoCity: hoCity ? String(hoCity).trim() : null,
    hoState: hoState ? String(hoState).trim() : null,
    hoCountry: hoCountry ? String(hoCountry).trim() : null,
    hoPinCode: hoPinCode ? String(hoPinCode).trim() : null,
    gstStatus: String(gstStatus || 'UNREGISTERED'),
    gstNo: gstStatus === 'REGISTERED' && gstNo ? String(gstNo).trim() : null,
    gstPdfUrl: gstStatus === 'REGISTERED' ? (gstPdfUrl as string) || null : null,
    gstPdfName: gstStatus === 'REGISTERED' ? (gstPdfName as string) || null : null,
    agreementStartDate: isOneTime ? (productList[0]?.sessionDate ? parsedSessionDate(productList[0].sessionDate) : null) : (agreementStartDate ? new Date(String(agreementStartDate)) : null),
    agreementEndDate: isOneTime ? (productList[0]?.sessionDate ? parsedSessionDate(productList[0].sessionDate) : null) : (agreementEndDate ? new Date(String(agreementEndDate)) : null),
    agreementPdfUrl: isOneTime ? null : ((agreementPdfUrl as string) || null),
    agreementPdfName: isOneTime ? null : ((agreementPdfName as string) || null),
    lockinEndDate: isOneTime ? null : (lockinEndDate ? new Date(String(lockinEndDate)) : null),
    noticePeriodMonths: isOneTime ? null : (noticePeriodMonths ? Number(noticePeriodMonths) : null),
    noticePeriodApplicable: isOneTime ? null : (noticePeriodApplicable ? String(noticePeriodApplicable) : null),
    escalationPercent: isOneTime ? null : (escalationPercent ? Number(escalationPercent) : null),
    escalationApplicable: isOneTime ? null : (escalationApplicable ? new Date(String(escalationApplicable)) : null),
    documentationCharges: isOneTime ? null : (documentationCharges ? Number(documentationCharges) : null),
    cabinName: resolvedCabinName,
    noOfSeats: resolvedNoOfSeats,
    ratePerAgreement: resolvedRate,
    amount: resolvedAmount,
    gstPercent: resolvedGstPercent,
    totalAmount: resolvedTotalAmount,
    willDeductTds: isOneTime ? false : Boolean(willDeductTds),
    tanNo: !isOneTime && willDeductTds && tanNo ? String(tanNo).trim() : null,
    tdsPdfUrl: !isOneTime && willDeductTds ? (tdsPdfUrl as string) || null : null,
    tdsPdfName: !isOneTime && willDeductTds ? (tdsPdfName as string) || null : null,
    clientId: clientId ? String(clientId).trim() : null,
    hasBrokerCommission: Boolean(hasBrokerCommission),
    brokerCommissionPercent: hasBrokerCommission && brokerCommissionPercent
      ? Number(brokerCommissionPercent)
      : null,
    invoiceToBeRaised: hasBrokerCommission && invoiceToBeRaised
      ? String(invoiceToBeRaised)
      : null,
    sorAmount: isOneTime ? null : resolvedSdrAmount,
    sorRecdDate: isOneTime ? null : resolvedSdrDate,
    sdrAmount: isOneTime ? null : resolvedSdrAmount,
    sdrRecdDate: isOneTime ? null : resolvedSdrDate,
    sdrPdfUrl: isOneTime ? null : (sdrPdfUrl ? String(sdrPdfUrl).trim() : null),
    sdrPdfName: isOneTime ? null : (sdrPdfName ? String(sdrPdfName).trim() : null),
    paymentDueDay: isOneTime ? null : (paymentDueDay ? Number(paymentDueDay) : null),
    clientStatus: clientStatus ? String(clientStatus) : (isOneTime ? 'One-Time' : 'Active'),
    clientType: clientType === 'VIRTUAL_OFFICE' ? 'VIRTUAL_OFFICE' : (clientType === 'ONE_TIME' ? 'ONE_TIME' : 'DEFAULT'),
    contactPersons: Array.isArray(contactPersons) ? contactPersons : [],
    products: productList.map((p: Record<string, unknown>, idx: number) => {
      const sDate = parsedSessionDate(p.sessionDate || p.agreementStartDate);
      return {
        cabinName: p.cabinName ? String(p.cabinName).trim() : null,
        noOfSeats: isOneTime ? 1 : (p.noOfSeats ? Number(p.noOfSeats) : null),
        ratePerAgreement: p.ratePerAgreement ? Number(p.ratePerAgreement) : null,
        amount: p.amount ? Number(p.amount) : null,
        gstPercent: p.gstPercent !== undefined && p.gstPercent !== null && p.gstPercent !== '' ? Number(p.gstPercent) : 18,
        totalAmount: p.totalAmount ? Number(p.totalAmount) : null,
        paymentDuration: isOneTime ? 'ONE_TIME' : (p.paymentDuration ? String(p.paymentDuration).trim() : 'MONTHLY'),
        paymentDueDay: isOneTime ? null : (p.paymentDueDay ? Number(p.paymentDueDay) : null),
        firstPaymentDate: isOneTime ? sDate : (p.firstPaymentDate ? new Date(String(p.firstPaymentDate)) : null),
        agreementPdfUrl: isOneTime ? null : (p.agreementPdfUrl ? String(p.agreementPdfUrl) : null),
        agreementPdfName: isOneTime ? null : (p.agreementPdfName ? String(p.agreementPdfName) : null),
        agreementStartDate: sDate || (p.agreementStartDate ? new Date(String(p.agreementStartDate)) : null),
        agreementEndDate: sDate || (p.agreementEndDate ? new Date(String(p.agreementEndDate)) : null),
        lockinEndDate: isOneTime ? null : (p.lockinEndDate ? new Date(String(p.lockinEndDate)) : null),
        billingType: isOneTime ? 'ONE_TIME' : (p.billingType ? String(p.billingType) : 'REGULAR'),
        proratedStartDate: isOneTime ? null : (p.proratedStartDate ? new Date(String(p.proratedStartDate)) : null),
        proratedEndDate: isOneTime ? null : (p.proratedEndDate ? new Date(String(p.proratedEndDate)) : null),
        parentProductId: isOneTime ? null : (p.parentProductId ? Number(p.parentProductId) : null),
        extraSeatsCount: isOneTime ? null : (p.extraSeatsCount ? Number(p.extraSeatsCount) : null),
        extraSeatsDate: isOneTime ? null : (p.extraSeatsDate ? new Date(String(p.extraSeatsDate)) : null),
        escalationPercent: isOneTime ? null : (p.escalationPercent ? Number(p.escalationPercent) : null),
        escalationApplicable: isOneTime ? null : (p.escalationApplicable ? new Date(String(p.escalationApplicable)) : null),
        preEscalationRate: isOneTime ? null : (p.preEscalationRate ? Number(p.preEscalationRate) : null),
        postEscalationRate: isOneTime ? null : (p.postEscalationRate ? Number(p.postEscalationRate) : null),
        sessionDate: sDate,
        startTime: p.startTime ? String(p.startTime).trim() : null,
        endTime: p.endTime ? String(p.endTime).trim() : null,
        sortOrder: idx,
      };
    }),
  };
}
