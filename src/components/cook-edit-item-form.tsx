
'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useFieldArray, useForm } from 'react-hook-form';
import * as z from 'zod';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useUser } from '@/firebase/auth/use-user';
import { useFirestore, useStorage } from '@/firebase/provider';
import { useToast } from '@/hooks/use-toast';
import React, { useEffect, useState } from 'react';
import { Edit, Loader2, Trash2, Utensils } from 'lucide-react';
import {
  deleteObject,
  getDownloadURL,
  ref,
  uploadBytes,
} from 'firebase/storage';
import { doc, updateDoc } from 'firebase/firestore';
import { type CookMenuItem } from '@/lib/types';
import Image from 'next/image';
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
} from './ui/alert-dialog';
import { Textarea } from './ui/textarea';
import { cn, compressImage } from '@/lib/utils';
import { ScrollArea } from './ui/scroll-area';

const formSchema = z.object({
  name: z.string().min(1, 'Please give your dish a name.'),
  description: z.string().min(1, 'Please describe your dish.'),
  price: z
    .string()
    .refine((val) => /^\d+(\.\d{1,2})?$/.test(val), {
      message:
        'Price must be a valid number with up to two decimal places (e.g., 9.99).',
    })
    .transform((val) => parseFloat(val)),
  tags: z
    .array(
      z.object({
        value: z.string().min(1, 'Tag cannot be empty.'),
      })
    )
    .max(4, 'You can add a maximum of 4 tags.'),
});

type CookEditItemFormProps = {
  item: CookMenuItem;
  onSuccess?: () => void;
};

type ImageState = {
  key: string;
  file?: File;
  existingUrl?: string;
  preview: string;
};

