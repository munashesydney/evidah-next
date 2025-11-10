import OpenAI from 'openai';
import { getFirestore } from 'firebase-admin/firestore';
import { initializeApp, getApps, cert } from 'firebase-admin/app';

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

const CACHE_EXPIRY_TIME = 60 * 60 * 1000; // 1 hour

/**
 * Sanitize selectedCompany for vector store naming
 */
function sanitizeCompanyName(company: string): string {
  return company.replace(/[^a-z0-9_-]/gi, '_');
}

/**
 * Generate vector store name
 */
function getVectorStoreName(uid: string, selectedCompany: string): string {
  const sanitized = sanitizeCompanyName(selectedCompany || 'default');
  return `kb_${uid}_${sanitized}`;
}

/**
 * Check if cache is valid
 */
function isCacheValid(timestamp: number | undefined): boolean {
  if (!timestamp) return false;
  return Date.now() - timestamp < CACHE_EXPIRY_TIME;
}

/**
 * Get or create vector store for a company
 * Caches the vector store ID in Firestore for performance
 */
export async function getOrCreateVectorStore(
  uid: string,
  selectedCompany: string = 'default'
): Promise<string> {
  const vsName = getVectorStoreName(uid, selectedCompany);

  // Check Firestore cache first
  try {
    const cacheDoc = await db.collection('vectorStoreCache').doc(vsName).get();
    if (cacheDoc.exists) {
      const cacheData = cacheDoc.data();
      if (cacheData?.id && isCacheValid(cacheData.lastSync)) {
        console.log(`[VECTOR STORE] Using cached vector store: ${vsName} (${cacheData.id})`);
        return cacheData.id;
      }
    }
  } catch (error) {
    console.warn(`[VECTOR STORE] Error reading cache for ${vsName}:`, error);
  }

  try {
    // Try to find existing vector store
    const vectorStores = await openai.vectorStores.list({ limit: 50 });
    const existing = vectorStores.data.find((vs) => vs.name === vsName);

    if (existing?.id) {
      console.log(`[VECTOR STORE] Found existing vector store: ${vsName} (${existing.id})`);
      // Update cache
      await db.collection('vectorStoreCache').doc(vsName).set({
        id: existing.id,
        lastSync: Date.now(),
      });
      return existing.id;
    }

    // Create new vector store
    console.log(`[VECTOR STORE] Creating new vector store: ${vsName}`);
    const created = await openai.vectorStores.create({ name: vsName });

    if (!created.id) {
      throw new Error('Vector store create did not return id');
    }

    // Update cache
    await db.collection('vectorStoreCache').doc(vsName).set({
      id: created.id,
      lastSync: Date.now(),
    });

    console.log(`[VECTOR STORE] Created vector store: ${vsName} (${created.id})`);
    return created.id;
  } catch (error) {
    console.error(`[VECTOR STORE] Error managing vector store ${vsName}:`, error);
    throw error;
  }
}

/**
 * Clear all files from a vector store
 * This prevents duplicate files from accumulating on each refresh
 */
export async function clearVectorStoreFiles(vectorStoreId: string): Promise<void> {
  try {
    // List all files in the vector store
    const filesList = await openai.vectorStores.files.list(vectorStoreId);
    const files = filesList.data || [];

    if (files.length === 0) {
      console.log(`[VECTOR STORE] No existing files to remove`);
      return;
    }

    console.log(`[VECTOR STORE] Found ${files.length} existing files to remove`);

    // Delete each file from the vector store
    const deletePromises = files.map(async (file) => {
      try {
        await openai.vectorStores.files.delete(file.id, {
          vector_store_id: vectorStoreId,
        });
        console.log(`[VECTOR STORE] Removed file: ${file.id}`);
      } catch (error: any) {
        console.warn(`[VECTOR STORE] Failed to remove file ${file.id}:`, error.message);
      }
    });

    await Promise.all(deletePromises);
    console.log(`[VECTOR STORE] Finished removing old files`);
  } catch (error: any) {
    console.error(`[VECTOR STORE] Error removing files from vector store:`, error.message);
    // Don't throw - continue with sync even if removal fails
  }
}

/**
 * Check the status of a file in the vector store
 */
async function getVectorStoreFileStatus(
  vectorStoreId: string,
  fileId: string
): Promise<any> {
  try {
    const fileStatus = await openai.vectorStores.files.retrieve(fileId, {
      vector_store_id: vectorStoreId,
    });
    return fileStatus;
  } catch (error: any) {
    console.error(`[VECTOR STORE] Error getting file status for ${fileId}:`, error.message);
    throw error;
  }
}

/**
 * Wait for a file to be fully indexed in the vector store
 */
