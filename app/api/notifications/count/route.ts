import { NextRequest, NextResponse } from 'next/server';
import { NotificationService, NotificationType } from '@/lib/services/notification-service';

/**
 * GET /api/notifications/count
 * Get unread notification counts
 * 
 * Query params:
 * - uid: string (required)
 * - companyId: string (required)
 * - type: 'question' | 'ai_draft' (optional) - Get count for specific type
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const uid = searchParams.get('uid');
    const companyId = searchParams.get('companyId');
    const type = searchParams.get('type') as NotificationType | null;

    if (!uid || !companyId) {
      return NextResponse.json(
        { success: false, error: 'Missing uid or companyId' },
        { status: 400 }
      );
    }

    if (type) {
      // Get count for specific type
      const count = await NotificationService.getUnreadCount(uid, companyId, type);
      return NextResponse.json({
        success: true,
        count,
        type,
      });
    }

    // Get counts for all types
    const [questionCount, draftCount, totalCount] = await Promise.all([
      NotificationService.getUnreadCount(uid, companyId, 'question'),
      NotificationService.getUnreadCount(uid, companyId, 'ai_draft'),
      NotificationService.getUnreadCount(uid, companyId),
    ]);

    return NextResponse.json({
      success: true,
      counts: {
        question: questionCount,
        ai_draft: draftCount,
        total: totalCount,
      },
    });
  } catch (error: any) {
    console.error('Error fetching notification counts:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
