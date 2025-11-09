import { NextRequest, NextResponse } from 'next/server';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

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

const auth = getAuth();

export interface AuthenticatedRequest extends NextRequest {
  userId?: string;
  userEmail?: string;
}

/**
 * Verify Firebase Auth token from request headers
 */
export async function verifyAuthToken(
  request: NextRequest
): Promise<{ userId: string; userEmail: string } | null> {
  try {
    // Get token from Authorization header
    const authHeader = request.headers.get('Authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify the token
    const decodedToken = await auth.verifyIdToken(token);
    
    return {
      userId: decodedToken.uid,
      userEmail: decodedToken.email || '',
    };
  } catch (error) {
    console.error('Error verifying auth token:', error);
    return null;
  }
}

/**
 * Middleware to require authentication
 * Returns 401 if not authenticated
 */
export async function requireAuth(
  request: NextRequest
): Promise<{ userId: string; userEmail: string } | NextResponse> {
  const authData = await verifyAuthToken(request);

  if (!authData) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'AUTH_REQUIRED',
          message: 'Authentication required. Please provide a valid Firebase Auth token.',
        },
      },
      { status: 401 }
    );
  }

  return authData;
}

/**
 * Create error response with consistent format
 */
export function createErrorResponse(
  code: string,
  message: string,
  status: number,
  details?: any
) {
  return NextResponse.json(
    {
      success: false,
      error: {
        code,
        message,
        ...(details && { details }),
      },
    },
    { status }
  );
}

/**
 * Create success response with consistent format
 */
export function createSuccessResponse(data: any, status: number = 200) {
  return NextResponse.json(
    {
      success: true,
      ...data,
    },
    { status }
  );
}
