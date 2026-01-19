
'use client';

import { type BasketItem } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type BasketContextType = {
  basket: BasketItem[];
  addItem: (item: BasketItem) => void;
  removeItem: (itemId: string) => void;
  incrementQuantity: (itemId: string) => void;
  decrementQuantity: (itemId: string) => void;
  clearBasket: () => void;
  totalPrice: number;
};

const BasketContext = createContext<BasketContextType | undefined>(undefined);

export const BasketProvider = ({ children }: { children: ReactNode }) => {
  const [basket, setBasket] = useState<BasketItem[]>([]);
  const { toast } = useToast();

  // Load basket from localStorage on initial render
  useEffect(() => {
    try {
      const storedBasket = localStorage.getItem('basket');
      if (storedBasket) {
        setBasket(JSON.parse(storedBasket));
      }
    } catch (error) {
      console.error("Failed to parse basket from localStorage", error);
    }
  }, []);

  // Save basket to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('basket', JSON.stringify(basket));
  }, [basket]);

  const addItem = (item: BasketItem) => {
    setBasket((prevBasket) => {
      const existingItem = prevBasket.find((i) => i.id === item.id);
      if (existingItem) {
        // If item exists, just increment quantity
        return prevBasket.map((i) =>
          i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      } else {
        // If it's a new item, add it to the basket
        return [...prevBasket, { ...item, quantity: 1 }];
      }
    });
    toast({
        title: "Item Added",
        description: `"${item.name}" has been added to your basket.`,
    });
  };

  const removeItem = (itemId: string) => {
    const itemExists = basket.some((i) => i.id === itemId);
    if (!itemExists) return;

    setBasket((prevBasket) => prevBasket.filter((i) => i.id !== itemId));
    toast({
        title: "Item Removed",
        description: "The item has been removed from your basket.",
    });
  };

  const incrementQuantity = (itemId: string) => {
    setBasket((prevBasket) =>
      prevBasket.map((i) =>
        i.id === itemId ? { ...i, quantity: i.quantity + 1 } : i
      )
    );
  };

  const decrementQuantity = (itemId: string) => {
    const itemToDecrement = basket.find((i) => i.id === itemId);
    if (!itemToDecrement) return;

    if (itemToDecrement.quantity > 1) {
        setBasket((prevBasket) =>
            prevBasket.map((i) =>
            i.id === itemId ? { ...i, quantity: i.quantity - 1 } : i
            )
        );
    } else {
        // This is where we remove the item completely
        setBasket((prevBasket) => prevBasket.filter((i) => i.id !== itemId));
        toast({
            title: "Item Removed",
            description: "The item has been removed from your basket.",
        });
    }
  };

  const clearBasket = () => {
    setBasket([]);
  };

  const totalPrice = basket.reduce(
    (total, item) => total + item.price * item.quantity,
    0
  );

  return (
    <BasketContext.Provider
      value={{
        basket,
        addItem,
        removeItem,
        incrementQuantity,
        decrementQuantity,
        clearBasket,
        totalPrice,
      }}
    >
      {children}
    </BasketContext.Provider>
  );
};

export const useBasket = () => {
  const context = useContext(BasketContext);
  if (context === undefined) {
    throw new Error('useBasket must be used within a BasketProvider');
  }
  return context;
};

    