
'use client';

import { cn } from '@/lib/utils';
import { ShoppingCart, UtensilsCrossed } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import dynamic from 'next/dynamic';
import { BasketDialog } from './basket-dialog';
import { useBasket } from '@/context/basket-context';
import { Skeleton } from './ui/skeleton';

const BackButton = dynamic(() => import('./back-button').then(mod => mod.BackButton), {
  ssr: false,
});

const UserAuth = dynamic(() => import('./user-auth').then(mod => mod.UserAuth), {
    ssr: false,
    loading: () => <Skeleton className="h-12 w-12 rounded-full" />,
});


export function Header() {
  const pathname = usePathname();
  const { basket } = useBasket();
  const isHomePage = pathname === '/';

  const itemCount = basket.reduce((total, item) => total + item.quantity, 0);

  const rightSideContent = (
    <div className='flex items-center justify-end gap-2'>
        {itemCount > 0 && (
            <BasketDialog>
                <div className='relative'>
                    <ShoppingCart className='h-6 w-6' />
                    <span className="absolute -top-2 -right-2 bg-primary text-primary-foreground rounded-full h-5 w-5 flex items-center justify-center text-xs">
                        {itemCount}
                    </span>
                </div>
            </BasketDialog>
        )}
        <UserAuth />
    </div>
  );

  const leftSideContent = (
    <div className="flex items-center justify-start">
        {isHomePage ? (
            <Link href="/" aria-label="Home">
                <UtensilsCrossed className="h-8 w-8 text-primary" />
            </Link>
        ) : (
            <BackButton />
        )}
    </div>
  );


  return (
    <header className="py-6 px-4 sm:px-6 lg:px-8">
      <div className="container mx-auto grid grid-cols-3 items-center">
        
        {/* Left Side */}
        {leftSideContent}

        {/* Center */}
        <div className="flex justify-center">
            <Link href="/" className="flex items-center space-x-4">
                <h1 className="font-headline text-xl font-bold tracking-tight text-foreground">
                    CookWho
                </h1>
            </Link>
        </div>

        {/* Right Side */}
        {rightSideContent}
      </div>
    </header>
  );
}
