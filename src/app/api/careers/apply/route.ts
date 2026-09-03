import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { syncCandidateToHrSheet } from '@/lib/hrSheetsSync';

export const dynamic = 'force-dynamic';

/**
 * POST /api/careers/apply
 * Public endpoint to submit a job application
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      jobPositionId,
      appliedPosition,
      fullName,
      email,
      mobileNo,
      age,
      gender,
      qualification,
      experience,
      address = '',
    } = body;

    // 1. Mandatory Validations
    if (!fullName || typeof fullName !== 'string' || !fullName.trim()) {
      return NextResponse.json({ error: 'Full Name is required' }, { status: 400 });
    }

    if (!email || typeof email !== 'string' || !email.trim()) {
      return NextResponse.json({ error: 'Email Address is required' }, { status: 400 });
    }

    const cleanEmail = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      return NextResponse.json({ error: 'Please enter a valid Email Address' }, { status: 400 });
    }

    if (!mobileNo || typeof mobileNo !== 'string' || !mobileNo.trim()) {
      return NextResponse.json({ error: 'Mobile Number is required' }, { status: 400 });
    }

    const cleanMobile = mobileNo.replace(/\D/g, '');
    if (cleanMobile.length !== 10) {
      return NextResponse.json({ error: 'Please enter a valid 10-digit Mobile Number' }, { status: 400 });
    }

    const numAge = Number(age);
    if (!age || isNaN(numAge) || numAge < 16 || numAge > 75) {
      return NextResponse.json({ error: 'Please enter a valid Age (between 16 and 75)' }, { status: 400 });
    }

    if (!gender || (gender !== 'Male' && gender !== 'Female')) {
      return NextResponse.json({ error: 'Please select a valid Gender (Male or Female)' }, { status: 400 });
    }

    if (!qualification || typeof qualification !== 'string' || !qualification.trim()) {
      return NextResponse.json({ error: 'Educational Qualification is required' }, { status: 400 });
    }

    if (!experience || typeof experience !== 'string' || !experience.trim()) {
      return NextResponse.json({ error: 'Experience is required' }, { status: 400 });
    }

    if (!appliedPosition || typeof appliedPosition !== 'string' || !appliedPosition.trim()) {
      return NextResponse.json({ error: 'Applied Position is required' }, { status: 400 });
    }

    // 2. Direct Database Storage (Bulletproof against client mismatch)
    const validJobId = jobPositionId && !isNaN(Number(jobPositionId)) ? Number(jobPositionId) : null;
    const cleanAddress = address && typeof address === 'string' && address.trim() ? address.trim() : null;

    await prisma.$executeRawUnsafe(
      'INSERT INTO `CareerApplication` (`jobPositionId`, `appliedPosition`, `fullName`, `email`, `mobileNo`, `age`, `gender`, `qualification`, `experience`, `address`, `status`, `createdAt`, `updatedAt`) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())',
      validJobId,
      appliedPosition.trim(),
      fullName.trim(),
      cleanEmail,
      cleanMobile,
      numAge,
      gender,
      qualification.trim(),
      experience.trim(),
      cleanAddress,
      'APPLIED'
    );

    // 3. Asynchronously sync to Google Sheets 'HR' tab
    try {
      syncCandidateToHrSheet({
        fullName: fullName.trim(),
        email: cleanEmail,
        mobileNo: cleanMobile,
        age: numAge,
        gender: gender,
        qualification: qualification.trim(),
        experience: experience.trim(),
        appliedPosition: appliedPosition.trim(),
        address: cleanAddress,
        status: 'APPLIED',
      }).catch((sheetErr) => {
        console.warn('[Careers Apply] Google Sheets sync notice:', sheetErr);
      });
    } catch (sheetErr) {
      console.warn('[Careers Apply] Google Sheets sync dispatch notice:', sheetErr);
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Your application has been successfully submitted! Our HR team will review your profile shortly.',
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error submitting job application:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to submit application. Please try again.' },
      { status: 500 }
    );
  }
}
