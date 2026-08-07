import { NextResponse } from 'next/server';

// POST /api/public/book-online — Send booking inquiry via Google Apps Script
export async function POST(request: Request) {
  try {
    const body = await request.json() as Record<string, unknown>;
    const { name, email, phone, company, location, spaceType, date, time, message } = body;

    if (!name || !email || !phone || !location || !spaceType) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (!process.env.APPS_SCRIPT_URL || !process.env.APPS_SCRIPT_TOKEN) {
      console.error('[PUBLIC_BOOK_ONLINE] Apps Script env vars missing');
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    const res = await fetch(process.env.APPS_SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token: process.env.APPS_SCRIPT_TOKEN,
        formType: 'book-online',
        name,
        email,
        phone,
        company: company || 'N/A',
        location,
        spaceType,
        date,
        time,
        message: message || 'N/A',
      }),
    });

    const data = await res.json() as { success: boolean; error?: string };

    if (!data.success) {
      console.error('[PUBLIC_BOOK_ONLINE] Apps Script error:', data.error);
      return NextResponse.json({ error: 'Failed to send inquiry' }, { status: 500 });
    }

    return NextResponse.json({ data: { message: 'Inquiry sent successfully' } });
  } catch (error) {
    console.error('[PUBLIC_BOOK_ONLINE]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
