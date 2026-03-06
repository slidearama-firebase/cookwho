'use client';

import { useEffect, useState } from 'react';
import { useFirestore, useAuth } from '@/firebase/provider';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { type Chat } from '@/lib/types';
import { ChatWindow } from '@/components/chat-window';
import { ChefHat, MessageCircle, Clock, CheckCircle2, Receipt } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

export default function CookDashboardPage() {
  const firestore = useFirestore();
  const auth = useAuth();
  const [chats, setChats] = useState<Chat[]>([]);
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Get current user ID from Firebase Auth
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setCurrentUserId(user ? user.uid : null);
    });
    return () => unsubscribe();
  }, [auth]);

  // Listen for all active chats for this cook in real time
  useEffect(() => {
    if (!firestore || !currentUserId) {
      setLoading(false);
      return;
    }

    const chatsRef = collection(firestore, 'chats');
    const q = query(
      chatsRef,
      where('cookId', '==', currentUserId),
      where('status', 'in', ['open', 'invoiced']),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const chatList = snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      })) as Chat[];
      setChats(chatList);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [firestore, currentUserId]);

  // Keep selected chat in sync with Firestore updates
  useEffect(() => {
    if (!selectedChat) return;
    const updated = chats.find((c) => c.id === selectedChat.id);
    if (updated) setSelectedChat(updated);
  }, [chats]);

  const getStatusIcon = (status: Chat['status']) => {
    switch (status) {
      case 'open':
        return <MessageCircle className="h-4 w-4 text-green-500" />;
      case 'invoiced':
        return <Receipt className="h-4 w-4 text-blue-500" />;
      case 'paid':
        return <CheckCircle2 className="h-4 w-4 text-orange-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusLabel = (status: Chat['status']) => {
    switch (status) {
      case 'open': return 'Active';
      case 'invoiced': return 'Invoice Sent';
      case 'paid': return 'Paid';
      default: return 'Closed';
    }
  };

  const formatTime = (createdAt: any) => {
    if (!createdAt) return '';
    try {
      const date = createdAt.toDate ? createdAt.toDate() : new Date(createdAt);
      return date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  if (!currentUserId) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <ChefHat className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
        <p className="text-muted-foreground">Please log in to view your dashboard.</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">

      {/* Page Header */}
      <div className="flex items-center gap-3 mb-8">
        <ChefHat className="h-8 w-8 text-orange-500" />
        <div>
          <h1 className="font-headline text-2xl font-bold text-foreground">
            Cook Dashboard
          </h1>
          <p className="text-sm text-muted-foreground">
            {chats.length > 0
              ? `You have ${chats.length} active chat${chats.length > 1 ? 's' : ''}`
              : 'No active chats right now'}
          </p>
        </div>
      </div>

      {/* Chat List */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-xl" />
          ))}
        </div>
      ) : chats.length === 0 ? (
        <div className="flex flex-col items-center justify-center text-center py-20">
          <MessageCircle className="h-16 w-16 text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold text-foreground mb-2">
            No Active Chats
          </h2>
          <p className="text-muted-foreground max-w-sm">
            When a customer adds one of your dishes to their basket and you confirm your kitchen is open, their chat will appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {chats.map((chat) => (
            <button
              key={chat.id}
              onClick={() => setSelectedChat(chat)}
              className={`w-full text-left rounded-xl border p-4 transition-all duration-200 hover:shadow-md ${
                selectedChat?.id === chat.id
                  ? 'border-orange-400 bg-orange-50 shadow-md'
                  : 'border-gray-200 bg-white hover:border-orange-200'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="bg-orange-100 rounded-full p-2 flex-shrink-0">
                    <MessageCircle className="h-5 w-5 text-orange-500" />
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">
                      Customer Order
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Ref: {chat.sessionId.slice(-8).toUpperCase()}
                    </p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <div className="flex items-center gap-1">
                    {getStatusIcon(chat.status)}
                    <span className="text-xs font-semibold text-gray-600">
                      {getStatusLabel(chat.status)}
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {formatTime(chat.createdAt)}
                  </span>
                  {chat.invoiceTotal && chat.invoiceTotal > 0 && (
                    <span className="text-xs font-bold text-orange-500">
                      £{chat.invoiceTotal.toFixed(2)}
                    </span>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Chat window opens when cook selects a chat */}
      {selectedChat && (
        <ChatWindow
          chat={selectedChat}
          onClose={() => setSelectedChat(null)}
          role="cook"
        />
      )}
    </div>
  );
}
