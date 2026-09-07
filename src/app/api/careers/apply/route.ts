import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { syncCandidateToHrSheet, getISTTimestamp } from '@/lib/hrSheetsSync';
import { sendEmail } from '@/lib/email';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

const HR_NOTIFICATION_EMAIL = 'hr.ssinfrazone@gmail.com';

/**
 * POST /api/careers/apply
 * Public endpoint to submit a job application with optional CV attachment
 */
export async function POST(req: Request) {
  try {
    const contentType = req.headers.get('content-type') || '';
    let jobPositionId: any;
    let appliedPosition: string = '';
    let fullName: string = '';
    let email: string = '';
    let mobileNo: string = '';
    let age: any;
    let gender: string = 'Male';
    let qualification: string = '';
    let experience: string = 'Fresher';
    let address: string = '';
    let cvFile: File | null = null;

    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      jobPositionId = formData.get('jobPositionId');
      appliedPosition = (formData.get('appliedPosition') as string) || '';
      fullName = (formData.get('fullName') as string) || '';
      email = (formData.get('email') as string) || '';
      mobileNo = (formData.get('mobileNo') as string) || '';
      age = formData.get('age');
      gender = (formData.get('gender') as string) || 'Male';
      qualification = (formData.get('qualification') as string) || '';
      experience = (formData.get('experience') as string) || 'Fresher';
      address = (formData.get('address') as string) || '';

      const uploaded = formData.get('cv') || formData.get('resume') || formData.get('file');
      if (uploaded && typeof uploaded === 'object' && 'arrayBuffer' in uploaded) {
        cvFile = uploaded as File;
      }
    } else {
      const body = await req.json();
      jobPositionId = body.jobPositionId;
      appliedPosition = body.appliedPosition || '';
      fullName = body.fullName || '';
      email = body.email || '';
      mobileNo = body.mobileNo || '';
      age = body.age;
      gender = body.gender || 'Male';
      qualification = body.qualification || '';
      experience = body.experience || 'Fresher';
      address = body.address || '';
    }

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

    const cleanGender = gender && gender.toLowerCase().includes('female') ? 'Female' : 'Male';

    if (!qualification || typeof qualification !== 'string' || !qualification.trim()) {
      return NextResponse.json({ error: 'Educational Qualification is required' }, { status: 400 });
    }

    if (!experience || typeof experience !== 'string' || !experience.trim()) {
      return NextResponse.json({ error: 'Experience is required' }, { status: 400 });
    }

    if (!appliedPosition || typeof appliedPosition !== 'string' || !appliedPosition.trim()) {
      return NextResponse.json({ error: 'Applied Position is required' }, { status: 400 });
    }

    // 2. Handle CV Attachment Upload
    let cvUrl: string | null = null;
    let cvFileName: string | null = null;
    let cvBuffer: Buffer | null = null;
    let cvMimeType: string = 'application/pdf';

    if (!cvFile || cvFile.size === 0) {
      return NextResponse.json(
        { error: 'CV / Resume attachment is required to submit your application' },
        { status: 400 }
      );
    }

    if (cvFile.size > 15 * 1024 * 1024) {
      return NextResponse.json({ error: 'CV file size cannot exceed 15MB' }, { status: 400 });
    }

    try {
        const bytes = await cvFile.arrayBuffer();
        cvBuffer = Buffer.from(bytes);
        cvMimeType = cvFile.type || 'application/pdf';
        cvFileName = cvFile.name || 'Candidate_Resume.pdf';

        const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'resumes');
        if (!fs.existsSync(uploadDir)) {
          fs.mkdirSync(uploadDir, { recursive: true });
        }

        const safeFileName = cvFileName.replace(/[^a-zA-Z0-9.-]/g, '_');
        const diskFileName = `${Date.now()}_${safeFileName}`;
        const diskFilePath = path.join(uploadDir, diskFileName);

        await fs.promises.writeFile(diskFilePath, cvBuffer);
        cvUrl = `/uploads/resumes/${diskFileName}`;
      } catch (uploadErr) {
        console.error('[Careers Apply] CV file save error:', uploadErr);
      }

    // 3. Direct Database Storage in CareerApplication
    const validJobId = jobPositionId && !isNaN(Number(jobPositionId)) ? Number(jobPositionId) : null;
    const cleanAddress = address && typeof address === 'string' && address.trim() ? address.trim() : null;

    await prisma.$executeRawUnsafe(
      'INSERT INTO `CareerApplication` (`jobPositionId`, `appliedPosition`, `fullName`, `email`, `mobileNo`, `age`, `gender`, `qualification`, `experience`, `address`, `cvUrl`, `cvFileName`, `status`, `createdAt`, `updatedAt`) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())',
      validJobId,
      appliedPosition.trim(),
      fullName.trim(),
      cleanEmail,
      cleanMobile,
      numAge,
      cleanGender,
      qualification.trim(),
      experience.trim(),
      cleanAddress,
      cvUrl,
      cvFileName,
      'APPLIED'
    );

    const siteBase =
      process.env.NEXT_PUBLIC_APP_URL ||
      process.env.NEXTAUTH_URL ||
      'https://sspacia.com';
    const absoluteCvUrl = cvUrl ? (cvUrl.startsWith('http') ? cvUrl : `${siteBase.replace(/\/$/, '')}${cvUrl}`) : null;

    // 4. Asynchronously sync to Google Sheets 'HR' tab
    try {
      syncCandidateToHrSheet({
        fullName: fullName.trim(),
        email: cleanEmail,
        mobileNo: cleanMobile,
        age: numAge,
        gender: cleanGender,
        qualification: qualification.trim(),
        experience: experience.trim(),
        appliedPosition: appliedPosition.trim(),
        address: cleanAddress,
        cvUrl: absoluteCvUrl || 'No CV Attached',
        cvFileName: cvFileName || 'N/A',
        status: 'APPLIED',
      }).catch((sheetErr) => {
        console.warn('[Careers Apply] Google Sheets sync notice:', sheetErr);
      });
    } catch (sheetErr) {
      console.warn('[Careers Apply] Google Sheets sync dispatch notice:', sheetErr);
    }

    // 5. Send Notification Email to HR (hr.ssinfrazone@gmail.com)
    try {
      const istTime = getISTTimestamp();
      const emailSubject = `New Application: ${fullName.trim()} applied for ${appliedPosition.trim()} (SSPāCIA Careers)`;

      const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>New Job Application</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f4f7f6; margin: 0; padding: 24px; color: #1e293b;">
  <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
    
    <!-- Top Header -->
    <div style="background: linear-gradient(135deg, #004D40 0%, #006064 100%); color: #ffffff; padding: 24px; text-align: center;">
      <h1 style="margin: 0 0 6px 0; font-size: 20px; font-weight: 800; letter-spacing: -0.5px;">New Job Application Received</h1>
      <p style="margin: 0; font-size: 13px; color: #80deea;">Candidate applied via SSPāCIA Careers Portal</p>
    </div>

    <!-- Main Content -->
    <div style="padding: 24px;">
      
      <!-- Role Badge -->
      <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 12px 16px; margin-bottom: 20px;">
        <span style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: #166534; display: block;">Applied Position</span>
        <span style="font-size: 17px; font-weight: 800; color: #0f172a;">${appliedPosition.trim()}</span>
      </div>

      <!-- Candidate Details Table -->
      <table style="width: 100%; border-collapse: collapse; font-size: 13px; margin-bottom: 20px;">
        <tbody>
          <tr style="border-bottom: 1px solid #f1f5f9;">
            <td style="padding: 10px 0; color: #64748b; font-weight: 600; width: 140px;">Candidate Name:</td>
            <td style="padding: 10px 0; color: #0f172a; font-weight: 700; font-size: 14px;">${fullName.trim()}</td>
          </tr>
          <tr style="border-bottom: 1px solid #f1f5f9;">
            <td style="padding: 10px 0; color: #64748b; font-weight: 600;">Mobile Number:</td>
            <td style="padding: 10px 0;">
              <a href="tel:+91${cleanMobile}" style="color: #006064; font-weight: 700; text-decoration: none; font-family: monospace; font-size: 14px;">+91 ${cleanMobile}</a>
              <span style="color: #94a3b8; font-size: 11px; margin-left: 8px;">(<a href="https://wa.me/91${cleanMobile}" style="color: #10b981; text-decoration: none; font-weight: 600;">WhatsApp</a>)</span>
            </td>
          </tr>
          <tr style="border-bottom: 1px solid #f1f5f9;">
            <td style="padding: 10px 0; color: #64748b; font-weight: 600;">Email Address:</td>
            <td style="padding: 10px 0;">
              <a href="mailto:${cleanEmail}" style="color: #006064; text-decoration: none; font-weight: 600;">${cleanEmail}</a>
            </td>
          </tr>
          <tr style="border-bottom: 1px solid #f1f5f9;">
            <td style="padding: 10px 0; color: #64748b; font-weight: 600;">Age & Gender:</td>
            <td style="padding: 10px 0; color: #0f172a; font-weight: 600;">${numAge} Years &bull; ${cleanGender}</td>
          </tr>
          <tr style="border-bottom: 1px solid #f1f5f9;">
            <td style="padding: 10px 0; color: #64748b; font-weight: 600;">Education:</td>
            <td style="padding: 10px 0; color: #0f172a; font-weight: 600;">${qualification.trim()}</td>
          </tr>
          <tr style="border-bottom: 1px solid #f1f5f9;">
            <td style="padding: 10px 0; color: #64748b; font-weight: 600;">Experience:</td>
            <td style="padding: 10px 0; color: #0f172a; font-weight: 600;">
              <span style="background: #f1f5f9; padding: 3px 8px; border-radius: 4px; display: inline-block;">${experience.trim()}</span>
            </td>
          </tr>
          <tr style="border-bottom: 1px solid #f1f5f9;">
            <td style="padding: 10px 0; color: #64748b; font-weight: 600;">Location / Address:</td>
            <td style="padding: 10px 0; color: #0f172a;">${cleanAddress || 'Not Provided'}</td>
          </tr>
          <tr>
            <td style="padding: 10px 0; color: #64748b; font-weight: 600;">Submission Time:</td>
            <td style="padding: 10px 0; color: #475569; font-size: 12px; font-family: monospace;">${istTime}</td>
          </tr>
        </tbody>
      </table>

      <!-- Attached Resume Section -->
      ${
        absoluteCvUrl
          ? `
      <div style="background-color: #ecfdf5; border: 1px dashed #059669; border-radius: 8px; padding: 14px 16px; margin: 20px 0; text-align: center;">
        <div style="font-size: 13px; font-weight: 700; color: #065f46; margin-bottom: 4px;">
          📄 Attached CV: ${cvFileName || 'Candidate_Resume.pdf'}
        </div>
        <p style="font-size: 12px; color: #047857; margin: 0 0 10px 0;">The CV file is attached to this email and can also be opened online directly:</p>
        <a href="${absoluteCvUrl}" target="_blank" style="display: inline-block; background-color: #059669; color: #ffffff; text-decoration: none; padding: 8px 18px; border-radius: 6px; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">
          View / Download Candidate CV &rarr;
        </a>
      </div>
      `
          : `
      <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; margin: 20px 0; font-size: 12px; color: #64748b; text-align: center;">
        No CV attachment was uploaded by candidate.
      </div>
      `
      }

      <!-- Action Button for HR Portal -->
      <div style="text-align: center; margin-top: 24px; padding-top: 16px; border-top: 1px solid #f1f5f9;">
        <a href="${siteBase.replace(/\/$/, '')}/hr" target="_blank" style="display: inline-block; background-color: #004D40; color: #ffffff; text-decoration: none; padding: 10px 24px; border-radius: 8px; font-size: 13px; font-weight: 700;">
          Open HR Management Portal &rarr;
        </a>
      </div>

    </div>

    <!-- Footer -->
    <div style="background-color: #f8fafc; padding: 16px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0;">
      SSPāCIA Coworking Spaces &bull; Human Resources Automated System<br>
      Recipient: ${HR_NOTIFICATION_EMAIL}
    </div>

  </div>
</body>
</html>
      `;

      const attachments =
        cvBuffer && cvFileName
          ? [
              {
                filename: cvFileName,
                content: cvBuffer,
                contentType: cvMimeType,
              },
            ]
          : undefined;

      sendEmail({
        to: HR_NOTIFICATION_EMAIL,
        subject: emailSubject,
        html: emailHtml,
        attachments,
      }).catch((emailErr) => {
        console.error('[Careers Apply] Email dispatch notice:', emailErr);
      });
    } catch (emailErr) {
      console.error('[Careers Apply] Email creation notice:', emailErr);
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Your application has been successfully submitted! Our HR team will review your profile shortly.',
        cvUrl,
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
