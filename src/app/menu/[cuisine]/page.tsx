
'use client';

import { MasterMenu } from '@/components/master-menu';
import { useParams } from 'next/navigation';

type Cuisine = 'English' | 'Indian' | 'Italian';

function capitalizeFirstLetter(string: string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}

export default function CuisineMenuPage() {
  const params = useParams();
  const cuisine = capitalizeFirstLetter(params.cuisine as string) as Cuisine;

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        <div className="mb-4">
            <h2 className="text-3xl font-bold font-headline text-center">{cuisine}</h2>
        </div>
      <MasterMenu cuisine={cuisine} />
    </div>
  );
}
