
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
import { useEffect, useState } from 'react';
import { Loader2, Trash2 } from 'lucide-react';
import { Textarea } from './ui/textarea';
import { addDoc, collection } from 'firebase/firestore';
import { cn, compressImage } from '@/lib/utils';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import Image from 'next/image';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

const formSchema = z.object({
  name: z.string().min(1, 'Please give your dish a name.'),
  description: z
    .string()
    .min(1, 'Please describe your dish.'),
  price: z
    .string()
    .refine((val) => /^\d+(\.\d{1,2})?$/.test(val), {
      message: 'Price must be a valid number with up to two decimal places (e.g., 9.99).',
    })
    .transform((val) => parseFloat(val)),
  tags: z.array(z.object({
    value: z.string().min(1, "Tag cannot be empty."),
  })).max(4, "You can add a maximum of 4 tags."),
  images: z.array(z.object({
    file: z.instanceof(File, { message: "Image is required." })
        .refine((file) => file.size <= MAX_FILE_SIZE, `Max file size is 5MB.`)
        .refine(
          (file) => ACCEPTED_IMAGE_TYPES.includes(file.type),
          "Only .jpg, .jpeg, .png and .webp formats are supported."
        ),
  })).min(1, { message: 'At least one image is required.' }).max(4, 'You can upload a maximum of 4 images.'),
});

type CookAddItemFormProps = {
  masterCategory: {id: string, name: string};
  onSuccess?: () => void;
};

