
'use client';

import { collection, query, where, getDocs } from 'firebase/firestore';
import React, { useState, useMemo, useEffect } from 'react';

import { useCollection, useFirestore } from '@/firebase';
import { type Restaurant } from '@/lib/types';
import { calculateDistance } from '@/lib/utils';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from './ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { Loader2, MapPin, Star, Utensils, FileText } from 'lucide-react';
import { Button } from './ui/button';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import { useToast } from '@/hooks/use-toast';

type RestaurantTableProps = {
  browserLocation: { latitude: number; longitude: number } | null;
  masterCategoryId?: string;
  maxDistance?: number;
};

export default function RestaurantTable({
  browserLocation,
  masterCategoryId,
  maxDistance,
}: RestaurantTableProps) {
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();

  const [locationError, setLocationError] = useState<string | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [localBrowserLocation, setLocalBrowserLocation] = useState(
    browserLocation
  );

  useEffect(() => {
    if (browserLocation) {
      setLocalBrowserLocation(browserLocation);
    }
  }, [browserLocation]);

  const getLocation = () => {
    setLocationLoading(true);
    setLocationError(null);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocalBrowserLocation({
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
  };

  const restaurantsQuery = useMemo(() => {
    if (!firestore) return null;
    // We only want to show restaurants that are marked as available.
    return query(collection(firestore, 'restaurants'), where('isAvailable', '==', true));
  }, [firestore]);
  
  const { data: allRestaurants, loading: restaurantsLoading } =
    useCollection<Restaurant>(restaurantsQuery);

  const [restaurantsWithItem, setRestaurantsWithItem] = useState<string[]>([]);
  const [checkingItems, setCheckingItems] = useState(false);
  
  // This effect runs only when we need to filter by a specific menu item.
  useEffect(() => {
      if (!firestore || !masterCategoryId) {
        setCheckingItems(false);
        return;
      }
      
      // `allRestaurants` is already filtered by `isAvailable: true` from the query
      const availableRestaurants = allRestaurants;

      if (!availableRestaurants || availableRestaurants.length === 0) {
        setRestaurantsWithItem([]);
        setCheckingItems(false);
        return;
      }
      
      setCheckingItems(true);
      const checkMenuItems = async () => {
          const restaurantIds = await Promise.all(
            availableRestaurants.map(async (restaurant) => {
              const menuItemsRef = collection(firestore, 'restaurants', restaurant.id, 'menuItems');
              const q = query(menuItemsRef, where('masterCategoryId', '==', masterCategoryId));
              const menuItemsSnapshot = await getDocs(q);
              return menuItemsSnapshot.empty ? null : restaurant.id;
            })
          );
          setRestaurantsWithItem(restaurantIds.filter((id): id is string => id !== null));
          setCheckingItems(false);
      }
      checkMenuItems();

  }, [firestore, masterCategoryId, allRestaurants]);
  
  
  const restaurantsToDisplay = useMemo(() => {
    let sourceRestaurants = allRestaurants || [];
  
    // Filter by master category if provided
    if (masterCategoryId) {
      sourceRestaurants = sourceRestaurants.filter(r => restaurantsWithItem.includes(r.id));
    }
  
    // Calculate distance if location is available
    const restaurantsWithDistance = localBrowserLocation
      ? sourceRestaurants
          .filter((restaurant) => restaurant.latitude && restaurant.longitude)
          .map((restaurant) => {
            const distance = calculateDistance(
              localBrowserLocation!.latitude,
              localBrowserLocation!.longitude,
              restaurant.latitude!,
              restaurant.longitude!
            );
            return { ...restaurant, distance: distance / 1000 }; // Convert to km
          })
      : sourceRestaurants.map(r => ({ ...r, distance: undefined }));
  
    let filteredList = restaurantsWithDistance;
  
    // Filter by max distance if provided
    if (maxDistance !== undefined && localBrowserLocation) {
        filteredList = filteredList.filter(r => r.distance !== undefined && r.distance <= maxDistance);
    }
  
    // Sort by distance if available, otherwise keep original order
    if (localBrowserLocation) {
      return filteredList.sort((a, b) => (a.distance || Infinity) - (b.distance || Infinity));
    }
  
    return filteredList;
  }, [allRestaurants, localBrowserLocation, masterCategoryId, restaurantsWithItem, maxDistance]);
  
  const isLoading = restaurantsLoading || (masterCategoryId && checkingItems);

  if (!masterCategoryId && !localBrowserLocation && !locationLoading && !locationError) {
    return (
      <div className="flex flex-col items-center justify-center text-center p-6 border rounded-lg">
        <MapPin className="h-12 w-12 text-primary mb-4" />
        <AlertTitle className="text-lg font-semibold mb-2">
          Find Restaurants Near You
        </AlertTitle>
        <AlertDescription className="mb-4 text-muted-foreground">
          We need your location to show you restaurants in your area.
        </AlertDescription>
        <Button onClick={getLocation} disabled={locationLoading}>
          {locationLoading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <MapPin className="mr-2 h-4 w-4" />
          )}
          Use My Location
        </Button>
      </div>
    );
  }


  if (isLoading) {
    return (
        <div className="rounded-lg border">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead><Skeleton className="h-5 w-32" /></TableHead>
                        <TableHead><Skeleton className="h-5 w-12" /></TableHead>
                        <TableHead className="text-right"><Skeleton className="h-5 w-24 ml-auto" /></TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                {Array.from({ length: 3 }).map((_, i) => (
                    <TableRow key={i}>
                        <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                        <TableCell><Skeleton className="h-6 w-6 rounded-full" /></TableCell>
                        <TableCell className="text-right"><Skeleton className="h-5 w-20 ml-auto" /></TableCell>
                    </TableRow>
                ))}
                </TableBody>
            </Table>
        </div>
    );
  }

  if (locationError) {
    return (
      <Alert variant="destructive">
        <MapPin className="h-4 w-4" />
        <AlertTitle>Location Error</AlertTitle>
        <AlertDescription>{locationError}</AlertDescription>
      </Alert>
    );
  }

  if (restaurantsToDisplay.length === 0 && !isLoading) {
    return (
      <Alert>
        <Utensils className="h-4 w-4" />
        <AlertTitle>No Restaurants Found</AlertTitle>
        <AlertDescription>
          {masterCategoryId
            ? 'No restaurants are currently offering this dish within the selected distance.'
            : 'No available restaurants were found. Please check back later or try increasing the distance.'}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <TooltipProvider>
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Bio</TableHead>
            <TableHead className="text-right">Distance</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {restaurantsToDisplay.map((restaurant) => {
            const url = `/cook/${restaurant.id}${masterCategoryId ? `?category=${masterCategoryId}` : ''}`;
            const name = restaurant.name || 'Unnamed Restaurant';
            return (
                <TableRow key={restaurant.id}>
                    <TableCell className="font-medium">
                        <Link href={url} className="hover:underline">
                            {name}
                        </Link>
                    </TableCell>
                    <TableCell>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={(e) => {
                                    e.stopPropagation();
                                    toast({
                                        title: "Coming Soon!",
                                        description: "Cook biographies will be available in a future update.",
                                    });
                                    }}
                                >
                                    <FileText className="h-6 w-6 text-muted-foreground" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>View Bio</p>
                            </TooltipContent>
                        </Tooltip>
                    </TableCell>
                    <TableCell className='text-right'>
                        {restaurant.distance !== undefined ? `${restaurant.distance.toFixed(2)} km` : 'N/A'}
                    </TableCell>
                </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
    </TooltipProvider>
  );
}