export async function waitForFileIndexing(
  vectorStoreId: string,
  fileId: string,
  maxWaitTime: number = 5 * 60 * 1000, // 5 minutes
  pollInterval: number = 3000 // 3 seconds
): Promise<{ success: boolean; status: string; fileId: string; duration: number }> {
  const startTime = Date.now();
  let attempts = 0;

  console.log(`[VECTOR STORE] Waiting for file ${fileId} to be indexed in vector store ${vectorStoreId}`);

  while (Date.now() - startTime < maxWaitTime) {
    attempts++;

    try {
      const fileStatus = await getVectorStoreFileStatus(vectorStoreId, fileId);

      console.log(`[VECTOR STORE] File ${fileId} status check #${attempts}: ${fileStatus.status}`);

      if (fileStatus.status === 'completed') {
        const duration = Date.now() - startTime;
        console.log(`[VECTOR STORE] ✅ File ${fileId} indexed successfully in ${duration}ms (${attempts} checks)`);
        return {
          success: true,
          status: 'completed',
          fileId: fileId,
          duration: duration,
        };
      }

      if (fileStatus.status === 'failed') {
        console.error(`[VECTOR STORE] ❌ File ${fileId} indexing failed:`, fileStatus.last_error);
        return {
          success: false,
          status: 'failed',
          fileId: fileId,
          duration: Date.now() - startTime,
        };
      }

      // Status is 'in_progress' or other, continue polling
      if (fileStatus.status === 'in_progress') {
        console.log(
          `[VECTOR STORE] File ${fileId} still indexing... (${Math.round((Date.now() - startTime) / 1000)}s elapsed)`
        );
      }
    } catch (error: any) {
      console.error(`[VECTOR STORE] Error checking file status (attempt ${attempts}):`, error.message);
      // Continue polling even if there's an error
    }

    // Wait before next poll
    await new Promise((resolve) => setTimeout(resolve, pollInterval));
  }

  // Timeout reached
  const duration = Date.now() - startTime;
  console.warn(
    `[VECTOR STORE] ⏱️ Timeout waiting for file ${fileId} to index (${duration}ms, ${attempts} attempts)`
  );
  return {
    success: false,
    status: 'timeout',
    fileId: fileId,
    duration: duration,
  };
}

/**
 * Wait for multiple files to be indexed
 */
export async function waitForAllFilesIndexing(
  vectorStoreId: string,
  fileIds: string[],
  maxWaitTime: number = 5 * 60 * 1000
): Promise<{
  total: number;
  completed: number;
  failed: number;
  timedOut: number;
  duration: number;
  allSuccessful: boolean;
}> {
  console.log(`[VECTOR STORE] Waiting for ${fileIds.length} files to be indexed`);

  const results = await Promise.all(
    fileIds.map((fileId) => waitForFileIndexing(vectorStoreId, fileId, maxWaitTime))
  );

  const completed = results.filter((r) => r.success && r.status === 'completed');
  const failed = results.filter((r) => !r.success && r.status === 'failed');
  const timedOut = results.filter((r) => !r.success && r.status === 'timeout');

  const totalDuration = Math.max(...results.map((r) => r.duration));

  console.log(
    `[VECTOR STORE] Indexing complete: ${completed.length} succeeded, ${failed.length} failed, ${timedOut.length} timed out`
  );

  return {
    total: fileIds.length,
    completed: completed.length,
    failed: failed.length,
    timedOut: timedOut.length,
    duration: totalDuration,
    allSuccessful: completed.length === fileIds.length,
  };
}

/**
 * Clear cache for a specific user/company
 */
export async function clearVectorStoreCache(uid: string, selectedCompany: string = 'default'): Promise<void> {
  const vsName = getVectorStoreName(uid, selectedCompany);

  try {
    await db.collection('vectorStoreCache').doc(vsName).delete();
    console.log(`[VECTOR STORE] Cleared cache for ${vsName}`);
  } catch (error: any) {
    console.warn(`[VECTOR STORE] Error clearing cache for ${vsName}:`, error.message);
  }
}

/**
 * Verify that a vector store has files
 */
export async function verifyVectorStoreHasFiles(vectorStoreId: string): Promise<boolean> {
  try {
    console.log(`[VECTOR STORE] Verifying files in vector store: ${vectorStoreId}`);
    const filesList = await openai.vectorStores.files.list(vectorStoreId, { limit: 100 });
    const files = filesList.data || [];
    const completedFiles = files.filter((f: any) => f.status === 'completed');
    const inProgressFiles = files.filter((f: any) => f.status === 'in_progress');
    const failedFiles = files.filter((f: any) => f.status === 'failed');
    
    console.log(`[VECTOR STORE] Vector store ${vectorStoreId} file status:`);
    console.log(`[VECTOR STORE]   - Total files: ${files.length}`);
    console.log(`[VECTOR STORE]   - Completed: ${completedFiles.length}`);
    console.log(`[VECTOR STORE]   - In progress: ${inProgressFiles.length}`);
    console.log(`[VECTOR STORE]   - Failed: ${failedFiles.length}`);
    
    if (files.length > 0) {
      files.forEach((file: any) => {
        console.log(`[VECTOR STORE]   - File ${file.id}: status=${file.status}, created_at=${file.created_at}`);
      });
    } else {
      console.warn(`[VECTOR STORE] ⚠️ Vector store ${vectorStoreId} has NO files!`);
    }
    
    const hasCompletedFiles = completedFiles.length > 0;
    console.log(`[VECTOR STORE] Verification result: ${hasCompletedFiles ? '✅ HAS FILES' : '❌ NO FILES'}`);
    
    return hasCompletedFiles;
  } catch (error: any) {
    console.error(`[VECTOR STORE] ❌ Error verifying files in vector store ${vectorStoreId}:`, error.message);
    console.error(`[VECTOR STORE] Error details:`, error);
    return false;
  }
}

