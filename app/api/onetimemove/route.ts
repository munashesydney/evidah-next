import { NextResponse } from 'next/server';
import admin from 'firebase-admin';
import { getAuth } from 'firebase-admin/auth';

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
    databaseURL: process.env.FIREBASE_DATABASE_URL,
  });
}

const getBaseUrl = () => {
  const explicit = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (explicit) {
    return explicit.replace(/\/$/, '');
  }

  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) {
    const normalized = vercel.startsWith('http') ? vercel : `https://${vercel}`;
    return normalized.replace(/\/$/, '');
  }

  return 'http://localhost:3000';
};

interface MauticSyncResult {
  email: string;
  success: boolean;
  error?: string;
}

export async function GET() {
  const TARGET = 'sydneymach3@gmail.com';
  const auth = getAuth();
  const mauticEndpoint = `${getBaseUrl()}/api/mautic`;

  try {
    // 1) Get the target user to find its creation time
    const targetUser = await auth.getUserByEmail(TARGET);
    const targetCreated = new Date(targetUser.metadata.creationTime).getTime();

    let nextPageToken: string | undefined;
    const emailsAfter: string[] = [];

    // 2) Scan all users and filter based on creation timestamp
    do {
      const batch = await auth.listUsers(1000, nextPageToken);

      for (const user of batch.users) {
        if (!user.email) continue;

        const created = new Date(user.metadata.creationTime).getTime();

        // Only collect accounts created AFTER the target account
        if (created > targetCreated) {
          emailsAfter.push(user.email);
        }
      }

      nextPageToken = batch.pageToken;
    } while (nextPageToken);

    const mauticResults: MauticSyncResult[] = await Promise.all(
      emailsAfter.map(async (email) => {
        try {
          const response = await fetch(mauticEndpoint, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              email,
              firstname: 'there',
              lastname: 'there',
              segment_id: 9,
            }),
          });

          if (!response.ok) {
            const errorText = await response.text();
            throw new Error(
              errorText || `Mautic request failed with status ${response.status}`
            );
          }

          return { email, success: true };
        } catch (error: any) {
          console.error(`Failed to sync ${email} with Mautic`, error);
          return {
            email,
            success: false,
            error: error?.message ?? String(error),
          };
        }
      })
    );

    const successfulSyncs = mauticResults.filter((result) => result.success).length;

    return NextResponse.json({
      target: TARGET,
      targetCreationTime: targetUser.metadata.creationTime,
      count: emailsAfter.length,
      emails: emailsAfter,
      mauticSync: {
        attempted: emailsAfter.length,
        successful: successfulSyncs,
        failed: emailsAfter.length - successfulSyncs,
        endpoint: mauticEndpoint,
        results: mauticResults,
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? String(err) },
      { status: 500 }
    );
  }
}
