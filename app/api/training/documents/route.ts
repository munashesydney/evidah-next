import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { getFirestore } from 'firebase-admin/firestore';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getOrCreateVectorStore, waitForFileIndexing } from '@/lib/services/vector-store-helper';

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
 * Upload a document to OpenAI and add it to the vector store
 */
export async function POST(request: NextRequest) {
  try {
    const { uid, selectedCompany = 'default', fileData, fileName, fileType, fileSize } = await request.json();

    if (!uid) {
      return NextResponse.json({ success: false, error: 'Missing required parameter: uid' }, { status: 400 });
    }

    if (!fileData || !fileName) {
      return NextResponse.json({ success: false, error: 'Missing file data or file name' }, { status: 400 });
    }

    console.log(`[DOCUMENTS] Uploading document: ${fileName} for ${uid}/${selectedCompany}`);

    // Step 1: Convert base64 to file and upload to OpenAI
    let fileId: string;
    try {
      const fileBuffer = Buffer.from(fileData, 'base64');
      const fileBlob = new Blob([fileBuffer], { type: fileType || 'application/octet-stream' });
      
      const uploadedFile = await openai.files.create({
        file: new File([fileBlob], fileName),
        purpose: 'assistants',
      });

      fileId = uploadedFile.id;
      console.log(`[DOCUMENTS] File uploaded to OpenAI: ${fileId}`);
    } catch (error: any) {
      console.error('[DOCUMENTS] Error uploading file to OpenAI:', error);
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'UPLOAD_FAILED',
            message: 'Failed to upload file to OpenAI',
            details: error.message,
          },
        },
        { status: 500 }
      );
    }

    // Step 2: Get or create vector store
    let vectorStoreId: string;
    try {
      vectorStoreId = await getOrCreateVectorStore(uid, selectedCompany);
      console.log(`[DOCUMENTS] Vector store ready: ${vectorStoreId}`);
    } catch (error: any) {
      console.error('[DOCUMENTS] Error getting vector store:', error);
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VECTOR_STORE_ERROR',
            message: 'Failed to get or create vector store',
            details: error.message,
          },
        },
        { status: 500 }
      );
    }

    // Step 3: Add file to vector store
    try {
      await openai.vectorStores.files.create(vectorStoreId, {
        file_id: fileId,
      });
      console.log(`[DOCUMENTS] File ${fileId} added to vector store ${vectorStoreId}`);
    } catch (error: any) {
      console.error('[DOCUMENTS] Error adding file to vector store:', error);
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'ADD_TO_VECTOR_STORE_ERROR',
            message: 'Failed to add file to vector store',
            details: error.message,
          },
        },
        { status: 500 }
      );
    }

    // Step 4: Save document metadata to Firestore
    const documentData = {
      fileId,
      fileName,
      fileType: fileType || 'application/octet-stream',
      fileSize,
      vectorStoreId,
      uploadedAt: new Date().toISOString(),
      status: 'processing', // Will be updated when indexing completes
      useForTraining: true,
    };

    try {
      const docRef = db
        .collection('Users')
        .doc(uid)
        .collection('knowledgebases')
        .doc(selectedCompany)
        .collection('trainingDocuments')
        .doc(fileId);

      await docRef.set(documentData);
      console.log(`[DOCUMENTS] Document metadata saved to Firestore: ${fileId}`);
    } catch (error: any) {
      console.error('[DOCUMENTS] Error saving document metadata:', error);
      // Don't fail the request - file is already uploaded and added to vector store
    }

    // Step 5: Wait for indexing (optional, but good for UX)
    try {
      const indexingResult = await waitForFileIndexing(vectorStoreId, fileId, 30000); // 30 second timeout
      if (indexingResult.success) {
        // Update status in Firestore
        const docRef = db
          .collection('Users')
          .doc(uid)
          .collection('knowledgebases')
          .doc(selectedCompany)
          .collection('trainingDocuments')
          .doc(fileId);
        await docRef.update({ status: 'completed' });
        console.log(`[DOCUMENTS] File indexed successfully: ${fileId}`);
      } else {
        // Still mark as processing - will be checked later
        console.log(`[DOCUMENTS] File indexing in progress: ${fileId}`);
      }
    } catch (error: any) {
      console.warn('[DOCUMENTS] Error waiting for indexing:', error.message);
      // Continue anyway - file is added, just not indexed yet
    }

    return NextResponse.json({
      success: true,
      document: {
        id: fileId,
        ...documentData,
      },
    });
  } catch (error: any) {
    console.error('[DOCUMENTS] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to upload document',
          details: error.message,
        },
      },
      { status: 500 }
    );
  }
}

