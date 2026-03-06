'use client';

import { useEffect, useState, useRef } from 'react';
import { useFirestore } from '@/firebase/provider';
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  addDoc,
  updateDoc,
  doc,
  serverTimestamp,
} from 'firebase/firestore';
import { X, Send, Plus, Trash2, ChefHat } from 'lucide-react';
import { type Chat, type ChatMessage, type ChatInvoiceItem } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';

type ChatWindowProps = {
  chat: Chat;
  onClose: () => void;
  role: 'customer' | 'cook';
};

export function ChatWindow({ chat, onClose, role }: ChatWindowProps) {
  const firestore = useFirestore();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [draftMessage, setDraftMessage] = useState('');
  const [invoiceItems, setInvoiceItems] = useState<ChatInvoiceItem[]>(chat.invoiceItems || []);
  const [newItemDescription, setNewItemDescription] = useState('');
  const [newItemPrice, setNewItemPrice] = useState('');
  const [showInvoiceBuilder, setShowInvoiceBuilder] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Listen to messages in real time
  useEffect(() => {
    if (!firestore) return;

    const messagesRef = collection(firestore, 'chats', chat.id, 'messages');
    const q = query(messagesRef, orderBy('createdAt', 'asc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      })) as ChatMessage[];
      setMessages(msgs);

      // Load draft text for cook
      if (role === 'cook') {
        const draft = snapshot.docs.find((d) => d.data().isDraft);
        if (draft) setDraftMessage(draft.data().text);
      }
    });

    return () => unsubscribe();
  }, [firestore, chat.id, role]);

  // Auto scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Send a message
  const sendMessage = async (text: string) => {
    if (!firestore || !text.trim()) return;
    setIsSending(true);

    try {
      // If cook is sending the draft allergy message, update it rather than add new
      const draftDoc = messages.find((m) => (m as any).isDraft);
      if (role === 'cook' && draftDoc) {
        await updateDoc(
          doc(firestore, 'chats', chat.id, 'messages', draftDoc.id),
          {
            text: text.trim(),
            isDraft: false,
            createdAt: serverTimestamp(),
          }
        );
        setDraftMessage('');
      } else {
        await addDoc(collection(firestore, 'chats', chat.id, 'messages'), {
          sender: role,
          text: text.trim(),
          isDraft: false,
          createdAt: serverTimestamp(),
        });
      }
      setInputText('');
    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setIsSending(false);
    }
  };

  // Add an invoice item
  const addInvoiceItem = async () => {
    if (!newItemDescription.trim() || !newItemPrice) return;
    const price = parseFloat(newItemPrice);
    if (isNaN(price) || price <= 0) return;

    const updatedItems = [
      ...invoiceItems,
      { description: newItemDescription.trim(), price },
    ];
    const updatedTotal = updatedItems.reduce((sum, item) => sum + item.price, 0);

    setInvoiceItems(updatedItems);
    setNewItemDescription('');
    setNewItemPrice('');

    if (firestore) {
      await updateDoc(doc(firestore, 'chats', chat.id), {
        invoiceItems: updatedItems,
        invoiceTotal: updatedTotal,
      });
    }
  };

  // Remove an invoice item
  const removeInvoiceItem = async (index: number) => {
    const updatedItems = invoiceItems.filter((_, i) => i !== index);
    const updatedTotal = updatedItems.reduce((sum, item) => sum + item.price, 0);
    setInvoiceItems(updatedItems);

    if (firestore) {
      await updateDoc(doc(firestore, 'chats', chat.id), {
        invoiceItems: updatedItems,
        invoiceTotal: updatedTotal,
      });
    }
  };

  // Send invoice to customer
  const sendInvoice = async () => {
    if (!firestore || invoiceItems.length === 0) return;
    const total = invoiceItems.reduce((sum, item) => sum + item.price, 0);

    await updateDoc(doc(firestore, 'chats', chat.id), {
      status: 'invoiced',
      invoiceTotal: total,
    });

    await addDoc(collection(firestore, 'chats', chat.id, 'messages'), {
      sender: 'cook',
      text: `Here's your invoice! Total: £${total.toFixed(2)}`,
      isDraft: false,
      isInvoice: true,
      createdAt: serverTimestamp(),
    });

    setShowInvoiceBuilder(false);
  };

  const invoiceTotal = invoiceItems.reduce((sum, item) => sum + item.price, 0);

  // Customers only see non-draft messages
  // Cooks see everything including the draft
  const visibleMessages = messages.filter(
    (m) => role === 'cook' || !(m as any).isDraft
  );

  return (
    <div className="fixed bottom-0 right-0 left-0 sm:left-auto sm:right-6 sm:bottom-6 z-50 w-full sm:w-96 bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col border border-gray-200 max-h-[85vh]">

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-orange-500 rounded-t-2xl text-white flex-shrink-0">
        <div className="flex items-center gap-2">
          <ChefHat className="h-5 w-5" />
          <div>
            <p className="font-semibold text-sm">
              {role === 'customer'
                ? `Chat with ${chat.cookDisplayName}`
                : 'Customer Chat'}
            </p>
            <p className="text-xs text-orange-100">
              {chat.status === 'invoiced' ? '📋 Invoice sent — awaiting payment' : '🟢 Kitchen Open'}
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="hover:bg-orange-600 rounded-full p-1 transition-colors"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 px-4 py-3 min-h-0">
        <div className="space-y-3">
          {visibleMessages.length === 0 && (
            <p className="text-center text-sm text-gray-400 py-8">
              {role === 'cook'
                ? 'Edit and send your opening message below to start the conversation!'
                : 'Waiting for your cook to start the conversation...'}
            </p>
          )}

          {visibleMessages.map((message) => {
            const isDraft = (message as any).isDraft;
            const isInvoice = (message as any).isInvoice;
            const isMine = message.sender === role;

            return (
              <div
                key={message.id}
                className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm ${
                    isDraft
                      ? 'bg-orange-50 border-2 border-dashed border-orange-300 text-orange-800'
                      : isMine
                      ? 'bg-orange-500 text-white'
                      : isInvoice
                      ? 'bg-green-50 border border-green-200 text-green-800 font-semibold'
                      : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {isDraft && (
                    <p className="text-xs font-semibold mb-1 text-orange-500">
                      ✏️ Draft — edit and send below
                    </p>
                  )}
                  {isInvoice && (
                    <p className="text-xs font-semibold mb-1 text-green-600">
                      📋 Invoice
                    </p>
                  )}
                  <p>{message.text}</p>
                </div>
              </div>
            );
          })}

          {/* Invoice breakdown for customer */}
          {role === 'customer' && chat.status === 'invoiced' && invoiceItems.length > 0 && (
            <div className="bg-green-50 border border-green-200 rounded-2xl p-4 space-y-2">
              <p className="font-semibold text-green-800 text-sm">📋 Invoice Breakdown</p>
              {invoiceItems.map((item, index) => (
                <div key={index} className="flex justify-between text-sm text-green-700">
                  <span>{item.description}</span>
                  <span>£{item.price.toFixed(2)}</span>
                </div>
              ))}
              <Separator className="bg-green-200" />
              <div className="flex justify-between font-bold text-green-800">
                <span>Total</span>
                <span>£{invoiceTotal.toFixed(2)}</span>
              </div>
              <Button
                className="w-full bg-green-600 hover:bg-green-700 text-white mt-2"
                onClick={() => {
                  // Stripe payment will be wired up in a future step
                  console.log('Proceed to Stripe payment:', invoiceTotal);
                }}
              >
                💳 Pay Now — £{invoiceTotal.toFixed(2)}
              </Button>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Invoice Builder — cook only */}
      {role === 'cook' && showInvoiceBuilder && (
        <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 space-y-2 flex-shrink-0">
          <p className="text-sm font-semibold text-gray-700">📋 Invoice Builder</p>
          {invoiceItems.map((item, index) => (
            <div key={index} className="flex items-center gap-2 text-sm">
              <span className="flex-1 truncate text-gray-700">{item.description}</span>
              <span className="font-semibold text-gray-800">£{item.price.toFixed(2)}</span>
              <button
                onClick={() => removeInvoiceItem(index)}
                className="text-red-400 hover:text-red-600"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="e.g. Boiled eggs x2"
              value={newItemDescription}
              onChange={(e) => setNewItemDescription(e.target.value)}
              className="flex-1 text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-400"
            />
            <input
              type="number"
              placeholder="£"
              value={newItemPrice}
              onChange={(e) => setNewItemPrice(e.target.value)}
              className="w-16 text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-400"
            />
            <button
              onClick={addInvoiceItem}
              className="bg-orange-500 hover:bg-orange-600 text-white rounded-lg px-3 py-2"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
          {invoiceItems.length > 0 && (
            <div className="flex items-center justify-between pt-1">
              <span className="text-sm font-bold text-gray-700">
                Total: £{invoiceTotal.toFixed(2)}
              </span>
              <Button
                size="sm"
                className="bg-green-600 hover:bg-green-700 text-white"
                onClick={sendInvoice}
              >
                Send Invoice to Customer
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Message Input */}
      <div className="px-4 py-3 border-t border-gray-200 flex-shrink-0">
        {/* Cook draft editor — shown until draft is sent */}
        {role === 'cook' && messages.some((m) => (m as any).isDraft) ? (
          <div className="space-y-2">
            <p className="text-xs text-orange-500 font-semibold">
              ✏️ Edit your opening message then press Send
            </p>
            <div className="flex gap-2">
              <textarea
                value={draftMessage}
                onChange={(e) => setDraftMessage(e.target.value)}
                rows={2}
                className="flex-1 text-sm border border-orange-300 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-400 resize-none"
              />
              <button
                onClick={() => sendMessage(draftMessage)}
                disabled={isSending || !draftMessage.trim()}
                className="bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white rounded-xl px-4 flex items-center justify-center"
              >
                <Send className="h-5 w-5" />
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {/* Invoice builder toggle — cook only, before invoice is sent */}
            {role === 'cook' && chat.status !== 'invoiced' && (
              <button
                onClick={() => setShowInvoiceBuilder(!showInvoiceBuilder)}
                className="text-xs text-orange-500 hover:text-orange-600 font-semibold flex items-center gap-1"
              >
                <Plus className="h-3 w-3" />
                {showInvoiceBuilder ? 'Hide Invoice Builder' : 'Build & Send Invoice'}
              </button>
            )}

            {/* Regular message input */}
            {chat.status !== 'invoiced' || role === 'cook' ? (
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Type a message..."
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      sendMessage(inputText);
                    }
                  }}
                  className="flex-1 text-sm border border-gray-300 rounded-full px-4 py-2 focus:outline-none focus:ring-2 focus:ring-orange-400"
                />
                <button
                  onClick={() => sendMessage(inputText)}
                  disabled={isSending || !inputText.trim()}
                  className="bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white rounded-full w-10 h-10 flex items-center justify-center flex-shrink-0"
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <p className="text-xs text-center text-gray-400 py-2">
                Invoice sent — awaiting customer payment
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
