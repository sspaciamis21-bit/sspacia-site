import { NextResponse } from 'next/server';

// POST /api/public/contact — Send contact form via Google Apps Script
export async function POST(request: Request) {
  try {
    const body = await request.json() as Record<string, unknown>;
    const { firstName, lastName, email, subject, message } = body;

    if (!firstName || !email || !message) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (!process.env.APPS_SCRIPT_URL || !process.env.APPS_SCRIPT_TOKEN) {
      console.error('[PUBLIC_CONTACT] Apps Script env vars missing');
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    const res = await fetch(process.env.APPS_SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token: process.env.APPS_SCRIPT_TOKEN,
        firstName,
        lastName,
        email,
        subject,
        message,
      }),
    });

    const data = await res.json() as { success: boolean; error?: string };

    if (!data.success) {
      console.error('[PUBLIC_CONTACT] Apps Script error:', data.error);
      return NextResponse.json({ error: 'Failed to send message' }, { status: 500 });
    }

    return NextResponse.json({ data: { message: 'Message sent successfully' } });
  } catch (error) {
    console.error('[PUBLIC_CONTACT]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
