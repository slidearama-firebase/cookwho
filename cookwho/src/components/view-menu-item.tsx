'use client';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from '@/components/ui/dialog';
import { useFirestore, useStorage, useUser, useDoc } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import type { CookMenuItem } from '@/lib/types';
import { deleteDoc, doc } from 'firebase/firestore';
import { deleteObject, ref } from 'firebase/storage';
import { Edit, Loader2, Trash2, Utensils } from 'lucide-react';
import Image from 'next/image';
import { useState, useMemo } from 'react';
import { CookEditItemForm } from './cook-edit-item-form';

type ViewMenuItemProps = {
  item: CookMenuItem;
};

export function ViewMenuItem({ item: initialItem }: ViewMenuItemProps) {
  const { user } = useUser();
  const firestore = useFirestore();
  const storage = useStorage();
  const { toast } = useToast();
  const [isDeleting, setIsDeleting] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  // Create a real-time listener for the specific menu item
  const menuItemRef = useMemo(() => {
    if (!firestore || !user) return null;
    return doc(
      firestore,
      'restaurants',
      user.uid,
      'menuItems',
      initialItem.id
    );
  }, [firestore, user, initialItem.id]);

  // `item` is now always the latest version from Firestore
  const { data: item, loading: itemLoading } = useDoc<CookMenuItem>(menuItemRef);

  const getRelativePathFromUrl = (url: string): string | null => {
    try {
      if (!url.startsWith('https://firebasestorage.googleapis.com')) {
        return null;
      }
      const urlObject = new URL(url);
      // The path we want is in the pathname, after /o/ and before the query string
      const path = urlObject.pathname;
      const parts = path.split('/');
      // The actual path is after the '/o/' part in the URL, and it's URL-encoded
      const filePath = decodeURIComponent(
        parts.slice(parts.indexOf('o') + 1).join('/')
      );
      return filePath;
    } catch (error) {
      console.error('Invalid Firebase Storage URL:', url, error);
      return null;
    }
  };

  const handleDelete = async () => {
    if (!firestore || !user || !storage || !item) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Could not connect to the database or item not found.',
      });
      return;
    }

    setIsDeleting(true);
    try {
      // 1. Delete images from Cloud Storage
      if (item.imageUrls && item.imageUrls.length > 0) {
        const deletePromises = item.imageUrls.map(async (url) => {
          const storagePath = getRelativePathFromUrl(url);
          if (!storagePath) {
            console.warn(`Could not determine storage path from URL: ${url}`);
            return;
          }
          try {
            const imageRef = ref(storage, storagePath);
            await deleteObject(imageRef);
          } catch (error: any) {
            if (error.code !== 'storage/object-not-found') {
              console.warn(`Failed to delete image ${url}:`, error.message);
            }
          }
        });
        await Promise.all(deletePromises);
      }

      // 2. Delete the document from Firestore
      const docRef = doc(
        firestore,
        'restaurants',
        user.uid,
        'menuItems',
        item.id
      );
      await deleteDoc(docRef);

      toast({
        title: 'Success!',
        description: `"${item.name}" has been deleted from your menu.`,
      });
      // The dialog will close automatically as the item is removed from the collection
    } catch (error: any) {
      console.error('Error deleting menu item:', error);
      toast({
        variant: 'destructive',
        title: 'Uh oh! Something went wrong.',
        description: 'Could not delete the menu item. Please try again.',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  if (itemLoading || !item) {
    // You can return a skeleton loader here if you want
    return null;
  }

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-0">
        <div className="grid grid-cols-3">
          <div className="col-span-1">
            {item.imageUrls && item.imageUrls.length > 0 ? (
              <Carousel className="w-full">
                <CarouselContent>
                  {item.imageUrls.map((url, index) => (
                    <CarouselItem key={index}>
                      <div className="aspect-square relative">
                        <Image
                          src={url}
                          alt={item.name}
                          fill
                          className="object-cover"
                        />
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
            ) : (
              <div className="aspect-square bg-muted flex items-center justify-center">
                <Utensils className="w-10 h-10 text-muted-foreground" />
              </div>
            )}
          </div>
          <div className="col-span-2 flex flex-col">
            <CardHeader>
              <CardTitle>{item.name}</CardTitle>
              <p className="font-semibold text-lg text-primary">
                £{item.price.toFixed(2)}
              </p>
            </CardHeader>
            <CardContent className="flex-grow">
              <p className="text-sm text-muted-foreground mb-2">
                {item.description}
              </p>
              {item.tags && item.tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {item.tags.map((tag) => (
                    <Badge key={tag} variant="secondary">
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}
            </CardContent>
            <CardFooter className="justify-end gap-2">
              <Dialog
                open={isEditDialogOpen}
                onOpenChange={setIsEditDialogOpen}
              >
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Edit className="mr-2 h-4 w-4" /> Edit
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Edit: {item.name}</DialogTitle>
                    <DialogDescription>
                      Make changes to your menu item here. Click the save
                      buttons when you're done.
                    </DialogDescription>
                  </DialogHeader>
                  <CookEditItemForm
                    item={item}
                    onSuccess={() => setIsEditDialogOpen(false)}
                  />
                </DialogContent>
              </Dialog>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="destructive"
                    size="sm"
                    disabled={isDeleting}
                  >
                    {isDeleting ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="mr-2 h-4 w-4" />
                    )}
                    Delete
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>
                      Are you absolutely sure?
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      This action cannot be undone. This will permanently delete
                      the menu item
                      <span className="font-semibold"> "{item.name}" </span>
                      and all its associated images.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete}>
                      Continue
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </CardFooter>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
