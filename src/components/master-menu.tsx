'use client';

import { useCollection, useFirestore } from '@/firebase';
import type { MasterMenuCategory } from '@/lib/types';
import { collection, query, where } from 'firebase/firestore';
import { useMemo } from 'react';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { Utensils } from 'lucide-react';
import { Skeleton } from './ui/skeleton';
import { Card, CardHeader, CardTitle } from './ui/card';
import Link from 'next/link';

type Cuisine = 'English' | 'Indian' | 'Italian';

type MasterMenuProps = {
  cuisine: Cuisine;
};

export function MasterMenu({ cuisine }: MasterMenuProps) {
  const firestore = useFirestore();

  // Get all master menu categories for the selected cuisine
  const categoriesQuery = useMemo(() => {
    if (!firestore) return null;
    return query(
      collection(firestore, 'masterMenuCategories'),
      where('cuisine', '==', cuisine)
    );
  }, [firestore, cuisine]);

  const { data: categories, loading: categoriesLoading } =
    useCollection<MasterMenuCategory>(categoriesQuery);

  if (categoriesLoading) {
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
            ))}
      </div>
    );
  }

  if (!categories || categories.length === 0) {
    return (
      <>
        <Alert>
          <Utensils className="h-4 w-4" />
          <AlertTitle>No Menu Items Found</AlertTitle>
          <AlertDescription>
            It looks like there are no master menu items set up for {cuisine} food yet.
          </AlertDescription>
        </Alert>
      </>
    );
  }

  return (
    <div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {categories.map((category) => (
            <Link key={category.id} href={`/menu/${cuisine.toLowerCase()}/${category.id}`} passHref>
                <Card 
                    className="cursor-pointer hover:bg-muted/50 transition-colors h-full"
                >
                    <CardHeader>
                    <CardTitle className="text-lg">{category.name}</CardTitle>
                    </CardHeader>
                </Card>
            </Link>
        ))}
        </div>
    </div>
  );
}
