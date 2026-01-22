
'use client';

import { useCollection, useFirestore } from '@/firebase';
import { useDoc } from '@/firebase/firestore/use-doc';
import { type CookMenuItem, type Restaurant, type User as AppUser, type BasketItem } from '@/lib/types';
import { collection, doc } from 'firebase/firestore';
import { useMemo, useState, useEffect } from 'react';
import { notFound, useRouter, useParams, useSearchParams } from 'next/navigation';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Star, Utensils, ChevronLeft, MapPin, Plus } from 'lucide-react';
import Image from 'next/image';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { calculateDistance } from '@/lib/utils';
import { ExpandableText } from '@/components/expandable-text';
import { useBasket } from '@/context/basket-context';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
  } from '@/components/ui/alert-dialog';
import { sendCookAlert } from '@/ai/flows/send-cook-alert-flow';
import { useToast } from '@/hooks/use-toast';

export default function CookPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const userId = params.userId as string;
  const categoryId = searchParams.get('category');
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();
  const [browserLocation, setBrowserLocation] = useState<{ latitude: number; longitude: number; } | null>(null);
  const { basket, addItem, clearBasket } = useBasket();
  const [showClearBasketDialog, setShowClearBasketDialog] = useState(false);
  const [itemToAdd, setItemToAdd] = useState<CookMenuItem | null>(null);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setBrowserLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
        },
        (error) => {
          console.error("Error getting location:", error);
          // Handle error if needed, for now we just won't show distance
        }
      );
    }
  }, []);

  const userRef = useMemo(() => {
    if (!firestore) return null;
    return doc(firestore, 'users', userId);
  }, [firestore, userId]);

  const restaurantRef = useMemo(() => {
    if (!firestore) return null;
    return doc(firestore, 'restaurants', userId);
  }, [firestore, userId]);

  const menuItemsRef = useMemo(() => {
    if (!firestore) return null;
    return collection(firestore, 'restaurants', userId, 'menuItems');
  }, [firestore, userId]);

  const { data: user, loading: userLoading } = useDoc<AppUser>(userRef);
  const { data: restaurant, loading: restaurantLoading } = useDoc<Restaurant>(restaurantRef);
  const { data: menuItems, loading: menuItemsLoading } = useCollection<CookMenuItem>(menuItemsRef);

  const filteredMenuItems = useMemo(() => {
    if (!menuItems) return [];
    if (categoryId) {
      return menuItems.filter(item => item.masterCategoryId === categoryId);
    }
    return menuItems;
  }, [menuItems, categoryId]);


  const loading = userLoading || restaurantLoading || menuItemsLoading;

  const distance = useMemo(() => {
    if (browserLocation && restaurant?.latitude && restaurant?.longitude) {
      return calculateDistance(
        browserLocation.latitude,
        browserLocation.longitude,
        restaurant.latitude,
        restaurant.longitude
      ) / 1000; // to km
    }
    return null;
  }, [browserLocation, restaurant]);

  const processAddItem = (item: CookMenuItem) => {
    if (!restaurant || !user || !user.email) return;
  
    const basketItem: BasketItem = {
      ...item,
      quantity: 1,
      restaurantId: restaurant.id,
      restaurantName: restaurant.name,
    };
    addItem(basketItem);
  
    // Fire-and-forget the alert without awaiting it.
    sendCookAlert({
      cookEmail: user.email,
      cookDisplayName: user.displayName,
      itemName: item.name,
    })
      .then(response => {
        if (response.success) {
          console.log("Cook alert sent successfully:", response.message);
        } else {
          console.error("Failed to send cook alert:", response.message);
        }
      })
      .catch(error => {
        console.error("An unexpected error occurred while sending cook alert:", error);
      });
  };

  const handleAddItemClick = (item: CookMenuItem) => {
    if (!restaurant) return;
  
    // Check if basket is empty or if the item is from the same restaurant
    if (basket.length === 0 || basket[0].restaurantId === restaurant.id) {
      processAddItem(item);
    } else {
      // If from a different restaurant, show confirmation dialog
      setItemToAdd(item);
      setShowClearBasketDialog(true);
    }
  };

  const handleConfirmClearBasket = () => {
    if (itemToAdd && restaurant) {
      clearBasket();
      processAddItem(itemToAdd);
    }
    setShowClearBasketDialog(false);
    setItemToAdd(null);
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        <Skeleton className="h-12 w-48 mb-8" />
        <div className="flex flex-col md:flex-row gap-8 items-start">
            <Skeleton className="w-full md:w-1/3 aspect-square rounded-lg" />
            <div className="w-full md:w-2/3 space-y-4">
              <Skeleton className="h-10 w-3/4" />
              <Skeleton className="h-6 w-1/2" />
            </div>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-48 w-full rounded-lg" />
            ))}
          </div>
      </div>
    );
  }

  if (!restaurant || !user) {
    notFound();
  }
  
  const displayName = restaurant.name;

  return (
    <main className="container mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        <AlertDialog open={showClearBasketDialog} onOpenChange={setShowClearBasketDialog}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Start a New Basket?</AlertDialogTitle>
                    <AlertDialogDescription>
                        Your current basket contains items from a different restaurant. Would you like to clear it and start a new one with this item?
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel onClick={() => setItemToAdd(null)}>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleConfirmClearBasket}>Clear Basket & Add</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-4 mb-4">
            <Avatar className="w-12 h-12 rounded-full border-2 border-primary shadow-lg">
                <AvatarImage src={restaurant.restaurantImageUrl} alt={displayName} className="object-cover" />
                <AvatarFallback className="text-2xl rounded-full">{displayName?.charAt(0) ?? 'C'}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
                <h1 className="font-headline text-2xl font-bold text-foreground truncate">{displayName}</h1>
                <div className='flex items-center flex-wrap gap-x-4 gap-y-1 text-md text-muted-foreground mt-1'>
                    {distance !== null && (
                    <div className="flex items-center gap-1">
                        <MapPin className="w-4 h-4" />
                        <span>{distance.toFixed(1)} km</span>
                    </div>
                    )}
                    <div className="flex items-center gap-1">
                        <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                        <span>{restaurant.rating || 0}</span>
                    </div>
                </div>
            </div>
        </div>

        {restaurant.description && (
          <div className="mb-8">
             <ExpandableText text={restaurant.description} maxLength={200} />
          </div>
        )}

        {restaurant.showcaseImageUrls && restaurant.showcaseImageUrls.length > 0 && (
          <div className="mb-8">
            <Carousel className="w-full">
              <CarouselContent>
                {restaurant.showcaseImageUrls.map((url, index) => (
                  <CarouselItem key={index} className="md:basis-1/2 lg:basis-1/3">
                    <div className="aspect-video relative rounded-lg overflow-hidden">
                      <Image src={url} alt={`Showcase image ${index + 1}`} fill className="object-cover" />
                    </div>
                  </CarouselItem>
                ))}
              </CarouselContent>
              <CarouselPrevious className="absolute left-2 top-1/2 -translate-y-1/2" />
              <CarouselNext className="absolute right-2 top-1/2 -translate-y-1/2" />
            </Carousel>
          </div>
        )}

        <h2 className="font-headline text-3xl font-bold text-foreground mb-6 border-b pb-2">
            Menu
        </h2>

        {filteredMenuItems && filteredMenuItems.length > 0 ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredMenuItems.map((item) => (
              <Card key={item.id} className="flex flex-col overflow-hidden">
                {item.imageUrls && item.imageUrls.length > 0 ? (
                  <div className="relative">
                     <Carousel className="w-full">
                        <CarouselContent>
                            {item.imageUrls.map((url, index) => (
                                <CarouselItem key={index}>
                                    <div className="aspect-video relative">
                                        <Image src={url} alt={item.name} fill className="object-cover" />
                                    </div>
                                </CarouselItem>
                            ))}
                        </CarouselContent>
                        {item.imageUrls.length > 1 && (
                            <>
                                <CarouselPrevious className="absolute left-2 top-1/2 -translate-y-1/2" />
                                <CarouselNext className="absolute right-2 top-1/2 -translate-y-1/2" />
                            </>
                        )}
                    </Carousel>
                  </div>
                ) : (
                    <div className="aspect-video bg-muted flex items-center justify-center">
                        <Utensils className="w-12 h-12 text-muted-foreground" />
                    </div>
                )}
                <CardHeader>
                  <CardTitle>{item.name}</CardTitle>
                </CardHeader>
                <CardContent className="flex-grow">
                  <ExpandableText text={item.description} maxLength={125} />
                  {item.tags && item.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-4">
                      {item.tags.map((tag) => (
                        <Badge key={tag} variant="secondary">{tag}</Badge>
                      ))}
                    </div>
                  )}
                </CardContent>
                <CardFooter className='flex items-center justify-between'>
                    <p className="font-semibold text-xl text-primary">£{item.price.toFixed(2)}</p>
                    <Button onClick={() => handleAddItemClick(item)}>
                        <Plus className="mr-2 h-4 w-4" /> Add to Basket
                    </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        ) : (
          <Alert>
            <Utensils className="h-4 w-4" />
            <AlertTitle>Menu Coming Soon!</AlertTitle>
            <AlertDescription>
                {categoryId 
                ? "This cook hasn't added their version of this dish yet."
                : "This cook hasn't added any items to their menu yet. Check back later!"
                }
            </AlertDescription>
          </Alert>
        )}
      </main>
  );
}
