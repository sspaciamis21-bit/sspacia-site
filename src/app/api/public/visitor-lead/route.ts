import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import crypto from 'crypto';

// POST /api/public/visitor-lead
// Registers or retrieves an UnregisteredCustomer lead for visitor chat
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { username, email, mobileNo } = body;

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
