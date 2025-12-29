import { NextRequest, NextResponse } from 'next/server';
import { JobQueueService, ChatJob } from '@/lib/services/job-queue-service';
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
async function parseRequestBody(request: NextRequest) {
  try {
    const raw = await request.text();
    if (!raw) {
      return null;
    }
    return JSON.parse(raw);
  } catch (error) {
    console.warn('[CHAT WORKER] Failed to parse request body:', error);
    return null;
  }
}

async function processJob(job: ChatJob) {
  console.log(`[CHAT WORKER] Processing job ${job.id} for chat ${job.chatId}`);

  const outcome = {
    processed: 0,
    completed: 0,
    failed: 0,
    errors: [] as string[],
  };

  try {
    await JobQueueService.markAsProcessing(
      job.userId,
      job.companyId,
      job.id
    );

    const result = await processEmployeeChat(job.messages, {
      chatId: job.chatId,
      companyId: job.companyId,
      uid: job.userId,
      employeeId: job.employeeId,
      personalityLevel: job.personalityLevel,
      maxIterations: 10,
      toolsState: job.toolsState as ToolsState | undefined,
      onStream: async (event) => {
        try {
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
          console.error(`[CHAT WORKER] Failed to write streaming update:`, error);
        }
      },
    });

    if (result.success) {
      await JobQueueService.markAsCompleted(
        job.userId,
        job.companyId,
        job.id,
        result.messagesSaved
      );
      outcome.completed++;
      console.log(`[CHAT WORKER] ✅ Job ${job.id} completed - ${result.messagesSaved} messages saved`);
    } else {
      const errorMessage = result.error || 'Unknown error';
      await JobQueueService.markAsFailed(
        job.userId,
        job.companyId,
        job.id,
        errorMessage,
        (job.retryCount || 0) + 1
      );
      outcome.failed++;
      outcome.errors.push(`Job ${job.id}: ${errorMessage}`);
      console.error(`[CHAT WORKER] ❌ Job ${job.id} failed: ${errorMessage}`);

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

    outcome.processed++;
  } catch (error) {
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

    outcome.failed++;
    outcome.errors.push(`Job ${job.id}: ${errorMessage}`);
    console.error(`[CHAT WORKER] ❌ Error processing job ${job.id}:`, error);

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

  return outcome;
}

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

    const body = await parseRequestBody(request);
    let pendingJobs: ChatJob[] = [];

    if (body?.jobId && body?.userId && body?.companyId) {
      console.log(`[CHAT WORKER] Targeted job request received for ${body.jobId}`);
      const targetedJob = await JobQueueService.getJob(
        body.userId,
        body.companyId,
        body.jobId
      );

      if (!targetedJob) {
        console.warn(`[CHAT WORKER] Targeted job ${body.jobId} not found`);
      } else if (targetedJob.status !== 'pending') {
        console.log(`[CHAT WORKER] Targeted job ${body.jobId} is ${targetedJob.status}, skipping`);
      } else {
        pendingJobs = [targetedJob];
      }
    }

    if (pendingJobs.length === 0) {
      console.log('[CHAT WORKER] Starting job processing...');
      pendingJobs = await JobQueueService.getPendingJobs(10);
    }
    
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

    for (const job of pendingJobs) {
      const outcome = await processJob(job);
      results.processed += outcome.processed;
      results.completed += outcome.completed;
      results.failed += outcome.failed;
      if (outcome.errors.length) {
        results.errors.push(...outcome.errors);
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

