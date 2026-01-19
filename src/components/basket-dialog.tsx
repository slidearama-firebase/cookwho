'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { useBasket } from '@/context/basket-context';
import { Button } from './ui/button';
import { Minus, Plus, ShoppingCart, Trash2 } from 'lucide-react';
import Image from 'next/image';
import { ScrollArea } from './ui/scroll-area';
import { Separator } from './ui/separator';
import Link from 'next/link';

export function BasketDialog({ children }: { children: React.ReactNode }) {
  const {
    basket,
    incrementQuantity,
    decrementQuantity,
    removeItem,
    totalPrice,
  } = useBasket();

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon">
          {children}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Your Basket</DialogTitle>
          {basket.length > 0 && (
             <DialogDescription>
                From: <span className='font-semibold'>{basket[0].restaurantName}</span>
             </DialogDescription>
          )}
        </DialogHeader>
        {basket.length > 0 ? (
          <>
            <ScrollArea className="max-h-[50vh] pr-4">
              <div className="space-y-4">
                {basket.map((item) => (
                  <div key={item.id} className="flex items-center gap-4">
                    <div className="relative w-16 h-16 rounded-md overflow-hidden flex-shrink-0">
                      <Image
                        src={item.imageUrls?.[0] || 'https://placehold.co/100x100'}
                        alt={item.name}
                        fill
                        className="object-cover"
                      />
                    </div>
                    <div className="flex-grow">
                      <p className="font-semibold">{item.name}</p>
                      <p className="text-sm text-muted-foreground">
                        £{item.price.toFixed(2)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => decrementQuantity(item.id)}
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                      <span className="font-semibold w-4 text-center">{item.quantity}</span>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => incrementQuantity(item.id)}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="destructive"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => removeItem(item.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
            <Separator />
            <DialogFooter className="sm:justify-between flex-row">
                <div className='text-lg font-bold'>
                    Total: £{totalPrice.toFixed(2)}
                </div>
                <DialogClose asChild>
                  <Button asChild>
                    <Link href="/checkout">Go to Checkout</Link>
                  </Button>
                </DialogClose>
            </DialogFooter>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center text-center py-10">
            <ShoppingCart className="h-16 w-16 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Your basket is empty.</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
