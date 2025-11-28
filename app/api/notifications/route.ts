import { NextRequest, NextResponse } from 'next/server';
import { NotificationService, NotificationType } from '@/lib/services/notification-service';

/**
 * GET /api/notifications
 * Get notifications for a user
 * 
 * Query params:
 * - uid: string (required)
 * - companyId: string (required)
 * - type: 'question' | 'ai_draft' (optional)
 * - unreadOnly: 'true' | 'false' (optional)
 * - limit: number (optional)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const uid = searchParams.get('uid');
    const companyId = searchParams.get('companyId');
    const type = searchParams.get('type') as NotificationType | null;
    const unreadOnly = searchParams.get('unreadOnly') === 'true';
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined;

    if (!uid || !companyId) {
      return NextResponse.json(
        { success: false, error: 'Missing uid or companyId' },
        { status: 400 }
      );
    }

    const notifications = await NotificationService.getNotifications(uid, companyId, {
      type: type || undefined,
      unreadOnly,
      limit,
    });

    return NextResponse.json({
      success: true,
      notifications,
    });
  } catch (error: any) {
    console.error('Error fetching notifications:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/notifications
 * Mark notification(s) as read
 * 
 * Body:
 * - notificationId: string (optional) - Mark specific notification as read
 * - uid: string (required if marking all)
 * - companyId: string (required if marking all)
 * - type: 'question' | 'ai_draft' (optional) - Mark all of type as read
 * - markAll: boolean (optional) - Mark all as read
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { notificationId, uid, companyId, type, markAll } = body;

    if (notificationId) {
      // Mark specific notification as read
      await NotificationService.markAsRead(notificationId);
      return NextResponse.json({ success: true });
    }

    if (markAll && uid && companyId) {
      // Mark all notifications as read
      const count = await NotificationService.markAllAsRead(uid, companyId, type);
      return NextResponse.json({ success: true, count });
    }

    return NextResponse.json(
      { success: false, error: 'Invalid request' },
      { status: 400 }
    );
  } catch (error: any) {
    console.error('Error marking notifications as read:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/notifications
 * Delete notification(s)
 * 
 * Body:
 * - notificationId: string (optional) - Delete specific notification
 * - uid: string (required if deleting by reference)
 * - companyId: string (required if deleting by reference)
 * - referenceId: string (optional) - Delete all notifications for a reference
 */
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { notificationId, uid, companyId, referenceId } = body;

    if (notificationId) {
      // Delete specific notification
      await NotificationService.delete(notificationId);
      return NextResponse.json({ success: true });
    }

    if (referenceId && uid && companyId) {
      // Delete all notifications for a reference
      const count = await NotificationService.deleteByReference(uid, companyId, referenceId);
      return NextResponse.json({ success: true, count });
    }

    return NextResponse.json(
      { success: false, error: 'Invalid request' },
      { status: 400 }
    );
  } catch (error: any) {
    console.error('Error deleting notifications:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
