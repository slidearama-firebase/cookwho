'use client';

import RestaurantTable from '@/components/restaurant-table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, MapPin } from 'lucide-react';
import { useEffect, useState } from 'react';

export default function Home() {
  const [browserLocation, setBrowserLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [locationLoading, setLocationLoading] = useState(true);
  const [maxDistance, setMaxDistance] = useState<number>(15);

  const distanceOptions = [5, 10, 15, 20, 25, 30, 50, 100];

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
            'Could not get your location. Please ensure location services are enabled and permissions are granted for this site.'
          );
          setLocationLoading(false);
        }
      );
    } else {
      setLocationError('Geolocation is not supported by this browser.');
      setLocationLoading(false);
    }
  }, []);

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 pb-16">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold font-headline">
          Find local home cooks
        </h2>
        <p className="text-muted-foreground mt-2">
          Discover talented cooks in your area, ready to prepare delicious
          home-cooked meals.
        </p>
      </div>

      {locationLoading && (
        <div className="flex items-center justify-center p-4">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          <p>Getting your location to find nearby cooks...</p>
        </div>
      )}

      {locationError && (
        <Alert variant="destructive" className="max-w-xl mx-auto">
          <MapPin className="h-4 w-4" />
          <AlertTitle>Location Error</AlertTitle>
          <AlertDescription>{locationError}</AlertDescription>
        </Alert>
      )}

      {browserLocation && (
        <>
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
          <RestaurantTable
            browserLocation={browserLocation}
            maxDistance={maxDistance}
          />
        </>
      )}

      {/* This will be shown by RestaurantTable itself if location is denied after initial load */}
      {!locationLoading && !browserLocation && !locationError && (
        <RestaurantTable browserLocation={null} />
      )}
    </div>
  );
}
