
'use client';

import RestaurantTable from '@/components/restaurant-table';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useFirestore } from '@/firebase';
import { useDoc } from '@/firebase/firestore/use-doc';
import type { MasterMenuCategory } from '@/lib/types';
import { doc } from 'firebase/firestore';
import { ChevronLeft, Loader2, MapPin } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export default function CategoryPage() {
  const params = useParams();
  const router = useRouter();
  const firestore = useFirestore();

  const categoryId = params.categoryId as string;
  const [browserLocation, setBrowserLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [locationLoading, setLocationLoading] = useState(true);
  const [maxDistance, setMaxDistance] = useState<number>(5);

  const distanceOptions = [5, 10, 15, 20, 25, 30, 35, 40, 45, 50];

  const categoryRef = useMemo(() => {
    if (!firestore || !categoryId) return null;
    return doc(firestore, 'masterMenuCategories', categoryId);
  }, [firestore, categoryId]);

  const {data: selectedCategory, loading: categoryLoading} = useDoc<MasterMenuCategory>(categoryRef);

  // Get user location
  useEffect(() => {
    setLocationLoading(true);
    setLocationError(null);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setBrowserLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
          setLocationError(null);
          setLocationLoading(false);
        },
        (error) => {
          console.error('Error getting location:', error);
          setLocationError(
            'Could not get your location. Please ensure location services are enabled and permissions are granted.'
          );
          setLocationLoading(false);
        }
      );
    } else {
      setLocationError('Geolocation is not supported by this browser.');
      setLocationLoading(false);
    }
  }, []);


  if (categoryLoading) {
      return (
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 pb-16">
            <div className="flex items-center justify-between mb-4">
                <Skeleton className="h-10 w-24" />
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-10 w-44" />
            </div>
            <Skeleton className="h-[400px] w-full" />
        </div>
      )
  }

  if (locationError) {
    return (
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 pb-16">
             <Alert variant="destructive">
                <MapPin className="h-4 w-4" />
                <AlertTitle>Location Error</AlertTitle>
                <AlertDescription>{locationError}</AlertDescription>
            </Alert>
        </div>
    );
  }

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        <div className="mb-4">
            <h2 className="text-3xl font-bold font-headline text-center">
                {selectedCategory?.name}
            </h2>
        </div>
        <div className="flex justify-center mb-4">
            <div className="w-auto">
                <Select
                    value={maxDistance.toString()}
                    onValueChange={(value) => setMaxDistance(Number(value))}
                >
                    <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Distance" />
                    </SelectTrigger>
                    <SelectContent>
                    {distanceOptions.map((dist) => (
                        <SelectItem key={dist} value={dist.toString()}>
                        Within {dist} km
                        </SelectItem>
                    ))}
                    </SelectContent>
                </Select>
            </div>
        </div>
      {browserLocation ? (
        <RestaurantTable
          browserLocation={browserLocation}
          masterCategoryId={categoryId}
          maxDistance={maxDistance}
        />
      ) : (
        <div className="flex items-center justify-center p-4">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          <p>Waiting for location...</p>
        </div>
      )}
    </div>
  );
}
