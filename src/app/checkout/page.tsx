
'use client';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UtensilsCrossed } from "lucide-react";
import Link from "next/link";

export default function CheckoutPage() {
  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center py-10">
        <Card className="max-w-lg mx-auto">
            <CardHeader>
                <CardTitle>Checkout Not Available</CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
                <UtensilsCrossed className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground mb-6">
                    Online payments are temporarily disabled. We are working on bringing it back soon.
                </p>
                <Button asChild>
                    <Link href="/">Go back to Homepage</Link>
                </Button>
            </CardContent>
        </Card>
    </div>
  );
}
