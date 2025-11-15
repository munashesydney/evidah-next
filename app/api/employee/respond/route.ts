import { NextRequest, NextResponse } from 'next/server';
import { processEmployeeResponse } from '@/lib/public-assistant/processor';
import { EmployeeType } from '@/lib/public-assistant/prompts';

// Enable CORS for public access
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json();
    const {
      uid,
      companyId,
      employee,
      messages,
      context,
      maxSearchIterations,
      temperature,
      includeMetadata,
    } = body;

    // Validate required fields
    if (!uid) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'MISSING_UID',
            message: 'uid field is required',
          },
        },
        { status: 400 }
      );
    }

    if (!companyId) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'MISSING_COMPANY_ID',
            message: 'companyId field is required',
          },
        },
        { status: 400 }
      );
    }

    if (!employee) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'MISSING_EMPLOYEE',
            message: 'employee field is required',
          },
        },
        { status: 400 }
      );
    }

    if (!['marquavious', 'charlie'].includes(employee)) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_EMPLOYEE',
            message: 'employee must be either "marquavious" or "charlie"',
          },
        },
        { status: 400 }
      );
    }

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_MESSAGES',
            message: 'messages must be a non-empty array',
          },
        },
        { status: 400 }
      );
    }

    // Validate message format
    for (const msg of messages) {
      if (!msg.role || !['user', 'assistant'].includes(msg.role)) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'INVALID_MESSAGE_ROLE',
              message: 'Each message must have a role of "user" or "assistant"',
            },
          },
          { status: 400 }
        );
      }
      if (!msg.content || typeof msg.content !== 'string') {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'INVALID_MESSAGE_CONTENT',
              message: 'Each message must have a content string',
            },
          },
          { status: 400 }
        );
      }
    }

    console.log(`[EMPLOYEE API] Processing request for uid: ${uid}, company: ${companyId}, employee: ${employee}`);

    // Process the request with autonomous file search
    const result = await processEmployeeResponse(
      employee as EmployeeType,
      messages,
      companyId,
      uid,
      context,
      {
        maxSearchIterations,
        temperature,
        includeMetadata,
      }
    );

    console.log(`[EMPLOYEE API] Response generated successfully`);

    return NextResponse.json({
      success: true,
      data: result,
    }, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });

  } catch (error) {
    console.error('[EMPLOYEE API] Error:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'An unexpected error occurred',
          details: process.env.NODE_ENV === 'development' ? error : undefined,
        },
      },
      { 
        status: 500,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        },
      }
    );
  }
}
