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
    const { uid, companyId, chatId, reason, urgency = 'medium', summary, employeeId } = body;

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

    // Get employee name
    const employeeNames: Record<string, string> = {
      'marquavious': 'Marquavious',
      'charlie': 'Charlie',
    };
    const employeeName = employeeNames[employeeId] || 'Your AI Employee';

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
      from: `"${employeeName} | Evidah" <noreply@evidah.com>`,
      to: userEmail,
      subject: `${employeeName} has a question`,
      html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${employeeName} has a question</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" style="width: 600px; max-width: 100%; border-collapse: collapse; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          
          <!-- Header -->
          <tr>
            <td style="padding: 32px 32px 24px; border-bottom: 1px solid #e5e7eb;">
              <h1 style="margin: 0; color: #111827; font-size: 24px; font-weight: 600;">
                ${employeeName} | Evidah
              </h1>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 32px;">
              <p style="margin: 0 0 20px; color: #374151; font-size: 16px; line-height: 1.6;">
                Hi,
              </p>
              
              <p style="margin: 0 0 24px; color: #374151; font-size: 16px; line-height: 1.6;">
                I have a question and need your help. I'm not 100% certain about something and want to make sure I provide accurate information.
              </p>

              <!-- Question Details Box -->
              <table role="presentation" style="width: 100%; border-collapse: collapse; margin: 24px 0; background-color: #f9fafb; border-left: 4px solid ${urgencyInfo.color}; border-radius: 8px;">
                <tr>
                  <td style="padding: 20px;">
                    <p style="margin: 0 0 8px; color: #6b7280; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">
                      ${urgencyInfo.label}
                    </p>
                    
                    <p style="margin: 0 0 ${summary ? '16px' : '0'}; color: #111827; font-size: 16px; font-weight: 500; line-height: 1.5;">
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

              <p style="margin: 0 0 28px; color: #374151; font-size: 16px; line-height: 1.6;">
                Could you please help me understand how I should respond?
              </p>

              <!-- CTA Button -->
              <table role="presentation" style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td align="center">
                    <a href="${chatUrl}" style="display: inline-block; padding: 14px 28px; background-color: #7c3aed; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
                      Help ${employeeName} →
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin: 28px 0 0; color: #6b7280; font-size: 14px; line-height: 1.6; text-align: center;">
                I always escalate when I'm not certain to ensure accuracy.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 20px 32px; background-color: #f9fafb; border-radius: 0 0 12px 12px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0; color: #9ca3af; font-size: 12px;">
                ${companyName} | Powered by Evidah
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

    // Create in-app notification
    try {
      const { NotificationService } = await import('@/lib/services/notification-service');
      await NotificationService.create({
        uid,
        companyId,
        type: 'question',
        referenceId: chatId,
        title: 'New Question from AI Employee',
        message: reason,
      });
      console.log(`[NOTIFY QUESTION] ✅ In-app notification created for chat ${chatId}`);
    } catch (notifError) {
      console.error('[NOTIFY QUESTION] Failed to create in-app notification:', notifError);
      // Don't fail the request if notification creation fails
    }

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
