import { NextRequest, NextResponse } from 'next/server';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';

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

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const uid = searchParams.get('uid');
    const agentEmail = searchParams.get('agentEmail'); // Optional: if provided, filter by agent access

    // Validation
    if (!uid) {
      return NextResponse.json(
        { error: 'Missing required parameter: uid' },
        { status: 400 }
      );
    }

    // If agentEmail is provided, only return workspaces where this agent has access
    if (agentEmail) {
      // Search for all workspaces where this agent exists
      // Note: collectionGroup searches across all AdditionalUsers, so we need to filter by uid in path
      const agentsSnapshot = await db
        .collectionGroup('AdditionalUsers')
        .where('userEmail', '==', agentEmail)
        .get();

      if (agentsSnapshot.empty) {
        return NextResponse.json({
          success: true,
          data: [],
        });
      }

      // Extract unique workspace IDs from agent documents that belong to this uid
      // Path structure: Users/{uid}/knowledgebases/{workspaceId}/AdditionalUsers/{agentId}
      const workspaceIds = new Set<string>();
      agentsSnapshot.docs.forEach((doc) => {
        // Get the full path and verify it belongs to the correct uid
        const pathParts = doc.ref.path.split('/');
        // Path format: Users/{uid}/knowledgebases/{workspaceId}/AdditionalUsers/{agentId}
        if (pathParts.length >= 4 && pathParts[0] === 'Users' && pathParts[1] === uid) {
          const workspaceId = pathParts[3]; // knowledgebases/{workspaceId}
          workspaceIds.add(workspaceId);
        }
      });

      if (workspaceIds.size === 0) {
        return NextResponse.json({
          success: true,
          data: [],
        });
      }

      // Fetch only the workspaces the agent has access to
      const companies: any[] = [];
      for (const workspaceId of workspaceIds) {
        const workspaceRef = db
          .collection('Users')
          .doc(uid)
          .collection('knowledgebases')
          .doc(workspaceId);
        
        const workspaceDoc = await workspaceRef.get();
        if (workspaceDoc.exists) {
          const data = workspaceDoc.data();
          companies.push({
            id: workspaceId,
            name: data?.name || workspaceId,
            ...data,
          });
        }
      }

      return NextResponse.json({
        success: true,
        data: companies,
      });
    }

    // Regular user (owner) - fetch all knowledge bases (companies) for the user
    const knowledgebasesRef = db
      .collection('Users')
      .doc(uid)
      .collection('knowledgebases');
    
    const snapshot = await knowledgebasesRef.get();

    if (snapshot.empty) {
      return NextResponse.json({
        success: true,
        data: [],
      });
    }

    const companies = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        name: data.name || doc.id,
        ...data,
      };
    });

    return NextResponse.json({
      success: true,
      data: companies,
    });
  } catch (error: any) {
    console.error('Error fetching companies:', error);
    return NextResponse.json(
      { error: 'Failed to fetch companies', details: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { uid, name, website, industry } = body;

    // Validation
    if (!uid) {
      return NextResponse.json(
        { error: 'Missing required parameter: uid' },
        { status: 400 }
      );
    }

    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: 'Workspace name is required' },
        { status: 400 }
      );
    }

    // Check if user document exists
    const userDocRef = db.collection('Users').doc(uid);
    const userDoc = await userDocRef.get();
    
    if (!userDoc.exists) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Generate a unique workspace ID (using timestamp + random string)
    const workspaceId = `workspace_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    // Create workspace document
    const workspaceRef = userDocRef.collection('knowledgebases').doc(workspaceId);
    
    const workspaceData: any = {
      name: name.trim(),
      website: website?.trim() || '',
      industry: industry?.trim() || '',
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      onboardingDone: false,
      // Default employee access (can be updated later)
      charlie: false,
      marquavious: false,
      emma: false,
      sungWen: false,
      evidahQ: false,
    };

    await workspaceRef.set(workspaceData);

    return NextResponse.json({
      success: true,
      data: {
        id: workspaceId,
        ...workspaceData,
      },
    });
  } catch (error: any) {
    console.error('Error creating workspace:', error);
    return NextResponse.json(
      { error: 'Failed to create workspace', details: error.message },
      { status: 500 }
    );
  }
}




