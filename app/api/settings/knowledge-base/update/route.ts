import { NextRequest, NextResponse } from 'next/server';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

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

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      uid,
      selectedCompany,
      name,
      subdomain,
      heading,
      subheading,
      seoTitle,
      seoDescription,
      primaryColor,
    } = body;

    // Validation
    if (!uid) {
      return NextResponse.json(
        { error: 'Missing required parameter: uid' },
        { status: 400 }
      );
    }

    const companyId = selectedCompany || 'default';

    // Get current KB data to check if subdomain is changing
    const kbRef = db
      .collection('Users')
      .doc(uid)
      .collection('knowledgebases')
      .doc(companyId);
    
    const kbDoc = await kbRef.get();
    
    if (!kbDoc.exists) {
      return NextResponse.json(
        { error: 'Knowledge base not found' },
        { status: 404 }
      );
    }

    const currentData = kbDoc.data();
    const currentSubdomain = currentData?.subdomain || '';
    const isSubdomainChanged = subdomain && subdomain !== currentSubdomain;

    // If subdomain is being changed, check if it already exists
    if (isSubdomainChanged) {
      const subdomainIndexRef = db.collection('SubdomainIndex').doc(subdomain.toLowerCase());
      const subdomainDoc = await subdomainIndexRef.get();

      if (subdomainDoc.exists) {
        const subdomainData = subdomainDoc.data();
        // Only allow if it's the SAME knowledge base being edited
        if (
          subdomainData?.userId !== uid ||
          subdomainData?.kbId !== companyId
        ) {
          return NextResponse.json(
            { error: 'Ooopsy daisy, that subdomain already exists. Please choose another one' },
            { status: 400 }
          );
        }
      }
    }

    // Build update object
    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (subdomain !== undefined) updateData.subdomain = subdomain;
    if (heading !== undefined) updateData.heading = heading;
    if (subheading !== undefined) updateData.subheading = subheading;
    if (seoTitle !== undefined) updateData.seotitle = seoTitle;
    if (seoDescription !== undefined) updateData.seodescription = seoDescription;
    if (primaryColor !== undefined) updateData.primaryColor = primaryColor;

    // Update knowledge base
    await kbRef.update(updateData);

    // Update SubdomainIndex if subdomain changed
    if (isSubdomainChanged && subdomain) {
      const subdomainIndexRef = db.collection('SubdomainIndex').doc(subdomain.toLowerCase());
      await subdomainIndexRef.set(
        {
          userId: uid,
          kbId: companyId,
          subdomain: subdomain,
          timestamp: new Date(),
          updated: true,
        },
        { merge: true }
      );

      // Clean up old subdomain if it existed
      if (currentSubdomain) {
        const oldSubdomainRef = db.collection('SubdomainIndex').doc(currentSubdomain.toLowerCase());
        const oldSubdomainDoc = await oldSubdomainRef.get();
        
        if (oldSubdomainDoc.exists) {
          const oldData = oldSubdomainDoc.data();
          // Only delete if it belongs to this user and KB
          if (oldData?.userId === uid && oldData?.kbId === companyId) {
            await oldSubdomainRef.delete();
          }
        }
      }
    }

    // Fetch updated KB data
    const updatedDoc = await kbRef.get();
    const updatedData = updatedDoc.data();

    return NextResponse.json({
      success: true,
      message: 'Knowledge base updated successfully',
      data: {
        name: updatedData?.name || '',
        subdomain: updatedData?.subdomain || '',
        heading: updatedData?.heading || '',
        subheading: updatedData?.subheading || '',
        seoTitle: updatedData?.seotitle || '',
        seoDescription: updatedData?.seodescription || '',
        primaryColor: updatedData?.primaryColor || '#1d4ed8',
        published: updatedData?.published || false,
        seoOn: updatedData?.seoOn || false,
        showCompanyName: updatedData?.showCompanyName || false,
        showLogo: updatedData?.showLogo || false,
        customDomain: updatedData?.customDomain || '',
        customDomainVerified: updatedData?.customDomainVerified || false,
        customDomainStep: updatedData?.customDomainStep || 1,
        chosenPicType: updatedData?.chosenPicType || 1,
      },
    });
  } catch (error: any) {
    console.error('Error updating knowledge base:', error);
    return NextResponse.json(
      { error: 'Failed to update knowledge base', details: error.message },
      { status: 500 }
    );
  }
}

