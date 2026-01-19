
'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { useAuth, useFirestore, useStorage, useUser } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { useEffect, useState, useRef } from 'react';
import { Loader2, Trash2, Utensils } from 'lucide-react';
import {
  collection,
  doc,
  getDocs,
  query,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import type { Restaurant, User as AppUser } from '@/lib/types';
import { Switch } from './ui/switch';
import { geocodePostcode } from '@/ai/flows/geocode-flow';
import { sendPasswordResetEmail } from 'firebase/auth';
import { Separator } from './ui/separator';
import { ScrollArea } from './ui/scroll-area';
import Image from 'next/image';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from './ui/alert-dialog';
import { deleteObject, getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { Label } from './ui/label';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { compressImage } from '@/lib/utils';
import { Textarea } from './ui/textarea';

const textFormSchema = z.object({
  displayName: z
    .string()
    .min(1, { message: 'Please enter a name.' })
    .max(30, { message: 'Name must be 30 characters or less.' })
    .regex(/^[a-z0-9]+$/, {
      message:
        'Name must be lowercase and have no spaces or special characters.',
    }),
  description: z.string().max(500, { message: 'Description must be 500 characters or less.' }).optional(),
  isAvailable: z.boolean().default(false),
  mobile: z.string().min(1, 'Mobile number is required.'),
  postcode: z.string().min(1, 'Postcode is required.'),
});

type ImageState = {
  key: string;
  file?: File;
  existingUrl?: string;
  preview: string;
};


// Simple normalization: lowercase and remove non-alphanumeric characters
function normalizeUsername(displayName: string): string {
  const sanitized = displayName.toLowerCase().replace(/[^a-z0-9]/g, '');
  return '@' + sanitized.substring(0, 30);
}

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ACCEPTED_IMAGE_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
];


type CookAccountDialogProps = {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  user: AppUser;
  restaurant: Restaurant;
};

export function CookAccountDialog({
  isOpen,
  onOpenChange,
  user,
  restaurant,
}: CookAccountDialogProps) {
  const { user: authUser } = useUser();
  const auth = useAuth();
  const firestore = useFirestore();
  const storage = useStorage();
  const { toast } = useToast();
  const [textLoading, setTextLoading] = useState(false);
  const [passwordResetLoading, setPasswordResetLoading] = useState(false);
  const [showcaseImageLoading, setShowcaseImageLoading] = useState(false);
  const [avatarLoading, setAvatarLoading] = useState(false);

  const [images, setImages] = useState<ImageState[]>(
    () =>
      restaurant.showcaseImageUrls?.map((url) => ({
        key: url,
        existingUrl: url,
        preview: url,
      })) || []
  );

  const [imagesToDelete, setImagesToDelete] = useState<string[]>([]);
  const [imageStateChanged, setImageStateChanged] = useState(false);
  
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(restaurant.restaurantImageUrl || null);
  const avatarInputRef = useRef<HTMLInputElement>(null);


  const form = useForm<z.infer<typeof textFormSchema>>({
    resolver: zodResolver(textFormSchema),
    defaultValues: {
      displayName: user.displayName || '',
      description: restaurant.description || '',
      isAvailable: restaurant.isAvailable || false,
      mobile: user.mobile || '',
      postcode: user.postcode || '',
    },
  });

  useEffect(() => {
    form.reset({
      displayName: user.displayName || '',
      description: restaurant.description || '',
      isAvailable: restaurant.isAvailable || false,
      mobile: user.mobile || '',
      postcode: user.postcode || '',
    });
    setImages(
        restaurant.showcaseImageUrls?.map((url) => ({
          key: url,
          existingUrl: url,
          preview: url,
        })) || []
      );
      setAvatarPreview(restaurant.restaurantImageUrl || null);
      setAvatarFile(null);

  }, [user, restaurant, form, isOpen]);

  useEffect(() => {
    return () => {
      images.forEach((image) => {
        if (image.preview && image.preview.startsWith('blob:')) {
          URL.revokeObjectURL(image.preview);
        }
      });
      if (avatarPreview && avatarPreview.startsWith('blob:')) {
        URL.revokeObjectURL(avatarPreview);
      }
    };
  }, [images, avatarPreview]);

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

  const onTextSubmit = async (values: z.infer<typeof textFormSchema>) => {
    if (!firestore || !authUser) return;
    setTextLoading(true);

    try {
      const batch = writeBatch(firestore);
      const userDocRef = doc(firestore, 'users', authUser.uid);
      const restaurantDocRef = doc(firestore, 'restaurants', authUser.uid);

      let needsBatchCommit = false;
      let toastDescription = 'No changes were made.';
      const changes: string[] = [];

      // 1. Update availability
      if (values.isAvailable !== restaurant.isAvailable) {
        batch.update(restaurantDocRef, { isAvailable: values.isAvailable });
        changes.push('Restaurant status updated.');
        needsBatchCommit = true;
      }

      // 2. Update displayName if changed
      if (values.displayName && values.displayName !== user.displayName) {
        const username = normalizeUsername(values.displayName);
        const usersRef = collection(firestore, 'users');
        const q = query(usersRef, where('username', '==', username));
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
          throw new Error(
            `Username "${username}" is already taken. Please choose a different name.`
          );
        }

        batch.update(userDocRef, {
          displayName: values.displayName,
          username: username,
        });
        batch.update(restaurantDocRef, { name: values.displayName });

        changes.push(`Restaurant name changed to "${values.displayName}".`);
        needsBatchCommit = true;
      }
      
      // 3. Update description if changed
      if (values.description !== restaurant.description) {
        batch.update(restaurantDocRef, { description: values.description || '' });
        changes.push('Description updated.');
        needsBatchCommit = true;
      }

      // 4. Update mobile number if changed
      if (values.mobile && values.mobile !== user.mobile) {
        batch.update(userDocRef, { mobile: values.mobile });
        changes.push('Mobile number updated.');
        needsBatchCommit = true;
      }

      // 5. Update postcode if changed
      if (values.postcode && values.postcode !== user.postcode) {
        const coords = await geocodePostcode({ postcode: values.postcode });
        if (!coords || !coords.latitude || !coords.longitude) {
          throw new Error(
            'Could not validate postcode. Please check and try again.'
          );
        }
        batch.update(userDocRef, {
          postcode: values.postcode,
          latitude: coords.latitude,
          longitude: coords.longitude,
        });
        batch.update(restaurantDocRef, {
          latitude: coords.latitude,
          longitude: coords.longitude,
        });
        changes.push('Postcode updated.');
        needsBatchCommit = true;
      }


      if (needsBatchCommit) {
        await batch.commit();
        toastDescription = changes.join(' ');
      }

      toast({
        title: 'Success!',
        description: needsBatchCommit
          ? toastDescription
          : 'No changes were made.',
      });
      form.reset(values); // Re-sync form with submitted values
      
    } catch (error: any) {
      console.error('Error updating account: ', error);
      toast({
        variant: 'destructive',
        title: 'Uh oh! Something went wrong.',
        description:
          error.message || 'Could not update your details. Please try again.',
      });
    } finally {
      setTextLoading(false);
    }
  };

  const handlePasswordReset = async () => {
    if (!user.email) return;
    setPasswordResetLoading(true);
    try {
      await sendPasswordResetEmail(auth, user.email);
      toast({
        title: 'Password Reset Email Sent',
        description: 'A password reset link has been sent to your email address.',
      });
    } catch (error: any) {
      console.error(error);
      toast({
        variant: 'destructive',
        title: 'Uh oh! Something went wrong.',
        description: error.message,
      });
    } finally {
      setPasswordResetLoading(false);
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

    if (imageToRemove.existingUrl) {
      setImagesToDelete((prev) => [...prev, imageToRemove.existingUrl!]);
    }

    if (imageToRemove.preview && imageToRemove.preview.startsWith('blob:')) {
      URL.revokeObjectURL(imageToRemove.preview);
    }

    setImages((prev) => prev.filter((_, index) => index !== indexToRemove));
    setImageStateChanged(true);
  };
  
  const onShowcaseImageSubmit = async () => {
    if (!imageStateChanged) {
      toast({ title: 'No image changes to save.' });
      return;
    }
    if (!firestore || !authUser || !storage) return;

    setShowcaseImageLoading(true);

    try {
      if (imagesToDelete.length > 0) {
        const deletePromises = imagesToDelete.map(async (url) => {
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
              console.warn(`Failed to delete image ${storagePath}:`, error.message);
            }
          }
        });
        await Promise.all(deletePromises);
      }

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
            `restaurants/${authUser.uid}/showcase/${newFileName}`
          );
          const uploadResult = await uploadBytes(storageRef, compressedFile);
          return getDownloadURL(uploadResult.ref);
        } else if (imageState.existingUrl) {
          return imageState.existingUrl;
        }
        return null;
      });

      const finalImageUrls = (await Promise.all(uploadPromises)).filter(
        (url): url is string => url !== null
      );

      const restaurantDocRef = doc(firestore, 'restaurants', authUser.uid);
      await updateDoc(restaurantDocRef, {
        showcaseImageUrls: finalImageUrls,
      });

      toast({
        title: 'Success!',
        description: `Your showcase images have been updated.`,
      });
      setImageStateChanged(false);
      setImagesToDelete([]);
      
    } catch (error: any) {
      console.error('Error updating images:', error);
      toast({
        variant: 'destructive',
        title: 'Image Update Failed',
        description: 'Could not save the image changes. Please try again.',
      });
    } finally {
      setShowcaseImageLoading(false);
    }
  };

  const handleAvatarFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
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
        
        setAvatarFile(file);
        if (avatarPreview && avatarPreview.startsWith('blob:')) {
            URL.revokeObjectURL(avatarPreview);
        }
        setAvatarPreview(URL.createObjectURL(file));
    }
  };

  const onAvatarSubmit = async () => {
    if (!avatarFile || !authUser || !storage || !firestore) {
        toast({
            title: 'No new avatar selected.',
        });
        return;
    }
    setAvatarLoading(true);
    try {
        const compressedFile = await compressImage(avatarFile, {
            maxWidth: 1024,
            quality: 0.8,
        });

        const storageRef = ref(storage, `restaurants/${authUser.uid}/profile/${compressedFile.name}`);
        const uploadResult = await uploadBytes(storageRef, compressedFile);
        const newAvatarUrl = await getDownloadURL(uploadResult.ref);

        const restaurantDocRef = doc(firestore, 'restaurants', authUser.uid);
        await updateDoc(restaurantDocRef, {
            restaurantImageUrl: newAvatarUrl,
        });

        // Optionally delete old avatar from storage if you keep track of its full path
        // For simplicity, this is omitted here.

        toast({
            title: 'Avatar updated!',
            description: 'Your new restaurant avatar has been saved.',
        });
        setAvatarFile(null); // Reset after successful upload

    } catch (error: any) {
        console.error('Error updating avatar:', error);
        toast({
            variant: 'destructive',
            title: 'Avatar Update Failed',
            description: 'Could not save your new avatar. Please try again.',
        });
    } finally {
        setAvatarLoading(false);
    }
  }


  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Cook Account</DialogTitle>
          <DialogDescription>
            Manage your restaurant status and account details.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[70vh] pr-6">
            <Form {...form}>
            <form onSubmit={form.handleSubmit(onTextSubmit)} className="space-y-4">
                <FormField
                control={form.control}
                name="isAvailable"
                render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                        <FormLabel className="text-base">
                        Restaurant Status
                        </FormLabel>
                        <FormDescription>
                        Set your restaurant to "Open" to appear in searches.
                        </FormDescription>
                    </div>
                    <FormControl>
                        <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        />
                    </FormControl>
                    </FormItem>
                )}
                />

                <FormField
                control={form.control}
                name="displayName"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Restaurant Name</FormLabel>
                    <FormControl>
                        <Input placeholder="myawesomerestaurant" {...field} />
                    </FormControl>
                    <FormDescription>
                        Lowercase, no spaces, max 30 chars. This updates your
                        unique @username.
                    </FormDescription>
                    <FormMessage />
                    </FormItem>
                )}
                />

                <FormField
                control={form.control}
                name="mobile"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Mobile</FormLabel>
                    <FormControl>
                        <Input placeholder="07123456789" {...field} />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />

                <FormField
                control={form.control}
                name="postcode"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Postcode</FormLabel>
                    <FormControl>
                        <Input placeholder="M1 2AB" {...field} />
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
                      <FormLabel>About You</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Tell customers a bit about yourself and your cooking..."
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Share your passion! Are you a trained chef? Do you specialize in a certain cuisine? (Max 500 chars)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button
                type="submit"
                disabled={textLoading || !form.formState.isDirty}
                className="w-full"
                >
                {textLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Details
                </Button>
            </form>
            </Form>

            <Separator className="my-6" />

            <div className="space-y-4">
              <div>
                  <Label>Restaurant Avatar</Label>
                  <p className="text-sm text-muted-foreground mb-2">
                    This is your main profile picture.
                  </p>
                  <div className="flex items-center gap-4">
                    <Avatar className="h-16 w-16">
                      <AvatarImage src={avatarPreview || ''} alt={restaurant.name} />
                      <AvatarFallback className="text-2xl">{restaurant.name?.charAt(0) ?? 'C'}</AvatarFallback>
                    </Avatar>
                    <Button type="button" variant="outline" onClick={() => avatarInputRef.current?.click()}>
                      Change Avatar
                    </Button>
                    <Input 
                      type="file" 
                      accept="image/*" 
                      className="hidden" 
                      ref={avatarInputRef}
                      onChange={handleAvatarFileChange}
                    />
                  </div>
              </div>
              <Button
                  onClick={onAvatarSubmit}
                  disabled={avatarLoading || !avatarFile}
                  className="w-full"
              >
                  {avatarLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save Avatar
              </Button>
            </div>

            <Separator className="my-6" />

            <div className="space-y-4">
                <div>
                    <Label>Showcase Images</Label>
                    <p className="text-sm text-muted-foreground mb-2">
                        Manage images to show customers (up to 4).
                    </p>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
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
                </div>

                <Button
                    onClick={onShowcaseImageSubmit}
                    disabled={showcaseImageLoading || !imageStateChanged}
                    className="w-full"
                >
                    {showcaseImageLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Save Image Changes
                </Button>
            </div>
            
            <Separator className="my-6" />

            <div className='space-y-2'>
                <p className='text-sm font-medium'>Security</p>
                <Button
                variant="outline"
                onClick={handlePasswordReset}
                disabled={passwordResetLoading}
                className="w-full"
                >
                {passwordResetLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Send Password Reset Email
                </Button>
            </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
