import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { firstName, lastName, email, subject, message } = await request.json();

    // Validate required fields
    if (!firstName || !email || !message) {
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
        firstName,
        lastName,
        email,
        subject,
        message,
      }),
    });

    const data = await res.json();

    if (!data.success) {
      console.error('Apps Script error:', data.error);
      return NextResponse.json(
        { error: data.error || 'Failed to send email' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { message: 'Email sent successfully' },
      { status: 200 }
    );

  } catch (error) {
    console.error('Error sending email:', error);
    return NextResponse.json(
      { error: 'Failed to send email' },
      { status: 500 }
    );
  }
}