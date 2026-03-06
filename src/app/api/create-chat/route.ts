import { NextResponse } from 'next/server';
import { initializeApp, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// Initialize Firebase Admin using Application Default Credentials
if (!getApps().length) {
  initializeApp();
}

export async function POST(req: Request) {
  try {
    const { cookId, cookDisplayName, cookEmail, alertId } = await req.json();

    if (!cookId || !alertId) {
      return NextResponse.json(
        { success: false, message: 'Missing required fields.' },
        { status: 400 }
      );
    }

    const db = getFirestore();

    // Check if a chat already exists for this alert
    const existingChats = await db
      .collection('chats')
      .where('alertId', '==', alertId)
      .limit(1)
      .get();

    if (!existingChats.empty) {
      console.log(`INFO: Chat already exists for alert ${alertId}`);
      return NextResponse.json({
        success: true,
        chatId: existingChats.docs[0].id,
        message: 'Chat already exists.',
      });
    }

    // Generate a unique session ID for this chat
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Create the chat document
    const chatRef = await db.collection('chats').add({
      cookId,
      cookDisplayName: cookDisplayName || 'Cook',
      cookEmail,
      alertId,
      sessionId,
      status: 'open',
      createdAt: new Date(),
      invoiceItems: [],
      invoiceTotal: 0,
    });

    // Add the default opening message as a draft
    // The cook must press Send to start the conversation — not sent automatically
    await db
      .collection('chats')
      .doc(chatRef.id)
      .collection('messages')
      .add({
        sender: 'system',
        text: 'Hi! Before we get started, do you have any allergies I should know about?',
        createdAt: new Date(),
        isDraft: true,
      });

    console.log(`INFO: Chat created with ID ${chatRef.id} for cook ${cookId}`);

    return NextResponse.json({
      success: true,
      chatId: chatRef.id,
      sessionId,
    });

  } catch (error: any) {
    console.error('ERROR: Failed to create chat:', error.message);
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
}
