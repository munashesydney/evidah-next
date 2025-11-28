import { NextRequest, NextResponse } from 'next/server';
import { NotificationService, NotificationType } from '@/lib/services/notification-service';

/**
 * POST /api/notifications/create
 * Create a new notification (can be called from external services)
 * 
 * Body:
 * - uid: string (required)
 * - companyId: string (required)
 * - type: 'question' | 'ai_draft' | 'inbox' (required)
 * - referenceId: string (required) - ID of the question/draft/ticket
 * - title: string (required)
 * - message: string (required)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { uid, companyId, type, referenceId, title, message } = body;

    if (!uid || !companyId || !type || !referenceId || !title || !message) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate type
    const validTypes: NotificationType[] = ['question', 'ai_draft', 'inbox'];
    if (!validTypes.includes(type)) {
      return NextResponse.json(
        { success: false, error: 'Invalid notification type' },
        { status: 400 }
      );
    }

    // Check if notification already exists for this reference
    const exists = await NotificationService.existsForReference(uid, companyId, referenceId);
    
    if (exists) {
      return NextResponse.json({
        success: true,
        message: 'Notification already exists',
        duplicate: true,
      });
    }

    const notification = await NotificationService.create({
      uid,
      companyId,
      type,
      referenceId,
      title,
      message,
    });

    return NextResponse.json({
      success: true,
      notification,
    });
  } catch (error: any) {
    console.error('Error creating notification:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
