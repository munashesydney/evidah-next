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

export interface Article {
  id: string;
  categoryId: string;
  title: string;
  description?: string;
  link: string;
  rawText: string;
}

export interface Category {
  id: string;
  name: string;
  description?: string;
  link?: string;
}

/**
 * Get all articles for a company
 */
export async function getAllArticles(uid: string, selectedCompany: string = 'default'): Promise<Article[]> {
  const categoriesRef = db.collection(
    `Users/${uid}/knowledgebases/${selectedCompany}/categories`
  );
  const categoriesSnapshot = await categoriesRef.get();

  const articlesList: Article[] = [];

  const fetchArticlesPromises = categoriesSnapshot.docs.map(async (categoryDoc) => {
    const categoryId = categoryDoc.id;
    const articlesCollectionRef = db.collection(
      `Users/${uid}/knowledgebases/${selectedCompany}/categories/${categoryId}/articles`
    );
    const articlesSnapshot = await articlesCollectionRef.get();

    articlesSnapshot.forEach((articleDoc) => {
      const data = articleDoc.data();
      articlesList.push({
        id: articleDoc.id,
        categoryId: categoryId,
        title: data.title || '',
        description: data.description || '',
        link: data.link || '',
        rawText: data.rawText || data.content || '',
      });
    });
  });

  await Promise.all(fetchArticlesPromises);
  return articlesList;
}

/**
 * Get all categories for a company
 */
export async function getAllCategories(uid: string, selectedCompany: string = 'default'): Promise<Category[]> {
  const categoriesRef = db.collection(
    `Users/${uid}/knowledgebases/${selectedCompany}/categories`
  );
  const categorySnapshot = await categoriesRef.get();
  const categoriesList: Category[] = [];

  categorySnapshot.docs.forEach((categoryDoc) => {
    const categoryData = categoryDoc.data();
    categoriesList.push({
      id: categoryDoc.id,
      name: categoryData.name || '',
      description: categoryData.description || '',
      link: categoryData.link || '',
    });
  });

  return categoriesList;
}

/**
 * Get company name from knowledge base
 */
export async function getCompanyName(uid: string, selectedCompany: string = 'default'): Promise<string> {
  try {
    const docRef = db
      .collection('Users')
      .doc(uid)
      .collection('knowledgebases')
      .doc(selectedCompany);

    const doc = await docRef.get();

    if (doc.exists) {
      return doc.data()?.name || 'Company Name';
    } else {
      return 'Company Name';
    }
  } catch (error) {
    console.error('Error getting company name:', error);
    return 'Company Name';
  }
}

/**
 * Get website link from knowledge base
 * Checks customDomainVerified first, then falls back to subdomain
 */
export async function getWebsiteLink(uid: string, selectedCompany: string = 'default'): Promise<string> {
  try {
    const docRef = db
      .collection('Users')
      .doc(uid)
      .collection('knowledgebases')
      .doc(selectedCompany);

    const doc = await docRef.get();

    if (doc.exists) {
      const data = doc.data();
      if (data?.customDomainVerified && data?.customDomain) {
        if (data.customDomain.includes('http')) {
          return data.customDomain;
        } else {
          return 'https://' + data.customDomain;
        }
      } else if (data?.subdomain) {
        return 'https://' + data.subdomain + '.ourkd.help';
      }
    }
    return 'https://ourkd.help';
  } catch (error) {
    console.error('Error getting website link:', error);
    return 'https://ourkd.help';
  }
}

/**
 * Generate articles TXT content string (in-memory, no file system)
 * Returns formatted TXT string with categories list and articles
 */
export async function generateArticlesTXTContent(
  uid: string,
  selectedCompany: string = 'default'
): Promise<string> {
  // Fetch all articles and categories
  const articles = await getAllArticles(uid, selectedCompany);
  const categories = await getAllCategories(uid, selectedCompany);
  const websiteLink = await getWebsiteLink(uid, selectedCompany);
  const companyName = await getCompanyName(uid, selectedCompany);

  console.log('website link ', websiteLink);

  // Initialize the content for the TXT file
  let txtContent = `Articles for Company: ${companyName}\n\n`;

  // Add categories list at the top
  txtContent += `CATEGORIES:\n`;
  txtContent += `===========\n`;
  if (categories.length > 0) {
    categories.forEach((category, index) => {
      txtContent += `${index + 1}. ${category.name} (ID: ${category.id})\n`;
      if (category.description) {
        txtContent += `   Description: ${category.description}\n`;
      }
      if (category.link) {
        txtContent += `   Link: ${category.link}\n`;
      }
      txtContent += `\n`;
    });
  } else {
    txtContent += `No categories found.\n`;
  }
  txtContent += `\n`;

  // Loop through each article and add it to the TXT content
  articles.forEach((article, index) => {
    txtContent += `Article ${index + 1}: ${article.title}\n`;
    txtContent += `Article ID: ${article.id}\n`;
    txtContent += `Category ID: ${article.categoryId}\n`;
    txtContent += `Description: ${article.description || ''}\n`;
    txtContent += `Link: ${websiteLink}/articles/${article.link}\n`;
    txtContent += `Content:\n${article.rawText}\n\n`;
    txtContent += `--------------------------------------\n\n`;
  });

  // Add FAQs at the end
  const faqs = await getAllFAQs(uid, selectedCompany);
  if (faqs.length > 0) {
    txtContent += `\n\n`;
    txtContent += `FREQUENTLY ASKED QUESTIONS (FAQs):\n`;
    txtContent += `==================================\n\n`;
    
    faqs.forEach((faq, index) => {
      txtContent += `FAQ ${index + 1}:\n`;
      txtContent += `Question: ${faq.question}\n`;
      txtContent += `Answer: ${faq.answer}\n\n`;
      txtContent += `--------------------------------------\n\n`;
    });
  }

  return txtContent;
}

export interface FAQ {
  id: string;
  question: string;
  answer: string;
  enabled: boolean;
}

/**
 * Get all FAQs for a company (only enabled ones)
 */
export async function getAllFAQs(uid: string, selectedCompany: string = 'default'): Promise<FAQ[]> {
  const faqsRef = db.collection(
    `Users/${uid}/knowledgebases/${selectedCompany}/faqs`
  );
  const faqsSnapshot = await faqsRef.get(); // Get all FAQs

  const faqsList: FAQ[] = [];

  faqsSnapshot.docs.forEach((faqDoc) => {
    const data = faqDoc.data();
    // Only include enabled FAQs (default to true if not set)
    if (data.enabled !== false) {
      faqsList.push({
        id: faqDoc.id,
        question: data.question || '',
        answer: data.answer || '',
        enabled: true,
      });
    }
  });

  return faqsList;
}

