import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import crypto from 'crypto';
import { sendTourBookingToSheet } from '@/lib/expenseFms';

// POST /api/public/visitor-lead
// Registers or retrieves an UnregisteredCustomer lead for visitor chat & sends tour bookings to Google Sheet & sales email
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { username, email, mobileNo, locationName, preferredDate } = body;

    if (!username || !email || !mobileNo) {
      return NextResponse.json(
        { error: 'Name, email, and mobile number are required.' },
        { status: 400 }
      );
    }

    const cleanEmail = String(email).trim().toLowerCase();
    const cleanPhone = String(mobileNo).trim();
    const cleanName  = String(username).trim();

    // Check if user is already a registered user in system
    const existingRegisteredUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email: cleanEmail },
          { phone: cleanPhone },
          { contactNumber: cleanPhone }
        ]
      }
    });

    if (existingRegisteredUser) {
      // Clean up any old lead record if it exists
      await (prisma as any).unregisteredCustomer.deleteMany({
        where: { OR: [{ email: cleanEmail }, { mobileNo: cleanPhone }] }
      });
    }

    // Find existing lead by email or mobileNo
    let lead = await (prisma as any).unregisteredCustomer.findFirst({
      where: {
        OR: [
          { email: cleanEmail },
          { mobileNo: cleanPhone }
        ]
      }
    });

    if (!lead) {
      const sessionToken = `vtr_${crypto.randomBytes(16).toString('hex')}`;
      lead = await (prisma as any).unregisteredCustomer.create({
        data: {
          username: cleanName,
          email: cleanEmail,
          mobileNo: cleanPhone,
          sessionToken,
        }
      });
    } else {
      // Update name/phone/token if changed
      lead = await (prisma as any).unregisteredCustomer.update({
        where: { id: lead.id },
        data: {
          username: cleanName,
          mobileNo: cleanPhone,
        }
      });
    }

    // Retroactively update VisitorLog entries for chat metrics
    try {
      await (prisma as any).visitorLog.updateMany({
        where: {
          OR: [
            { userEmail: cleanEmail },
            { isUnregistered: true }
          ]
        },
        data: {
          hasChatted: true,
          userEmail: cleanEmail
        }
      });
    } catch (err) {
      console.warn('[VISITOR_LEAD_LOG_UPDATE_WARN]', err);
    }

    // If this is a Workspace Tour Booking request, send to Google Sheet & sales email
    if (locationName || preferredDate) {
      try {
        await sendTourBookingToSheet({
          username: cleanName,
          email: cleanEmail,
          mobileNo: cleanPhone,
          locationName: String(locationName || 'Premier House (SG Highway)').trim(),
          preferredDate: String(preferredDate || 'Not Specified').trim()
        });
      } catch (tourErr) {
        console.warn('[TOUR_BOOKING_SHEET_WARN]', tourErr);
      }
    }

    return NextResponse.json({
      success: true,
      lead: {
        id: lead.id,
        username: lead.username,
        email: lead.email,
        mobileNo: lead.mobileNo,
        sessionToken: lead.sessionToken
      }
    });
  } catch (error: any) {
    console.error('[VISITOR_LEAD_CREATE_ERROR]', error);
    return NextResponse.json({ error: 'Failed to initialize visitor session.' }, { status: 500 });
  }
}