export function CookAddItemForm({ masterCategory, onSuccess }: CookAddItemFormProps) {
  const { user } = useUser();
  const firestore = useFirestore();
  const storage = useStorage();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [imagePreviews, setImagePreviews] = useState<(string | null)[]>([]);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
        name: masterCategory.name,
        description: '',
        price: 0,
        tags: [],
        images: [],
      },
  });

  const { fields: tagFields, append: appendTag, remove: removeTag } = useFieldArray({
    control: form.control,
    name: 'tags',
  });

  const { fields: imageFields, append: appendImage, remove: removeImage } = useFieldArray({
    control: form.control,
    name: 'images'
  });
  
  useEffect(() => {
    if (imageFields.length === 0) {
      appendImage({ file: undefined as any });
    }
  }, [imageFields.length, appendImage]);

  useEffect(() => {
    return () => {
        imagePreviews.forEach(preview => {
            if (preview) {
                URL.revokeObjectURL(preview);
            }
        });
    };
  }, [imagePreviews]);

  useEffect(() => {
    form.reset({
        name: masterCategory.name,
        description: '',
        price: 0,
        tags: [],
        images: [],
      });
    setImagePreviews([]);
    if (form.getValues('images').length === 0) {
        appendImage({ file: undefined as any });
    }
  }, [masterCategory, form, appendImage]);

  const generateRandomString = (length: number) => {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return result;
  };

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!firestore || !user || !storage) return;
    setLoading(true);
    
    try {
        const imageUrls: string[] = [];
        if (values.images) {
            for (const imageField of values.images) {
                const imageFile = imageField.file;
                if(imageFile) {
                    const compressedFile = await compressImage(imageFile, { maxWidth: 1024, quality: 0.8 });
                    const fileExtension = compressedFile.name.split('.').pop();
                    const randomName = generateRandomString(20);
                    const newFileName = `${randomName}.${fileExtension}`;

                    const storageRef = ref(storage, `restaurants/${user.uid}/menuItems/${masterCategory.id}/${newFileName}`);
                    const uploadResult = await uploadBytes(storageRef, compressedFile);
                    const downloadUrl = await getDownloadURL(uploadResult.ref);
                    imageUrls.push(downloadUrl);
                }
            }
        }
  
        const menuItemsCollection = collection(firestore, 'restaurants', user.uid, 'menuItems');
        await addDoc(menuItemsCollection, {
          masterCategoryId: masterCategory.id,
          name: values.name,
          description: values.description,
          price: values.price,
          tags: values.tags.map(tag => tag.value),
          imageUrls: imageUrls,
        });

      toast({
        title: 'Success!',
        description: `Your version of "${values.name}" has been added to your menu.`,
      });
      form.reset();
      setImagePreviews([]);
      onSuccess?.();
    } catch (error: any) {
      console.error('Error adding menu item: ', error);
      toast({
        variant: 'destructive',
        title: 'Uh oh! Something went wrong.',
        description: 'Could not save your menu item. Please try again.',
      });
    } finally {
      setLoading(false);
    }
  };
  
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    const file = e.target.files?.[0];
    const newPreviews = [...imagePreviews];

    if (newPreviews[index]) {
        URL.revokeObjectURL(newPreviews[index] as string);
    }

    if (file) {
        newPreviews[index] = URL.createObjectURL(file);
        form.setValue(`images.${index}.file`, file, { shouldValidate: true });
    } else {
        newPreviews[index] = null;
        form.setValue(`images.${index}.file`, undefined as any, { shouldValidate: true });
    }
    setImagePreviews(newPreviews);
  };

  const handleRemoveImage = (index: number) => {
    removeImage(index);
    const newPreviews = [...imagePreviews];
    const previewToRemove = newPreviews[index];
    if (previewToRemove) {
        URL.revokeObjectURL(previewToRemove);
    }
    newPreviews.splice(index, 1);
    setImagePreviews(newPreviews);
  }

  const handleAddImage = () => {
    if (imageFields.length < 4) {
        appendImage({ file: undefined as any });
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className='p-4 border rounded-md bg-muted/50'>
            <h4 className='font-medium text-sm'>Adding item based on master category:</h4>
            <p className='text-lg font-semibold'>{masterCategory.name}</p>
        </div>
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Your Item's Title</FormLabel>
              <FormControl>
                <Input placeholder="e.g., The Ultimate Full English" {...field} />
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
              <FormLabel>Your Description</FormLabel>
              <FormControl>
                <Textarea placeholder={`Describe your version of ${masterCategory.name}`} {...field} />
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
                <Input type="text" inputMode="decimal" placeholder="e.g., 8.50" {...field} />
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
            className={cn("mt-2", tagFields.length >= 4 && 'hidden')}
            onClick={() => appendTag({ value: "" })}
            >
            Add Tag
            </Button>
            <FormMessage>{form.formState.errors.tags?.message}</FormMessage>
        </div>

        <div>
            <FormLabel>Images</FormLabel>
            <FormDescription className="mb-2">
                Add up to 4 images of your dish. At least one is required.
            </FormDescription>
            <div className="space-y-4">
            {imageFields.map((field, index) => (
                <div key={field.id} className="flex items-center gap-2">
                    {imagePreviews[index] && (
                        <div className="relative w-16 h-16 rounded-md overflow-hidden flex-shrink-0">
                            <Image src={imagePreviews[index]!} alt={`Preview ${index}`} width={64} height={64} className="object-cover" />
                        </div>
                    )}
                    <div className="flex-grow min-w-0">
                        <FormField
                            control={form.control}
                            name={`images.${index}.file`}
                            render={() => (
                                <FormItem>
                                    <FormControl>
                                        <Input 
                                            type="file" 
                                            accept="image/*"
                                            onChange={(e) => handleImageChange(e, index)}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>
                    <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    onClick={() => handleRemoveImage(index)}
                    >
                    <Trash2 className="h-4 w-4" />
                    </Button>
                </div>
              ))}
            </div>

            <Button
            type="button"
            variant="outline"
            size="sm"
            className={cn("mt-2", imageFields.length >= 4 && 'hidden')}
            onClick={handleAddImage}
            >
            Add Image
            </Button>
            <FormMessage>{form.formState.errors.images?.message}</FormMessage>
        </div>


        <Button type="submit" disabled={loading} className="w-full">
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save to My Menu
        </Button>
      </form>
    </Form>
  );
}
