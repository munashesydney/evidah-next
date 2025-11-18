import { NextRequest, NextResponse } from 'next/server';
import { getFirestore } from 'firebase-admin/firestore';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import nodemailer from 'nodemailer';

// Initialize Firebase Admin if not already initialized
if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });
}

const db = getFirestore();

/**
 * POST /api/notify/question
 * Send email notification when an AI employee has a question
 * 
 * Request body:
 * - uid: string (required) - User ID
 * - companyId: string (required) - Company ID
 * - chatId: string (required) - Question chat ID
 * - reason: string (required) - Reason for escalation
 * - urgency: string (optional) - Urgency level
 * - summary: string (optional) - Question summary
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { uid, companyId, chatId, reason, urgency = 'medium', summary } = body;

    if (!uid || !companyId || !chatId || !reason) {
      return NextResponse.json(
        { success: false, error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    console.log(`[NOTIFY QUESTION] Sending notification for chat ${chatId}`);

    // Get user email from Firebase Auth
    const { getAuth } = await import('firebase-admin/auth');
    const auth = getAuth();
    
    let userEmail: string;
    let companyName = 'Your Company';
    
    try {
      const userRecord = await auth.getUser(uid);
      userEmail = userRecord.email || '';
      
      if (!userEmail) {
        console.log('[NOTIFY QUESTION] No email found for user');
        return NextResponse.json(
          { success: false, error: 'User email not found' },
          { status: 404 }
        );
      }
    } catch (error) {
      console.error('[NOTIFY QUESTION] Error fetching user:', error);
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    // Try to get company name (optional, don't fail if not found)
    try {
      const kbDoc = await db
        .collection('Users')
        .doc(uid)
        .collection('knowledgebases')
        .doc(companyId)
        .get();
      
      if (kbDoc.exists) {
        companyName = kbDoc.data()?.name || 'Your Company';
      }
    } catch (error) {
      console.log('[NOTIFY QUESTION] Could not fetch company name, using default');
    }

    // Create email transporter using Evidah SMTP
    console.log(`[NOTIFY QUESTION] Setting up SMTP with host: ${process.env.SMTP_HOST}`);
    
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '465'),
      secure: true,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
      },
    });

    // Verify transporter configuration
    try {
      await transporter.verify();
      console.log('[NOTIFY QUESTION] SMTP connection verified');
    } catch (verifyError) {
      console.error('[NOTIFY QUESTION] SMTP verification failed:', verifyError);
      return NextResponse.json(
        { success: false, error: 'Email service configuration error' },
        { status: 500 }
      );
    }

    // Determine urgency emoji and color
    const urgencyMap: Record<string, { emoji: string; color: string; label: string }> = {
      low: { emoji: '💬', color: '#10B981', label: 'Low Priority' },
      medium: { emoji: '⚠️', color: '#F59E0B', label: 'Medium Priority' },
      high: { emoji: '🚨', color: '#EF4444', label: 'High Priority' },
    };
    const urgencyInfo = urgencyMap[urgency] || { emoji: '💬', color: '#6B7280', label: 'Normal' };

    // Build chat URL
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXT_PUBLIC_APP_URL || 'https://app.evidah.com';
    const chatUrl = `${baseUrl}/${companyId}/chat/sung-wen?chatId=${chatId}`;

    // Send email
    console.log(`[NOTIFY QUESTION] Sending email to ${userEmail}`);
    
    const mailOptions = {
      from: `"${companyName} AI Assistant" <noreply@evidah.com>`,
      to: userEmail,
      subject: `${urgencyInfo.emoji} Question from Your AI Employee - ${companyName}`,
      html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Question from AI Employee</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 0;">
        <table role="presentation" style="width: 600px; max-width: 100%; border-collapse: collapse; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 20px; text-align: center; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 8px 8px 0 0;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 600;">
                ${urgencyInfo.emoji} Question from Your AI Employee
              </h1>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <p style="margin: 0 0 20px; color: #374151; font-size: 16px; line-height: 1.6;">
                Hi there,
              </p>
              
              <p style="margin: 0 0 20px; color: #374151; font-size: 16px; line-height: 1.6;">
                One of your AI employees (Sung Wen) needs your help with a question. They've encountered something they're not certain about and want to make sure they provide you with accurate information.
              </p>

              <!-- Question Details Box -->
              <table role="presentation" style="width: 100%; border-collapse: collapse; margin: 30px 0; background-color: #f9fafb; border-left: 4px solid ${urgencyInfo.color}; border-radius: 4px;">
                <tr>
                  <td style="padding: 20px;">
                    <p style="margin: 0 0 12px; color: #6b7280; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">
                      ${urgencyInfo.label}
                    </p>
                    
                    <p style="margin: 0 0 16px; color: #111827; font-size: 18px; font-weight: 600;">
                      ${reason}
                    </p>
                    
                    ${summary ? `
                    <p style="margin: 0; color: #4b5563; font-size: 14px; line-height: 1.6;">
                      ${summary}
                    </p>
                    ` : ''}
                  </td>
                </tr>
              </table>

              <p style="margin: 0 0 30px; color: #374151; font-size: 16px; line-height: 1.6;">
                Click the button below to review the question and provide guidance:
              </p>

              <!-- CTA Button -->
              <table role="presentation" style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td align="center">
                    <a href="${chatUrl}" style="display: inline-block; padding: 16px 32px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">
                      Review Question →
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin: 30px 0 0; color: #6b7280; font-size: 14px; line-height: 1.6;">
                Your AI employees are designed to escalate questions when they're not 100% certain, ensuring accuracy and quality in all responses.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 20px 40px; background-color: #f9fafb; border-radius: 0 0 8px 8px; text-align: center;">
              <p style="margin: 0; color: #9ca3af; font-size: 12px;">
                ${companyName} | Powered by AI Knowledge Desk
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
      `,
    };

    const info = await transporter.sendMail(mailOptions);

    console.log(`[NOTIFY QUESTION] ✅ Email sent successfully to ${userEmail}`, info.messageId);

    return NextResponse.json({
      success: true,
      message: 'Notification sent successfully',
      messageId: info.messageId,
    });
  } catch (error: any) {
    console.error('[NOTIFY QUESTION] Error sending notification:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to send notification',
          details: error.message,
        },
      },
      { status: 500 }
    );
  }
}
