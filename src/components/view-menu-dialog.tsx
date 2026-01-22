
'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { useUser } from '@/firebase/auth/use-user';
import { useFirestore } from '@/firebase/provider';
import { useCollection } from '@/firebase/firestore/use-collection';
import type { CookMenuItem } from '@/lib/types';
import { collection, query } from 'firebase/firestore';
import { useMemo } from 'react';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { Utensils } from 'lucide-react';
import { Skeleton } from './ui/skeleton';
import { ViewMenuItem } from './view-menu-item';
import { ScrollArea } from './ui/scroll-area';

type ViewMenuDialogProps = {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
};

export function ViewMenuDialog({
  isOpen,
  onOpenChange,
}: ViewMenuDialogProps) {
  const { user } = useUser();
  const firestore = useFirestore();

  const menuItemsQuery = useMemo(() => {
    if (!firestore || !user) return null;
    return query(
      collection(firestore, 'restaurants', user.uid, 'menuItems')
    );
  }, [firestore, user]);

  const { data: menuItems, loading: menuItemsLoading } =
    useCollection<CookMenuItem>(menuItemsQuery);
    
  const loading = menuItemsLoading;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>My Dishes</DialogTitle>
          <DialogDescription>
            Here are all the dishes you currently offer.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[60vh] pr-4">
            <div className="space-y-4">
            {loading && (
                <>
                    <Skeleton className="h-28 w-full" />
                    <Skeleton className="h-28 w-full" />
                    <Skeleton className="h-28 w-full" />
                </>
            )}

            {!loading && menuItems && menuItems.length > 0 && (
                menuItems.map((item) => <ViewMenuItem key={item.id} item={item} />)
            )}

            {!loading && (!menuItems || menuItems.length === 0) && (
                <Alert>
                    <Utensils className="h-4 w-4" />
                    <AlertTitle>No Dishes Found</AlertTitle>
                    <AlertDescription>
                        You haven't added any dishes to your menu yet.
                    </AlertDescription>
                </Alert>
            )}
            </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