/**
 * Get all documents for a user/company
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const uid = searchParams.get('uid');
    const selectedCompany = searchParams.get('selectedCompany') || 'default';

    if (!uid) {
      return NextResponse.json({ success: false, error: 'Missing required parameter: uid' }, { status: 400 });
    }

    console.log(`[DOCUMENTS] Fetching documents for ${uid}/${selectedCompany}`);

    const documentsRef = db
      .collection('Users')
      .doc(uid)
      .collection('knowledgebases')
      .doc(selectedCompany)
      .collection('trainingDocuments');

    const snapshot = await documentsRef.get();
    const documents = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    console.log(`[DOCUMENTS] Found ${documents.length} documents`);

    return NextResponse.json({
      success: true,
      documents,
    });
  } catch (error: any) {
    console.error('[DOCUMENTS] Error fetching documents:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch documents',
          details: error.message,
        },
      },
      { status: 500 }
    );
  }
}

/**
 * Delete a document
 */
export async function DELETE(request: NextRequest) {
  try {
    const { uid, selectedCompany = 'default', fileId } = await request.json();

    if (!uid || !fileId) {
      return NextResponse.json(
        { success: false, error: 'Missing required parameters: uid and fileId' },
        { status: 400 }
      );
    }

    console.log(`[DOCUMENTS] Deleting document ${fileId} for ${uid}/${selectedCompany}`);

    // Step 1: Get document metadata from Firestore
    const docRef = db
      .collection('Users')
      .doc(uid)
      .collection('knowledgebases')
      .doc(selectedCompany)
      .collection('trainingDocuments')
      .doc(fileId);

    const docSnapshot = await docRef.get();
    if (!docSnapshot.exists) {
      return NextResponse.json({ success: false, error: 'Document not found' }, { status: 404 });
    }

    const documentData = docSnapshot.data();
    const vectorStoreId = documentData?.vectorStoreId;

    // Step 2: Remove file from vector store
    if (vectorStoreId) {
      try {
        await openai.vectorStores.files.delete(fileId, {
          vector_store_id: vectorStoreId,
        });
        console.log(`[DOCUMENTS] File ${fileId} removed from vector store ${vectorStoreId}`);
      } catch (error: any) {
        console.warn(`[DOCUMENTS] Error removing file from vector store:`, error.message);
        // Continue with deletion even if this fails
      }
    }

    // Step 3: Delete file from OpenAI (optional - OpenAI may keep it for other uses)
    try {
      await openai.files.delete(fileId);
      console.log(`[DOCUMENTS] File ${fileId} deleted from OpenAI`);
    } catch (error: any) {
      console.warn(`[DOCUMENTS] Error deleting file from OpenAI:`, error.message);
      // Continue with Firestore deletion
    }

    // Step 4: Delete document metadata from Firestore
    await docRef.delete();
    console.log(`[DOCUMENTS] Document metadata deleted from Firestore: ${fileId}`);

    return NextResponse.json({
      success: true,
      message: 'Document deleted successfully',
    });
  } catch (error: any) {
    console.error('[DOCUMENTS] Error deleting document:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to delete document',
          details: error.message,
        },
      },
      { status: 500 }
    );
  }
}

