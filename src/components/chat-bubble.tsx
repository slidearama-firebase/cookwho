'use client';

import { useEffect, useState } from 'react';
import { useFirestore } from '@/firebase/provider';
import { collection, query, where, onSnapshot, orderBy, limit } from 'firebase/firestore';
import { MessageCircle } from 'lucide-react';
import { type Chat } from '@/lib/types';
import { ChatWindow } from './chat-window';

type ChatBubbleProps = {
  alertId: string | null;
};

export function ChatBubble({ alertId }: ChatBubbleProps) {
  const firestore = useFirestore();
  const [activeChat, setActiveChat] = useState<Chat | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [hasRealMessage, setHasRealMessage] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  // Listen for a chat matching this alertId
  useEffect(() => {
    if (!firestore || !alertId) return;

    const chatsRef = collection(firestore, 'chats');
    const q = query(
      chatsRef,
      where('alertId', '==', alertId),
      where('status', 'in', ['open', 'invoiced'])
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        const chatDoc = snapshot.docs[0];
        setActiveChat({ id: chatDoc.id, ...chatDoc.data() } as Chat);
      } else {
        setActiveChat(null);
        setHasRealMessage(false);
      }
    });

    return () => unsubscribe();
  }, [firestore, alertId]);

  // Watch for the cook's first real (non-draft) message
  // Bubble stays hidden until this fires
  useEffect(() => {
    if (!firestore || !activeChat) return;

    const messagesRef = collection(firestore, 'chats', activeChat.id, 'messages');
    const q = query(
      messagesRef,
      where('sender', '==', 'cook'),
      where('isDraft', '==', false),
      limit(1)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setHasRealMessage(!snapshot.empty);
    });

    return () => unsubscribe();
  }, [firestore, activeChat]);

  // Count unread cook messages when chat window is closed
  useEffect(() => {
    if (!firestore || !activeChat || isOpen) {
      setUnreadCount(0);
      return;
    }

    const messagesRef = collection(firestore, 'chats', activeChat.id, 'messages');
    const q = query(
      messagesRef,
      where('sender', '==', 'cook'),
      where('isDraft', '==', false)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setUnreadCount(snapshot.size);
    });

    return () => unsubscribe();
  }, [firestore, activeChat, isOpen]);

  // Don't render if no active chat or cook hasn't sent first message yet
  if (!activeChat || !hasRealMessage) return null;

  return (
    <>
      {/* Floating chat bubble — appears when cook sends first message */}
      {!isOpen && (
        <div className="fixed bottom-6 right-6 z-50">
          {/* Pulsing ring — draws customer attention */}
          <span className="absolute inset-0 rounded-full bg-orange-400 animate-ping opacity-60" />
          <button
            onClick={() => {
              setIsOpen(true);
              setUnreadCount(0);
            }}
            className="relative flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white px-4 py-3 rounded-full shadow-lg transition-all duration-200 hover:scale-105"
          >
            <MessageCircle className="h-5 w-5" />
            <span className="font-semibold text-sm">
              Chat with {activeChat.cookDisplayName}
            </span>
            {unreadCount > 0 && (
              <span className="bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-bold">
                {unreadCount}
              </span>
            )}
          </button>
        </div>
      )}

      {/* Chat window slides up when bubble is clicked */}
      {isOpen && (
        <ChatWindow
          chat={activeChat}
          onClose={() => setIsOpen(false)}
          role="customer"
        />
      )}
    </>
  );
}
