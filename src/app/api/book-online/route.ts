import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, email, phone, company, location, spaceType, date, time, message } = body;

    // Validate required fields
    if (!name || !email || !phone || !location || !spaceType) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Check env vars
    if (!process.env.APPS_SCRIPT_URL || !process.env.APPS_SCRIPT_TOKEN) {
      console.error('Apps Script URL or token missing in environment variables');
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }

    // Call the Apps Script Web App
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

    const data = await res.json();

    if (!data.success) {
      console.error('Apps Script error:', data.error);
      return NextResponse.json(
        { error: data.error || 'Failed to send inquiry' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { message: 'Inquiry sent successfully' },
      { status: 200 }
    );

  } catch (error) {
    console.error('Error sending inquiry:', error);
    return NextResponse.json(
      { error: 'Failed to send inquiry' },
      { status: 500 }
    );
  }
}
