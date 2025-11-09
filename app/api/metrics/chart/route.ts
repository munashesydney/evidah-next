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

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const uid = searchParams.get('uid');
    const selectedCompany = searchParams.get('selectedCompany') || 'default';
    const startDateStr = searchParams.get('startDate');
    const endDateStr = searchParams.get('endDate');
    const includePrevious = searchParams.get('includePrevious') === 'true';

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
    
    // Generate date array for current period
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

    // Initialize daily pageviews
    const dailyPageViews: { [key: string]: number } = {};
    dateArray.forEach(date => {
      dailyPageViews[date] = 0;
    });

    // Fetch pageviews for current period
    for (const pageId of pageIds) {
      for (const date of dateArray) {
        const pageViewRef = db.doc(
          `Users/${uid}/knowledgebases/${selectedCompany}/metrics/pageViews/dates_${pageId}/${date}`
        );
        const pageViewSnap = await pageViewRef.get();
        if (pageViewSnap.exists) {
          dailyPageViews[date] += pageViewSnap.data()?.count || 0;
        }
      }
    }

    const currentData = dateArray.map(date => dailyPageViews[date]);

    let previousData: number[] | null = null;

    // Optionally fetch previous period data
    if (includePrevious) {
      const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      const prevEndDate = subDays(startDate, 1);
      const prevStartDate = subDays(prevEndDate, daysDiff - 1);
      const prevDateArray = generateDateArray(prevStartDate, prevEndDate);

      const prevDailyPageViews: { [key: string]: number } = {};
      prevDateArray.forEach(date => {
        prevDailyPageViews[date] = 0;
      });

      // Fetch pageviews for previous period
      for (const pageId of pageIds) {
        for (const date of prevDateArray) {
          const pageViewRef = db.doc(
            `Users/${uid}/knowledgebases/${selectedCompany}/metrics/pageViews/dates_${pageId}/${date}`
          );
          const pageViewSnap = await pageViewRef.get();
          if (pageViewSnap.exists) {
            prevDailyPageViews[date] += pageViewSnap.data()?.count || 0;
          }
        }
      }

      previousData = prevDateArray.map(date => prevDailyPageViews[date]);
    }

    return NextResponse.json(
      {
        success: true,
        data: {
          labels: dateArray,
          current: currentData,
          previous: previousData,
        },
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Error fetching chart data:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

