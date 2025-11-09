import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, smtpServer, port, password } = body;

    // Validation
    if (!email || !smtpServer || !port || !password) {
      return NextResponse.json(
        { status: 0, isGood: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Create transporter with provided SMTP settings
    const transporter = nodemailer.createTransport({
      host: smtpServer,
      port: parseInt(port.toString()),
      secure: port === 465 || port === '465', // true for 465, false for other ports
      auth: {
        user: email,
        pass: password,
      },
    });

    try {
      // Verify connection configuration
      await transporter.verify();
      console.log('SMTP settings are valid.');
      return NextResponse.json({ status: 1, isGood: true });
    } catch (error: any) {
      console.error('SMTP validation failed:', error.message);
      return NextResponse.json({ status: 0, isGood: false, error: error.message });
    }
  } catch (error: any) {
    console.error('Error validating SMTP:', error);
    return NextResponse.json(
      { status: 0, isGood: false, error: error.message },
      { status: 500 }
    );
  }
}

