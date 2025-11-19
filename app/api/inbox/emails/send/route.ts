import { NextRequest, NextResponse } from 'next/server';
import admin from 'firebase-admin';
import nodemailer from 'nodemailer';
import { generateMessageResponseHtml } from './email-templates';
import {
  fetchMessages,
  getCompanyName,
  getSubdomain,
  addMessage,
  updateTicket,
} from './email-helpers';

// Force dynamic rendering to prevent static generation
export const dynamic = 'force-dynamic';

// Initialize Firebase Admin if not already initialized
function initializeFirebase() {
  if (!admin.apps.length) {
    try {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        }),
        databaseURL: process.env.FIREBASE_DATABASE_URL,
      });
    } catch (error) {
      console.log('Firebase admin initialization error', error);
    }
  }
}

interface EmailConfig {
  smtpServer?: string;
  port?: number;
  emailAddress?: string;
  password?: string;
}

interface FileUrl {
  name: string;
  url: string;
}

/**
 * POST /api/inbox/emails/send
 * Sends an email reply to a ticket
 * 
 * Body parameters:
 * - uid: User ID (required)
 * - selectedCompany: Company identifier (optional, defaults to 'default')
 * - ticketId: Ticket ID (required)
 * - to: Recipient email (required)
 * - subject: Email subject (required)
 * - message: Email message body (required)
 * - replyToId: Message ID to reply to (optional)
 * - references: Email references header (optional)
 * - currentFrom: Email configuration object (optional)
 * - fileUrls: Array of file attachments (optional)
 */
export async function POST(request: NextRequest) {
  // Initialize Firebase only when the API is called, not during build
  initializeFirebase();
  
  try {
    const body = await request.json();
    const {
      uid,
      selectedCompany = 'default',
      ticketId,
      to: newTo,
      subject,
      message,
      replyToId = '',
      references = '',
      currentFrom,
      fileUrls = [],
    } = body;

    // Validate required parameters
    if (!uid || !ticketId || !newTo || !subject || !message) {
      return NextResponse.json(
        {
          status: 0,
          message: 'Missing required parameters: uid, ticketId, to, subject, message',
        },
        { status: 400 }
      );
    }

    // Normalize attachments array
    let normalizedFileUrls: FileUrl[] = [];
    if (Array.isArray(fileUrls)) {
      normalizedFileUrls = fileUrls.filter((file) => file && typeof file === 'object' && file.url);
    }

    // Get subdomain and company name
    const subdomain = await getSubdomain(uid, selectedCompany);
    if (!subdomain) {
      return NextResponse.json(
        { status: 0, message: 'Subdomain not found for user' },
        { status: 404 }
      );
    }

    const companyName = await getCompanyName(uid, selectedCompany);

    // Get message list for HTML template
    const messageList = await fetchMessages(ticketId, uid, selectedCompany);

    // Generate HTML email template
    const html = generateMessageResponseHtml(
      messageList,
      newTo,
      message,
      subdomain,
      companyName,
      'Support'
    );

    // Configure SMTP settings - fetch full email config if custom email is used
    let fromConfig: EmailConfig = {};
    let hasCustomConfig = false;

    if (currentFrom && currentFrom.type === 'custom' && currentFrom.id) {
      // Fetch the full email configuration including password from Firestore
      const db = admin.firestore();
      const emailDocRef = db
        .collection('Users')
        .doc(uid)
        .collection('knowledgebases')
        .doc(selectedCompany)
        .collection('emails')
        .doc(currentFrom.id);

      const emailDoc = await emailDocRef.get();
      if (emailDoc.exists) {
        const emailData = emailDoc.data();
        fromConfig = {
          smtpServer: emailData?.smtpServer,
          port: emailData?.port,
          emailAddress: emailData?.emailAddress,
          password: emailData?.password,
        };
        hasCustomConfig = true;
      }
    }

    const resolvedHost = hasCustomConfig && fromConfig.smtpServer 
      ? fromConfig.smtpServer 
      : 'smtp.fastmail.com';
    const resolvedPort = hasCustomConfig && fromConfig.port 
      ? Number(fromConfig.port) 
      : 465;
    const resolvedSecure = hasCustomConfig && fromConfig.port != null
      ? Number(fromConfig.port) === 465 || String(fromConfig.port) === '465'
      : true;
    const resolvedUser = hasCustomConfig && fromConfig.emailAddress 
      ? fromConfig.emailAddress 
      : 'all@ourkd.help';
    const resolvedPass = hasCustomConfig && fromConfig.password 
      ? fromConfig.password 
      : process.env.DEFAULT_EMAIL_PASSWORD || '';
    const resolvedFrom = hasCustomConfig && fromConfig.emailAddress 
      ? fromConfig.emailAddress 
      : `${subdomain}@ourkd.help`;

    console.log('Resolved SMTP configuration:', {
      type: hasCustomConfig ? 'custom' : 'default',
      hasCustomConfig,
      host: resolvedHost,
      port: resolvedPort,
      secure: resolvedSecure,
      user: resolvedUser,
      from: resolvedFrom,
      hasPassword: !!resolvedPass,
    });

    // Create nodemailer transporter
    const transporter = nodemailer.createTransport({
      host: resolvedHost,
      port: resolvedPort,
      secure: resolvedSecure,
      auth: {
        user: resolvedUser,
        pass: resolvedPass,
      },
    });

    // Prepare email with attachments
    const emailOptions: any = {
      from: resolvedFrom,
      to: newTo,
      subject: subject,
      text: message,
      html: html,
      inReplyTo: replyToId || undefined,
      references: references || undefined,
    };

    // Add attachments if present
    if (normalizedFileUrls.length > 0) {
      emailOptions.attachments = normalizedFileUrls.map((file) => ({
        filename: file.name,
        path: file.url,
      }));
    }

    // Send the email
    const info = await transporter.sendMail(emailOptions);

    console.log('Email sent successfully:', info.messageId);

    // Add message to Firestore
    await addMessage(
      ticketId,
      newTo,
      resolvedFrom,
      message,
      replyToId,
      info.messageId || '',
      references,
      subject,
      uid,
      'outbound',
      selectedCompany,
      normalizedFileUrls
    );

    // Update ticket
    await updateTicket(ticketId, uid, selectedCompany, message);

    return NextResponse.json({
      status: 1,
      message: 'Email sent successfully',
      messageId: info.messageId,
    });
  } catch (error: any) {
    console.error('Error sending email:', error);
    return NextResponse.json(
      {
        status: 0,
        message: 'Error sending email',
        error: error.message,
      },
      { status: 500 }
    );
  }
}

