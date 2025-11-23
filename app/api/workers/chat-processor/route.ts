import { NextRequest, NextResponse } from 'next/server';
import { JobQueueService } from '@/lib/services/job-queue-service';
import { processEmployeeChat } from '@/lib/chat/employee-processor';
import { ToolsState } from '@/stores/chat/useToolsStore';

/**
 * POST /api/workers/chat-processor
 * Background worker endpoint that processes pending chat jobs
 * This endpoint is called by Vercel Cron every 10 seconds
 * 
 * Security: Should be protected by Vercel Cron secret or API key
 * For now, we'll use a simple secret check via header
 */
export async function POST(request: NextRequest) {
  try {
    // Optional: Verify this is called by Vercel Cron or authorized source
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      // In production, you might want stricter auth
      // For now, allow if no secret is set (local dev) or if secret matches
      if (process.env.NODE_ENV === 'production' && !authHeader) {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        );
      }
    }

    console.log('[CHAT WORKER] Starting job processing...');

    // Fetch pending jobs (limit to prevent overload)
    const pendingJobs = await JobQueueService.getPendingJobs(10);
    
    if (pendingJobs.length === 0) {
      console.log('[CHAT WORKER] No pending jobs found');
      return NextResponse.json({
        processed: 0,
        message: 'No pending jobs',
      });
    }

    console.log(`[CHAT WORKER] Found ${pendingJobs.length} pending jobs`);

    const results = {
      processed: 0,
      completed: 0,
      failed: 0,
      errors: [] as string[],
    };

    // Process each job
    for (const job of pendingJobs) {
      try {
        console.log(`[CHAT WORKER] Processing job ${job.id} for chat ${job.chatId}`);

        // Mark job as processing
        await JobQueueService.markAsProcessing(
          job.userId,
          job.companyId,
          job.id
        );

        // Process the chat with autonomous loop
        // Use onStream to write updates to Firestore for real-time frontend updates
        const result = await processEmployeeChat(job.messages, {
          chatId: job.chatId,
          companyId: job.companyId,
          uid: job.userId,
          employeeId: job.employeeId,
          personalityLevel: job.personalityLevel,
          maxIterations: 10,
          toolsState: job.toolsState as ToolsState | undefined,
          onStream: async (event) => {
            // Write streaming updates to Firestore for real-time frontend updates
            try {
              // Validate event before writing
              if (!event || !event.type) {
                console.warn('[CHAT WORKER] Invalid stream event received:', event);
                return;
              }
              
              await JobQueueService.writeStreamingUpdate(
                job.userId,
                job.companyId,
                job.id,
                event
              );
            } catch (error) {
              // Log but don't fail the job if streaming update fails
              console.error(`[CHAT WORKER] Failed to write streaming update:`, error);
              // Don't rethrow - we want the job to continue even if streaming fails
            }
          },
        });

        if (result.success) {
          // Mark job as completed
          await JobQueueService.markAsCompleted(
            job.userId,
            job.companyId,
            job.id,
            result.messagesSaved
          );

          results.completed++;
          console.log(`[CHAT WORKER] ✅ Job ${job.id} completed - ${result.messagesSaved} messages saved`);
        } else {
          // Mark job as failed
          const errorMessage = result.error || 'Unknown error';
          await JobQueueService.markAsFailed(
            job.userId,
            job.companyId,
            job.id,
            errorMessage,
            (job.retryCount || 0) + 1
          );

          results.failed++;
          results.errors.push(`Job ${job.id}: ${errorMessage}`);
          console.error(`[CHAT WORKER] ❌ Job ${job.id} failed: ${errorMessage}`);

          // Optionally retry failed jobs (if retry count < max)
          const maxRetries = 3;
          if ((job.retryCount || 0) < maxRetries) {
            try {
              await JobQueueService.retryJob(
                job.userId,
                job.companyId,
                job.id
              );
              console.log(`[CHAT WORKER] 🔄 Retrying job ${job.id} (attempt ${(job.retryCount || 0) + 1}/${maxRetries})`);
            } catch (retryError) {
              console.error(`[CHAT WORKER] Failed to retry job ${job.id}:`, retryError);
            }
          }
        }

        results.processed++;
      } catch (error) {
        // Handle unexpected errors
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        
        try {
          await JobQueueService.markAsFailed(
            job.userId,
            job.companyId,
            job.id,
            errorMessage,
            (job.retryCount || 0) + 1
          );
        } catch (updateError) {
          console.error(`[CHAT WORKER] Failed to update job ${job.id} status:`, updateError);
        }

        results.failed++;
        results.errors.push(`Job ${job.id}: ${errorMessage}`);
        console.error(`[CHAT WORKER] ❌ Error processing job ${job.id}:`, error);

        // Optionally retry
        const maxRetries = 3;
        if ((job.retryCount || 0) < maxRetries) {
          try {
            await JobQueueService.retryJob(
              job.userId,
              job.companyId,
              job.id
            );
            console.log(`[CHAT WORKER] 🔄 Retrying job ${job.id} after error`);
          } catch (retryError) {
            console.error(`[CHAT WORKER] Failed to retry job ${job.id}:`, retryError);
          }
        }
      }
    }

    console.log(`[CHAT WORKER] ✅ Processing complete - ${results.processed} processed, ${results.completed} completed, ${results.failed} failed`);

    return NextResponse.json({
      processed: results.processed,
      completed: results.completed,
      failed: results.failed,
      errors: results.errors.length > 0 ? results.errors : undefined,
    });
  } catch (error) {
    console.error('[CHAT WORKER] Fatal error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/workers/chat-processor
 * Health check endpoint
 */
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    service: 'chat-processor-worker',
    timestamp: new Date().toISOString(),
  });
}