export function CookEditItemForm({ item, onSuccess }: CookEditItemFormProps) {
  const { user } = useUser();
  const firestore = useFirestore();
  const storage = useStorage();
  const { toast } = useToast();
  const [textLoading, setTextLoading] = useState(false);
  const [imageLoading, setImageLoading] = useState(false);

  const [images, setImages] = useState<ImageState[]>(
    () =>
      item.imageUrls?.map((url) => ({
        key: url,
        existingUrl: url,
        preview: url,
      })) || []
  );

  const [imagesToDelete, setImagesToDelete] = useState<string[]>([]);
  const [imageStateChanged, setImageStateChanged] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    values: {
      name: item.name || '',
      description: item.description || '',
      price: item.price.toString() || '0',
      tags: item.tags?.map((tag) => ({ value: tag })) || [],
    },
  });

  const {
    fields: tagFields,
    append: appendTag,
    remove: removeTag,
  } = useFieldArray({
    control: form.control,
    name: 'tags',
  });

  useEffect(() => {
    return () => {
      images.forEach((image) => {
        if (image.preview && image.preview.startsWith('blob:')) {
          URL.revokeObjectURL(image.preview);
        }
      });
    };
  }, [images]);

  const generateRandomString = (length: number) => {
    const characters =
      'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return result;
  };

  const getRelativePathFromUrl = (url: string): string | null => {
    try {
      if (!url.startsWith('https://firebasestorage.googleapis.com')) {
        return null;
      }
      const urlObject = new URL(url);
      const path = urlObject.pathname;
      const parts = path.split('/');
      const filePath = decodeURIComponent(
        parts.slice(parts.indexOf('o') + 1).join('/')
      );
      return filePath;
    } catch (error) {
      console.error('Invalid Firebase Storage URL:', url, error);
      return null;
    }
  };

  const onTextSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!firestore || !user) return;
    setTextLoading(true);

    try {
      const menuItemRef = doc(
        firestore,
        'restaurants',
        user.uid,
        'menuItems',
        item.id
      );
      await updateDoc(menuItemRef, {
        name: values.name,
        description: values.description,
        price: values.price,
        tags: values.tags.map((tag) => tag.value),
      });

      toast({
        title: 'Success!',
        description: `The details for "${values.name}" have been updated.`,
      });
      onSuccess?.();
    } catch (error: any) {
      console.error('Error updating menu item text: ', error);
      toast({
        variant: 'destructive',
        title: 'Uh oh! Something went wrong.',
        description: 'Could not update your menu item text. Please try again.',
      });
    } finally {
      setTextLoading(false);
    }
  };

  const onImageSubmit = async () => {
    if (!imageStateChanged) {
      toast({ title: 'No image changes to save.' });
      return;
    }
    if (!firestore || !user || !storage) return;

    if (images.length === 0) {
      toast({
        variant: 'destructive',
        title: 'Validation Error',
        description: 'At least one image is required.',
      });
      return;
    }

    setImageLoading(true);

    try {
      // Delete images marked for deletion from Storage
      if (imagesToDelete.length > 0) {
        const deletePromises = imagesToDelete.map(async (url) => {
          const storagePath = getRelativePathFromUrl(url);
          if (!storagePath) {
            console.warn(`Could not determine storage path from URL: ${url}`);
            return; // Skip if path is invalid
          }
          try {
            const imageRef = ref(storage, storagePath);
            await deleteObject(imageRef);
          } catch (error: any) {
            // It's okay if the object doesn't exist, log other errors
            if (error.code !== 'storage/object-not-found') {
              console.warn(`Failed to delete image ${storagePath}:`, error.message);
            }
          }
        });
        await Promise.all(deletePromises);
      }

      // Upload new images and collect all final URLs
      const uploadPromises = images.map(async (imageState) => {
        if (imageState.file) {
          const compressedFile = await compressImage(imageState.file, {
            maxWidth: 1024,
            quality: 0.8,
          });
          const fileExtension = compressedFile.name.split('.').pop();
          const randomName = generateRandomString(20);
          const newFileName = `${randomName}.${fileExtension}`;

          const storageRef = ref(
            storage,
            `restaurants/${user.uid}/menuItems/${item.id}/${newFileName}`
          );
          const uploadResult = await uploadBytes(storageRef, compressedFile);
          return getDownloadURL(uploadResult.ref);
        } else if (imageState.existingUrl) {
          // It's an existing image
          return imageState.existingUrl;
        }
        return null;
      });

      const finalImageUrls = (await Promise.all(uploadPromises)).filter(
        (url): url is string => url !== null
      );

      // Update Firestore with the new array of image URLs
      const menuItemRef = doc(
        firestore,
        'restaurants',
        user.uid,
        'menuItems',
        item.id
      );
      await updateDoc(menuItemRef, {
        imageUrls: finalImageUrls,
      });

      toast({
        title: 'Success!',
        description: `Images for "${item.name}" have been updated.`,
      });
      setImageStateChanged(false);
      setImagesToDelete([]);
      onSuccess?.(); // This will trigger the parent `useDoc` to get the latest data
    } catch (error: any) {
      console.error('Error updating images:', error);
      toast({
        variant: 'destructive',
        title: 'Image Update Failed',
        description: 'Could not save the image changes. Please try again.',
      });
    } finally {
      setImageLoading(false);
    }
  };

  const handleAddImage = (file: File) => {
    if (images.length >= 4) {
      toast({
        variant: 'destructive',
        title: 'You can add a maximum of 4 images.',
      });
      return;
    }
    const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
    const ACCEPTED_IMAGE_TYPES = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/webp',
    ];

    if (file.size > MAX_FILE_SIZE) {
      toast({ variant: 'destructive', title: `Max image size is 5MB.` });
      return;
    }
    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      toast({
        variant: 'destructive',
        title: `Only .jpg, .jpeg, .png and .webp formats are supported.`,
      });
      return;
    }

    const newImage: ImageState = {
      key: `${file.name}-${file.lastModified}-${Math.random()}`,
      file: file,
      preview: URL.createObjectURL(file),
    };

    setImages((prev) => [...prev, newImage]);
    setImageStateChanged(true);
  };

  const handleRemoveImage = (indexToRemove: number) => {
    const imageToRemove = images[indexToRemove];

    // If it's an existing image, add its URL to the deletion queue
    if (imageToRemove.existingUrl) {
      setImagesToDelete((prev) => [...prev, imageToRemove.existingUrl!]);
    }

    // Revoke the blob URL to free memory if it's a new file preview
    if (imageToRemove.preview && imageToRemove.preview.startsWith('blob:')) {
      URL.revokeObjectURL(imageToRemove.preview);
    }

    setImages((prev) => prev.filter((_, index) => index !== indexToRemove));
    setImageStateChanged(true);
  };

  return (
    <ScrollArea className="max-h-[70vh] pr-6">
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onTextSubmit)}
          className="space-y-4"
        >
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Item's Title</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Description</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Describe your version of this dish"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="price"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Price (£)</FormLabel>
                <FormControl>
                  <Input
                    type="text"
                    inputMode="decimal"
                    placeholder="e.g., 8.50"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div>
            <FormLabel>Tags</FormLabel>
            <FormDescription className="mb-2">
              Add up to 4 tags to highlight key ingredients.
            </FormDescription>
            <div className="space-y-2">
              {tagFields.map((field, index) => (
                <FormField
                  key={field.id}
                  control={form.control}
                  name={`tags.${index}.value`}
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex items-center gap-2">
                        <FormControl>
                          <Input placeholder="e.g., Free Range Eggs" {...field} />
                        </FormControl>
                        <Button
                          type="button"
                          variant="destructive"
                          size="icon"
                          onClick={() => removeTag(index)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ))}
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              className={cn('mt-2', tagFields.length >= 4 && 'hidden')}
              onClick={() => appendTag({ value: '' })}
            >
              Add Tag
            </Button>
            <FormMessage>{form.formState.errors.tags?.message}</FormMessage>
          </div>

          <Button
            type="submit"
            disabled={textLoading || !form.formState.isDirty}
            className="w-full"
          >
            {textLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Text Changes
          </Button>
        </form>
        <div className="space-y-4 pt-4">
          <div>
            <FormLabel>Images</FormLabel>
            <FormDescription className="mb-2">
              Manage images for your dish (up to 4). At least one is required.
            </FormDescription>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {images.map((image, index) => (
                <div key={image.key} className="relative aspect-square group">
                  <Image
                    src={image.preview}
                    alt={`Preview ${index}`}
                    fill
                    className="object-cover rounded-md"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          type="button"
                          variant="destructive"
                          size="icon"
                          className="h-8 w-8"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Image?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete this image? This
                            action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleRemoveImage(index)}
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              ))}
              {images.length < 4 && (
                <div className="relative aspect-square rounded-md border-2 border-dashed border-muted-foreground flex items-center justify-center">
                  <div className="text-center text-muted-foreground">
                    <Utensils className="mx-auto h-6 w-6" />
                    <p className="text-xs mt-1">Add Image</p>
                  </div>
                  <div className="absolute inset-0 w-full h-full opacity-0 cursor-pointer">
                    <div className="relative h-full w-full">
                      <Input
                        type="file"
                        accept="image/*"
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        onChange={(e) => {
                          if (e.target.files && e.target.files[0]) {
                            handleAddImage(e.target.files[0]);
                          }
                          e.target.value = ''; // Reset file input
                        }}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {images.length === 0 && (
              <p className="text-sm font-medium text-destructive mt-2">
                At least one image is required.
              </p>
            )}
          </div>

          <Button
            onClick={onImageSubmit}
            disabled={imageLoading || !imageStateChanged}
            className="w-full"
          >
            {imageLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Image Changes
          </Button>
        </div>
      </Form>
    </ScrollArea>
  );
}
