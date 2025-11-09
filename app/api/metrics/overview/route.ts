import { NextRequest, NextResponse } from 'next/server';
import { getFirestore } from 'firebase-admin/firestore';
import admin from 'firebase-admin';
import { parse, format, subDays } from 'date-fns';

// Initialize Firebase Admin if not already initialized
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

// Helper to parse date string
const parseDate = (dateStr: string) => {
  try {
    return parse(dateStr, 'yyyy-MM-dd', new Date());
  } catch {
    return new Date(dateStr);
  }
};

// Helper to generate date array
const generateDateArray = (startDate: Date, endDate: Date): string[] => {
  const dates: string[] = [];
  let currentDate = new Date(startDate);
  
  while (currentDate <= endDate) {
    dates.push(format(currentDate, 'yyyy-MM-dd'));
    currentDate = subDays(currentDate, -1); // Add 1 day
  }
  
  return dates;
};

// Helper to format duration
const formatDuration = (seconds: number): string => {
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.round(seconds % 60);
  return `${minutes}m ${remainingSeconds}s`;
};

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const uid = searchParams.get('uid');
    const selectedCompany = searchParams.get('selectedCompany') || 'default';
    const startDateStr = searchParams.get('startDate');
    const endDateStr = searchParams.get('endDate');

    if (!uid) {
      return NextResponse.json(
        { success: false, error: 'User ID is required' },
        { status: 400 }
      );
    }

    if (!startDateStr || !endDateStr) {
      return NextResponse.json(
        { success: false, error: 'Start date and end date are required' },
        { status: 400 }
      );
    }

    const db = getFirestore();
    const startDate = parseDate(startDateStr);
    const endDate = parseDate(endDateStr);

    // Generate date array (removed previous period for speed)
    const dateArray = generateDateArray(startDate, endDate);

    // Fetch page IDs first
    const categoriesRef = db.collection(
      `Users/${uid}/knowledgebases/${selectedCompany}/categories`
    );
    const categoriesSnapshot = await categoriesRef.get();

    const pageIds: string[] = ['index'];
    
    for (const categoryDoc of categoriesSnapshot.docs) {
      pageIds.push(`category_${categoryDoc.id}`);
      
      const articlesRef = db.collection(
        `Users/${uid}/knowledgebases/${selectedCompany}/categories/${categoryDoc.id}/articles`
      );
      const articlesSnapshot = await articlesRef.get();
      
      for (const articleDoc of articlesSnapshot.docs) {
        pageIds.push(`article_${articleDoc.id}`);
      }
    }

    // Aggregate current period stats
    let uniqueVisitors = 0;
    let totalPageViews = 0;
    let totalSessions = 0;
    let totalDuration = 0;

    // Fetch unique visitors for current period
    for (const date of dateArray) {
      const docRef = db.doc(
        `Users/${uid}/knowledgebases/${selectedCompany}/metrics/overallUniqueVisitors/byDates/${date}`
      );
      const docSnap = await docRef.get();
      if (docSnap.exists) {
        uniqueVisitors += docSnap.data()?.count || 0;
      }
    }

    // Fetch pageviews and sessions for current period
    for (const pageId of pageIds) {
      for (const date of dateArray) {
        // Page views
        const pageViewRef = db.doc(
          `Users/${uid}/knowledgebases/${selectedCompany}/metrics/pageViews/dates_${pageId}/${date}`
        );
        const pageViewSnap = await pageViewRef.get();
        if (pageViewSnap.exists) {
          totalPageViews += pageViewSnap.data()?.count || 0;
        }

        // Sessions
        const sessionRef = db.doc(
          `Users/${uid}/knowledgebases/${selectedCompany}/metrics/sessions/dates_${pageId}/${date}`
        );
        const sessionSnap = await sessionRef.get();
        if (sessionSnap.exists) {
          totalSessions += sessionSnap.data()?.count || 0;
          totalDuration += sessionSnap.data()?.totalDuration || 0;
        }
      }
    }

    const averageVisitDuration = totalSessions === 0 ? 0 : totalDuration / totalSessions / 1000;

    return NextResponse.json(
      {
        success: true,
        data: {
          uniqueVisitors,
          totalPageViews,
          totalSessions,
          averageVisitDuration: formatDuration(averageVisitDuration),
          averageVisitDurationRaw: averageVisitDuration,
          comparison: {
            uniqueVisitors: null,
            totalPageViews: null,
            totalSessions: null,
            averageVisitDuration: null,
          },
        },
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Error fetching metrics overview:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

