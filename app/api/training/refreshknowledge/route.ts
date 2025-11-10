import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { getFirestore } from 'firebase-admin/firestore';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { generateArticlesTXTContent } from '@/lib/services/knowledge-base-helpers';
import {
  getOrCreateVectorStore,
  clearVectorStoreFiles,
  waitForAllFilesIndexing,
  clearVectorStoreCache,
} from '@/lib/services/vector-store-helper';

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
const openai = new OpenAI();

/**
 * Upload TXT content to OpenAI
 * Uses the same pattern as /api/chat/vector_stores/upload_file
 */
async function uploadTXTToOpenAI(content: string, fileName: string): Promise<string> {
  // Convert string to buffer (same as existing upload_file route)
  const fileBuffer = Buffer.from(content, 'utf-8');
  const fileBlob = new Blob([fileBuffer], {
    type: 'text/plain',
  });

  const file = await openai.files.create({
    file: new File([fileBlob], fileName),
    purpose: 'assistants',
  });

  return file.id;
}

/**
 * Update trainingDataFileId in knowledge base doc
 */
async function updateTrainingDataFileId(
  uid: string,
  selectedCompany: string,
  fileId: string
): Promise<void> {
  try {
    const kbRef = db
      .collection('Users')
      .doc(uid)
      .collection('knowledgebases')
      .doc(selectedCompany);

    await kbRef.update({ trainingDataFileId: fileId });
    console.log(`[REFRESH KB] Updated trainingDataFileId: ${fileId}`);
  } catch (error: any) {
    console.warn(`[REFRESH KB] Error updating trainingDataFileId:`, error.message);
    // Don't throw - this is optional tracking
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      uid,
      selectedCompany = 'default',
      forceRefresh = false,
      waitForIndexing = true,
    } = body;

    // Validate required parameters
    if (!uid) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_PARAMS',
            message: 'uid is required',
            details: { uid: !!uid },
          },
        },
        { status: 400 }
      );
    }

    // Generate a refresh ID for tracking
    const refreshId = `refresh_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const startTime = Date.now();

    console.log(
      `[REFRESH KB] Starting refresh for ${uid}/${selectedCompany} (refreshId: ${refreshId}, waitForIndexing: ${waitForIndexing})`
    );

    // Step 1: Generate articles TXT content (in-memory)
    console.log(`[REFRESH KB] Step 1/5: Generating articles TXT content...`);
    const txtContent = await generateArticlesTXTContent(uid, selectedCompany);
    console.log(`[REFRESH KB] Articles TXT content generated (${txtContent.length} chars)`);

    // Step 2: Upload to OpenAI files
    console.log(`[REFRESH KB] Step 2/5: Uploading training data file to OpenAI...`);
    const fileName = `KB_${uid}_${selectedCompany}.txt`;
    let fileId: string;

    try {
      fileId = await uploadTXTToOpenAI(txtContent, fileName);
      console.log(`[REFRESH KB] Training data file uploaded successfully: ${fileId}`);

      // Update trainingDataFileId in knowledge base doc (optional tracking)
      await updateTrainingDataFileId(uid, selectedCompany, fileId);
    } catch (error: any) {
      console.error('[REFRESH KB] Error uploading file:', error);
      return NextResponse.json(
        {
          success: false,
          status: 'failed',
          error: {
            code: 'UPLOAD_FAILED',
            message: 'Training data file upload to OpenAI failed',
            details: error.message,
          },
          refreshId: refreshId,
        },
        { status: 200 }
      );
    }

    // Step 3: Get or create vector store
    console.log(`[REFRESH KB] Step 3/5: Getting or creating vector store...`);
    let vectorStoreId: string;

    try {
      vectorStoreId = await getOrCreateVectorStore(uid, selectedCompany);
      console.log(`[REFRESH KB] Vector store ready: ${vectorStoreId}`);
    } catch (error: any) {
      console.error('[REFRESH KB] Error getting vector store:', error);
      return NextResponse.json(
        {
          success: false,
          status: 'failed',
          error: {
            code: 'VECTOR_STORE_ERROR',
            message: 'Failed to get or create vector store',
            details: error.message,
          },
          refreshId: refreshId,
        },
        { status: 200 }
      );
    }

    // Step 4: Always clear existing files from vector store before adding new one
    // This prevents duplicate files and ensures clean state
    console.log(`[REFRESH KB] Step 4/5: Clearing existing files from vector store...`);
    try {
      await clearVectorStoreFiles(vectorStoreId);
      console.log(`[REFRESH KB] Existing files cleared`);
    } catch (error: any) {
      console.warn(`[REFRESH KB] Warning: Could not clear existing files:`, error.message);
      // Continue anyway - might be first time or files already cleared
    }

    // Step 5: Add file to vector store
    console.log(`[REFRESH KB] Step 5/5: Adding file ${fileId} to vector store ${vectorStoreId}...`);
    try {
      const result = await openai.vectorStores.files.create(vectorStoreId, {
        file_id: fileId,
      });
      console.log(`[REFRESH KB] ✅ File added to vector store successfully:`, {
        fileId: fileId,
        vectorStoreId: vectorStoreId,
        result: result,
      });
      
      // Verify file was added by listing files
      const filesList = await openai.vectorStores.files.list(vectorStoreId);
      const files = filesList.data || [];
      console.log(`[REFRESH KB] Verification: Vector store now has ${files.length} file(s):`, 
        files.map((f: any) => ({ id: f.id, status: f.status }))
      );
    } catch (error: any) {
      console.error('[REFRESH KB] ❌ Error adding file to vector store:', error);
      return NextResponse.json(
        {
          success: false,
          status: 'failed',
          error: {
            code: 'ADD_FILE_ERROR',
            message: 'Failed to add file to vector store',
            details: error.message,
          },
          refreshId: refreshId,
        },
        { status: 200 }
      );
    }

    const totalDuration = Date.now() - startTime;

    // Step 6: Wait for indexing if requested
    let indexingStatus = null;
    if (waitForIndexing) {
      console.log(`[REFRESH KB] Waiting for file to be indexed...`);
      indexingStatus = await waitForAllFilesIndexing(vectorStoreId, [fileId]);

      if (indexingStatus.allSuccessful) {
        console.log(
          `[REFRESH KB] ✅ All ${indexingStatus.completed} files indexed successfully in ${indexingStatus.duration}ms`
        );
        return NextResponse.json({
          success: true,
          status: 'completed',
          message: `Knowledge base refreshed and indexed successfully! All ${indexingStatus.completed} files are ready for AI queries.`,
          refreshId: refreshId,
          syncedFiles: 1,
          indexing: {
            status: 'completed',
            total: indexingStatus.total,
            completed: indexingStatus.completed,
            failed: indexingStatus.failed,
            timedOut: indexingStatus.timedOut,
            duration: indexingStatus.duration,
          },
          totalDuration: totalDuration,
          readyForQueries: true,
        });
      } else {
        console.warn(
          `[REFRESH KB] ⚠️ Partial indexing success: ${indexingStatus.completed}/${indexingStatus.total} completed, ${indexingStatus.failed} failed, ${indexingStatus.timedOut} timed out`
        );
        return NextResponse.json({
          success: true,
          status: 'completed_with_warnings',
          message: `Knowledge base refreshed but some files are still indexing. ${indexingStatus.completed}/${indexingStatus.total} files ready. You can start querying, but some content may not be available yet.`,
          refreshId: refreshId,
          syncedFiles: 1,
          indexing: {
            status: 'partial',
            total: indexingStatus.total,
            completed: indexingStatus.completed,
            failed: indexingStatus.failed,
            timedOut: indexingStatus.timedOut,
            duration: indexingStatus.duration,
          },
          totalDuration: totalDuration,
          readyForQueries: indexingStatus.completed > 0,
          warning:
            indexingStatus.failed > 0
              ? `${indexingStatus.failed} files failed to index`
              : `${indexingStatus.timedOut} files still indexing`,
        });
      }
    } else {
      // No indexing wait
      console.log(`[REFRESH KB] Files synced without waiting for indexing`);
      return NextResponse.json({
        success: true,
        status: 'completed',
        message: `Knowledge base refreshed and 1 file synced to vector store.`,
        refreshId: refreshId,
        syncedFiles: 1,
        totalDuration: totalDuration,
        readyForQueries: true,
      });
    }
  } catch (error: any) {
    console.error('[REFRESH KB] Error:', error);
    return NextResponse.json(
      {
        success: false,
        status: 'failed',
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to refresh knowledge base',
          details: error.message,
        },
      },
      { status: 500 }
    );
  }
}

