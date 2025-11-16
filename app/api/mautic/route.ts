import { NextRequest, NextResponse } from 'next/server';

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

interface MauticContactRequest {
  email: string;
  firstname?: string | null;
  lastname?: string | null;
  phone?: string | null;
  tags?: string[] | null;
  custom_fields?: Record<string, any> | null;
  segment_id?: number;
}

/**
 * POST /api/mautic
 * Adds a contact to Mautic and optionally adds them to a segment
 * 
 * Body parameters:
 * - email: Contact email (required)
 * - firstname: First name (optional)
 * - lastname: Last name (optional)
 * - phone: Phone number (optional)
 * - tags: Array of tags (optional)
 * - custom_fields: Object with custom field key-value pairs (optional)
 * - segment_id: Segment ID to add contact to (optional, defaults to 1)
 */
export async function POST(request: NextRequest) {
  try {
    const body: MauticContactRequest = await request.json();
    const {
      email,
      firstname = null,
      lastname = null,
      phone = null,
      tags = null,
      custom_fields = null,
      segment_id = 1,
    } = body;

    // Validate required fields
    if (!email) {
      return NextResponse.json(
        {
          success: false,
          error: 'Email is required',
        },
        { status: 400 }
      );
    }

    // Get Mautic configuration from environment variables
    const mautic_url = process.env.MAUTIC_URL;
    const mautic_public_key = process.env.MAUTIC_PUBLIC_KEY;
    const mautic_secret_key = process.env.MAUTIC_SECRET_KEY;

    if (!mautic_url || !mautic_public_key || !mautic_secret_key) {
      console.error('Mautic configuration is missing in environment variables');
      return NextResponse.json(
        {
          success: false,
          error: 'Mautic configuration is missing',
        },
        { status: 500 }
      );
    }

    // Create authentication headers
    const auth_string = `${mautic_public_key}:${mautic_secret_key}`;
    const auth_bytes = Buffer.from(auth_string, 'ascii');
    const base64_auth = auth_bytes.toString('base64');

    // Prepare headers with Basic authentication
    const headers = {
      Authorization: `Basic ${base64_auth}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };

    // 1. Prepare the contact endpoint URL
    const contact_api_url = `${mautic_url}/api/contacts/new`;

    // Prepare contact data
    const contact_data: any = {
      email: email,
    };

    // Add optional fields if provided
    if (firstname) {
      contact_data.firstname = firstname;
    }
    if (lastname) {
      contact_data.lastname = lastname;
    }
    if (phone) {
      contact_data.phone = phone;
    }
    if (tags && Array.isArray(tags)) {
      contact_data.tags = tags;
    }
    if (custom_fields && typeof custom_fields === 'object') {
      // Add custom fields to the contact data
      for (const [field_key, field_value] of Object.entries(custom_fields)) {
        contact_data[field_key] = field_value;
      }
    }

    // 2. Make the API request to create the contact
    const contact_response = await fetch(contact_api_url, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(contact_data),
    });

    // Process the contact creation response
    if (![200, 201].includes(contact_response.status)) {
      const errorText = await contact_response.text();
      console.error(`Mautic API error creating contact: ${errorText}`);
      return NextResponse.json(
        {
          success: false,
          status_code: contact_response.status,
          error: errorText,
        },
        { status: contact_response.status }
      );
    }

    // Successfully created contact
    const contact_data_response = await contact_response.json();
    const contact_id = contact_data_response?.contact?.id;

    if (!contact_id) {
      console.error('Contact created but could not retrieve contact ID');
      return NextResponse.json(
        {
          success: true,
          status_code: contact_response.status,
          contact: contact_data_response,
          segment_add: {
            success: false,
            error: 'Could not retrieve contact ID',
          },
        },
        {
          status: 200,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
          },
        }
      );
    }

    // 3. Now add the contact to the specified segment
    const segment_api_url = `${mautic_url}/api/segments/${segment_id}/contact/${contact_id}/add`;

    const segment_response = await fetch(segment_api_url, {
      method: 'POST',
      headers: headers,
    });

    // Process the segment addition response
    if ([200, 201].includes(segment_response.status)) {
      const segment_data = await segment_response.json();
      return NextResponse.json(
        {
          success: true,
          status_code: contact_response.status,
          contact: contact_data_response,
          segment_add: {
            success: true,
            segment_id: segment_id,
            response: segment_data,
          },
        },
        {
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
          },
        }
      );
    } else {
      const errorText = await segment_response.text();
      console.error(`Mautic API error adding to segment: ${errorText}`);
      return NextResponse.json(
        {
          success: true,
          status_code: contact_response.status,
          contact: contact_data_response,
          segment_add: {
            success: false,
            segment_id: segment_id,
            status_code: segment_response.status,
            error: errorText,
          },
        },
        {
          status: 200,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
          },
        }
      );
    }
  } catch (error: any) {
    console.error('Error adding contact to Mautic:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'An unexpected error occurred',
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

