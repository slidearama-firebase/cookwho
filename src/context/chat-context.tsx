'use client';

import { createContext, useContext, useState, ReactNode } from 'react';

type ChatContextType = {
  alertId: string | null;
  setAlertId: (id: string | null) => void;
};

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export function ChatProvider({ children }: { children: ReactNode }) {
  const [alertId, setAlertId] = useState<string | null>(null);

  return (
    <ChatContext.Provider value={{ alertId, setAlertId }}>
      {children}
    </ChatContext.Provider>
  );
}

export function useChatContext() {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error('useChatContext must be used within a ChatProvider');
  }
  return context;
}
