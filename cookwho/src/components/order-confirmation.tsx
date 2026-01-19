
'use client';

// This component is not currently used as Stripe payments are disabled.
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle } from 'lucide-react';
import Link from 'next/link';

export function OrderConfirmation() {
  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center py-10">
      <Card className="max-w-lg mx-auto">
        <CardContent className="pt-6">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-semibold mb-2 text-center">
              Order Confirmed (Demo)
            </h2>
            <p className="text-muted-foreground mb-6 text-center">
              This is a placeholder confirmation as payments are disabled.
            </p>
          <Button asChild className="w-full">
            <Link href="/">Return to Homepage</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
