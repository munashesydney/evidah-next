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
    const limitStr = searchParams.get('limit') || '5';
    const limit = parseInt(limitStr, 10);

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
    
    // Generate date array
    const dateArray = generateDateArray(startDate, endDate);

    // Fetch page data (categories and articles)
    const categoriesRef = db.collection(
      `Users/${uid}/knowledgebases/${selectedCompany}/categories`
    );
    const categoriesSnapshot = await categoriesRef.get();

    interface PageData {
      id: string;
      link: string;
      pageViews: number;
    }

    const pageData: PageData[] = [{ id: 'index', link: 'index/', pageViews: 0 }];
    
    for (const categoryDoc of categoriesSnapshot.docs) {
      const categoryId = `category_${categoryDoc.id}`;
      const categoryLink = categoryDoc.data().link || '';
      
      pageData.push({ id: categoryId, link: categoryLink + '/', pageViews: 0 });
      
      const articlesRef = db.collection(
        `Users/${uid}/knowledgebases/${selectedCompany}/categories/${categoryDoc.id}/articles`
      );
      const articlesSnapshot = await articlesRef.get();
      
      for (const articleDoc of articlesSnapshot.docs) {
        const articleId = `article_${articleDoc.id}`;
        const articleLink = articleDoc.data().link || '';
        
        pageData.push({ id: articleId, link: articleLink, pageViews: 0 });
      }
    }

    // Fetch pageviews for each page
    let totalPageViews = 0;
    
    for (const page of pageData) {
      for (const date of dateArray) {
        const pageViewRef = db.doc(
          `Users/${uid}/knowledgebases/${selectedCompany}/metrics/pageViews/dates_${page.id}/${date}`
        );
        const pageViewSnap = await pageViewRef.get();
        if (pageViewSnap.exists) {
          const count = pageViewSnap.data()?.count || 0;
          page.pageViews += count;
          totalPageViews += count;
        }
      }
    }

    // Sort by pageviews and take top N
    const sortedPages = pageData
      .sort((a, b) => b.pageViews - a.pageViews)
      .slice(0, limit);

    // Calculate percentages
    const pagesWithPercentage = sortedPages.map(page => ({
      ...page,
      percentage: totalPageViews > 0 
        ? `${((page.pageViews / totalPageViews) * 100).toFixed(2)}%` 
        : '0%',
    }));

    return NextResponse.json(
      {
        success: true,
        data: pagesWithPercentage,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Error fetching top pages:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

