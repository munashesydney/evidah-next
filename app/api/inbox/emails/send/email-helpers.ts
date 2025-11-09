import admin from 'firebase-admin';

const db = admin.firestore();

/**
 * Fetches messages for a ticket
 */
export async function fetchMessages(
  ticketId: string,
  uid: string,
  selectedCompany: string
): Promise<any[]> {
  try {
    const ticketDocRef = db
      .collection('Users')
      .doc(uid)
      .collection('knowledgebases')
      .doc(selectedCompany)
      .collection('Helpdesk')
      .doc('default')
      .collection('tickets')
      .doc(ticketId);

    const ticketDoc = await ticketDocRef.get();

    if (!ticketDoc.exists) {
      console.log('No such ticket document:', ticketId);
      return [];
    }

    const messagesRef = ticketDocRef.collection('messages');
    const messagesSnapshot = await messagesRef.orderBy('date', 'desc').get();

    const messages = messagesSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return messages;
  } catch (error) {
    console.error('Error fetching messages:', error);
    return [];
  }
}

/**
 * Gets company name from knowledge base
 */
export async function getCompanyName(
  uid: string,
  selectedCompany: string
): Promise<string> {
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
 * Gets subdomain from knowledge base
 */
export async function getSubdomain(
  uid: string,
  selectedCompany: string
): Promise<string | null> {
  try {
    const docRef = db
      .collection('Users')
      .doc(uid)
      .collection('knowledgebases')
      .doc(selectedCompany);

    const doc = await docRef.get();

    if (doc.exists) {
      return doc.data()?.subdomain || null;
    } else {
      return null;
    }
  } catch (error) {
    console.error('Error getting subdomain:', error);
    return null;
  }
}

/**
 * Adds a message to a ticket
 */
export async function addMessage(
  ticketId: string,
  to: string,
  from: string,
  body: string,
  inReplyTo: string,
  messageId: string,
  references: string,
  subject: string,
  uid: string,
  type: string,
  selectedCompany: string,
  attachments: any[] = []
): Promise<void> {
  try {
    const messagesCollectionRef = db
      .collection('Users')
      .doc(uid)
      .collection('knowledgebases')
      .doc(selectedCompany)
      .collection('Helpdesk')
      .doc('default')
      .collection('tickets')
      .doc(ticketId)
      .collection('messages');

    await messagesCollectionRef.add({
      to: to,
      from: from,
      body: body,
      date: admin.firestore.FieldValue.serverTimestamp(),
      inReplyTo: inReplyTo,
      messageId: messageId,
      references: references,
      subject: subject,
      uid: uid,
      type: type,
      attachments: attachments,
    });

    console.log('Message added successfully');
  } catch (error) {
    console.error('Error adding message:', error);
    throw error;
  }
}

/**
 * Updates ticket with last message info
 */
export async function updateTicket(
  ticketId: string,
  uid: string,
  selectedCompany: string,
  lastMessage: string
): Promise<void> {
  try {
    const ticketDocRef = db
      .collection('Users')
      .doc(uid)
      .collection('knowledgebases')
      .doc(selectedCompany)
      .collection('Helpdesk')
      .doc('default')
      .collection('tickets')
      .doc(ticketId);

    await ticketDocRef.set(
      {
        lastMessageDate: admin.firestore.FieldValue.serverTimestamp(),
        lastMessage: lastMessage,
        read: false,
      },
      { merge: true }
    );

    console.log('Ticket updated successfully');
  } catch (error) {
    console.error('Error updating ticket:', error);
    throw error;
  }
}

