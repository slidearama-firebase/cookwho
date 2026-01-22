'use client';

import Image from 'next/image';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { Card, CardContent } from './ui/card';
import Link from 'next/link';

type Cuisine = 'English' | 'Indian' | 'Italian';

export function CuisineSelection() {
  const cuisineData: {
    name: Cuisine;
    title: string;
    image: (typeof PlaceHolderImages)[0];
  }[] = [
    {
      name: 'English',
      title: 'English',
      image: PlaceHolderImages.find((img) => img.id === 'english-flag')!,
    },
    {
      name: 'Indian',
      title: 'Indian',
      image: PlaceHolderImages.find((img) => img.id === 'indian-flag')!,
    },
    {
      name: 'Italian',
      title: 'Italian',
      image: PlaceHolderImages.find((img) => img.id === 'italian-flag')!,
    },
  ];

  return (
    <div className="text-center">
      <h2 className="text-3xl font-bold font-headline mb-6">Hungry?</h2>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
        {cuisineData.map((cuisine) => (
          <Link
            href={`/menu/${cuisine.name.toLowerCase()}`}
            key={cuisine.name}
            className="block group"
          >
            <Card className="cursor-pointer overflow-hidden h-full">
              <CardContent className="p-0">
                <div className="relative h-32">
                  <Image
                    src={cuisine.image.imageUrl}
                    alt={cuisine.image.description}
                    fill
                    className="object-cover transition-transform duration-300 group-hover:scale-105"
                    data-ai-hint={cuisine.image.imageHint}
                    priority
                  />
                </div>
                <div className="p-4">
                  <h3 className="text-xl font-semibold font-headline">
                    {cuisine.title}
                  </h3>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
