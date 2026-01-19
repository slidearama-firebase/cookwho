
'use client';

import { CuisineSelection } from '@/components/cuisine-selection';

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        <CuisineSelection />
      </div>
    </div>
  );
}
