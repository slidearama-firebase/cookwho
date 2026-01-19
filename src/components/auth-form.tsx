
'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import {
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
} from 'firebase/auth';
import { useForm } from 'react-hook-form';
import * as z from 'zod';

import { useAuth, useFirestore, useStorage } from '@/firebase';
import { Button } from '@/components/ui/button';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { geocodePostcode } from '@/ai/flows/geocode-flow';
import {
  collection,
  doc,
  getDocs,
  query,
  setDoc,
  where,
} from 'firebase/firestore';
import { Checkbox } from './ui/checkbox';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { compressImage } from '@/lib/utils';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ACCEPTED_IMAGE_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
];

const signInSchema = z.object({
  email: z.string().email({ message: 'Please enter a valid email.' }),
  password: z
    .string()
    .min(6, { message: 'Password must be at least 6 characters.' }),
});

const signUpSchema = z
  .object({
    displayName: z
      .string()
      .min(1, { message: 'Please enter a name.' })
      .max(30, { message: 'Name must be 30 characters or less.' })
      .regex(/^[a-z0-9]+$/, {
        message:
          'Name must be lowercase and have no spaces or special characters.',
      }),
    email: z.string().email({ message: 'Please enter a valid email.' }),
    password: z
      .string()
      .min(6, { message: 'Password must be at least 6 characters.' }),
    confirmPassword: z
      .string()
      .min(6, { message: 'Password must be at least 6 characters.' }),
    postcode: z.string().optional(),
    mobile: z.string().optional(),
    isCook: z.boolean().default(false).optional(),
    image: z.any().optional(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match.",
    path: ['confirmPassword'],
  })
  .refine(
    (data) => {
      if (data.isCook && (!data.postcode || data.postcode.trim() === '')) {
        return false;
      }
      return true;
    },
    {
      message: 'Postcode is required if you are a cook.',
      path: ['postcode'],
    }
  )
  .refine(
    (data) => {
      if (data.isCook && (!data.mobile || data.mobile.trim() === '')) {
        return false;
      }
      return true;
    },
    {
      message: 'Mobile number is required if you are a cook.',
      path: ['mobile'],
    }
  )
  .refine(
    (data) => {
      if (data.image && data.image.length > 0) {
        return data.image[0].size <= MAX_FILE_SIZE;
      }
      return true;
    },
    {
      message: `Max image size is 5MB.`,
      path: ['image'],
    }
  )
  .refine(
    (data) => {
      if (data.image && data.image.length > 0) {
        return ACCEPTED_IMAGE_TYPES.includes(data.image[0].type);
      }
      return true;
    },
    {
      message: 'Only .jpg, .jpeg, .png and .webp formats are supported.',
      path: ['image'],
    }
  );

const resetPasswordSchema = z.object({
  email: z.string().email({ message: 'Please enter a valid email.' }),
});

// Simple normalization: lowercase and remove non-alphanumeric characters
function normalizeUsername(displayName: string): string {
  const sanitized = displayName.toLowerCase().replace(/[^a-z0-9]/g, '');
  return '@' + sanitized.substring(0, 30);
}

type AuthFormProps = {
  onCompletion?: () => void;
};

export function AuthForm({ onCompletion }: AuthFormProps) {
  const auth = useAuth();
  const firestore = useFirestore();
  const storage = useStorage();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [showResetForm, setShowResetForm] = useState(false);

  const signInForm = useForm<z.infer<typeof signInSchema>>({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: '', password: '' },
  });

  const signUpForm = useForm<z.infer<typeof signUpSchema>>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      displayName: '',
      email: '',
      password: '',
      confirmPassword: '',
      postcode: '',
      mobile: '',
      isCook: false,
    },
  });

  const resetPasswordForm = useForm<z.infer<typeof resetPasswordSchema>>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { email: '' },
  });

  const imageRef = signUpForm.register('image');

  const isCookValue = signUpForm.watch('isCook');

  const handleSignUp = async (values: z.infer<typeof signUpSchema>) => {
    setLoading(true);
    if (!firestore || !storage) {
      toast({
        variant: 'destructive',
        title: 'Uh oh! Something went wrong.',
        description: 'Database or storage not available.',
      });
      setLoading(false);
      return;
    }
    try {
      // 1. Generate username and check availability client-side
      const username = normalizeUsername(values.displayName);
      const usersRef = collection(firestore, 'users');
      const q = query(usersRef, where('username', '==', username));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        throw new Error(
          `Username "${username}" is already taken. Please choose a different name.`
        );
      }

      let coords: { latitude: number; longitude: number } | null = null;
      // 2. Geocode postcode if user is a cook
      if (values.isCook && values.postcode) {
        coords = await geocodePostcode({ postcode: values.postcode });
        if (!coords || !coords.latitude || !coords.longitude) {
          throw new Error(
            'Could not validate postcode. Please check and try again.'
          );
        }
      }

      // 3. Create the Firebase Auth user
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        values.email,
        values.password
      );
      const user = userCredential.user;

      // 4. Create the user document in Firestore
      const userDocRef = doc(firestore, 'users', user.uid);
      const userDocData: any = {
        username: username,
        displayName: values.displayName,
        email: values.email,
        isCook: values.isCook,
        isAdmin: false,
      };

      if (values.isCook && values.postcode && values.mobile && coords) {
        userDocData.postcode = values.postcode;
        userDocData.latitude = coords.latitude;
        userDocData.longitude = coords.longitude;
        userDocData.mobile = values.mobile;
      }

      await setDoc(userDocRef, userDocData);

      // 5. If the user is a cook, create the restaurant document
      if (values.isCook && coords) {
        let restaurantImageUrl = '';
        const imageFile = values.image?.[0];

        // 5a. If there's an image, upload it
        if (imageFile) {
          const storageRef = ref(
            storage,
            `restaurants/${user.uid}/profile/${imageFile.name}`
          );
          try {
            const compressedFile = await compressImage(imageFile, {
              maxWidth: 1024,
              quality: 0.8,
            });
            const uploadResult = await uploadBytes(storageRef, compressedFile);
            restaurantImageUrl = await getDownloadURL(uploadResult.ref);
          } catch (uploadError) {
            console.error('Image upload failed:', uploadError);
            toast({
              variant: 'destructive',
              title: 'Image upload failed',
              description:
                'Your account was created, but the restaurant image could not be uploaded. You can try again later.',
            });
          }
        }

        // 5b. Create the restaurant document
        const restaurantDocRef = doc(firestore, 'restaurants', user.uid);
        await setDoc(restaurantDocRef, {
          userId: user.uid,
          name: values.displayName,
          email: values.email,
          latitude: coords.latitude,
          longitude: coords.longitude,
          rating: 0,
          restaurantImageUrl: restaurantImageUrl,
          showcaseImageUrls: [],
          isAvailable: false,
        });
      }

      toast({
        title: 'Account Created!',
        description: `Your unique username is ${username}. You've been successfully signed up.`,
      });
      onCompletion?.();
    } catch (error: any) {
      console.error('Sign up error:', error);
      toast({
        variant: 'destructive',
        title: 'Uh oh! Something went wrong.',
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = async (values: z.infer<typeof signInSchema>) => {
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, values.email, values.password);
      toast({
        title: 'Signed In!',
        description: "You've been successfully signed in.",
      });
      onCompletion?.();
    } catch (error: any) {
      console.error(error);
      let description = 'An unexpected error occurred. Please try again.';
      if (
        error.code === 'auth/invalid-credential' ||
        error.code === 'auth/wrong-password' ||
        error.code === 'auth/user-not-found'
      ) {
        description =
          'Invalid email or password. Please check your credentials and try again.';
      } else {
        description = error.message;
      }
      toast({
        variant: 'destructive',
        title: 'Sign In Failed',
        description: description,
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordReset = async (
    values: z.infer<typeof resetPasswordSchema>
  ) => {
    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, values.email);
      toast({
        title: 'Password Reset Email Sent',
        description:
          'If an account with that email exists, a password reset link has been sent to it.',
      });
      setShowResetForm(false); // Go back to sign in form
    } catch (error: any) {
      console.error(error);
      toast({
        variant: 'destructive',
        title: 'Uh oh! Something went wrong.',
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  if (showResetForm) {
    return (
      <div className="pt-4">
        <Form {...resetPasswordForm}>
          <form
            onSubmit={resetPasswordForm.handleSubmit(handlePasswordReset)}
            className="space-y-4"
          >
            <FormField
              control={resetPasswordForm.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input placeholder="name@example.com" {...field} />
                  </FormControl>
                  <FormDescription>
                    Enter your email to receive a password reset link.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Send Reset Link
            </Button>
            <Button
              variant="link"
              className="w-full"
              onClick={() => setShowResetForm(false)}
            >
              Back to Sign In
            </Button>
          </form>
        </Form>
      </div>
    );
  }

  return (
    <Tabs defaultValue="signin" className="w-full">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="signin">Sign In</TabsTrigger>
        <TabsTrigger value="signup">Sign Up</TabsTrigger>
      </TabsList>
      <TabsContent value="signin">
        <Form {...signInForm}>
          <form
            onSubmit={signInForm.handleSubmit(handleSignIn)}
            className="space-y-4"
          >
            <FormField
              control={signInForm.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input placeholder="name@example.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={signInForm.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Password</FormLabel>
                  <FormControl>
                    <Input type="password" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="text-right">
              <Button
                variant="link"
                type="button"
                className="p-0 h-auto"
                onClick={() => setShowResetForm(true)}
              >
                Forgot Password?
              </Button>
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Sign In
            </Button>
          </form>
        </Form>
      </TabsContent>
      <TabsContent value="signup">
        <Form {...signUpForm}>
          <form
            onSubmit={signUpForm.handleSubmit(handleSignUp)}
            className="space-y-4"
          >
            <FormField
              control={signUpForm.control}
              name="displayName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {isCookValue ? 'Restaurant Name' : 'Your Name'}
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder={
                        isCookValue ? 'myawesomerestaurant' : 'yourname'
                      }
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Lowercase, no spaces, max 30 chars. This becomes your unique
                    @username.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={signUpForm.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input placeholder="name@example.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={signUpForm.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Password</FormLabel>
                  <FormControl>
                    <Input type="password" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={signUpForm.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Confirm Password</FormLabel>
                  <FormControl>
                    <Input type="password" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={signUpForm.control}
              name="isCook"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>Are you a cook?</FormLabel>
                    <FormDescription>
                      Select this to list your restaurant on CookWho.
                    </FormDescription>
                  </div>
                </FormItem>
              )}
            />
            {isCookValue && (
              <>
                <FormField
                  control={signUpForm.control}
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
                  control={signUpForm.control}
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
                  control={signUpForm.control}
                  name="image"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Upload Your Avatar</FormLabel>
                      <FormControl>
                        <Input type="file" accept="image/*" {...imageRef} />
                      </FormControl>
                      <FormDescription>
                        This will be your profile picture for your restaurant.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </>
            )}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Sign Up
            </Button>
          </form>
        </Form>
      </TabsContent>
    </Tabs>
  );
}
