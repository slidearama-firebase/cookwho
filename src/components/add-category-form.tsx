
'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useFirestore } from '@/firebase/provider';
import { addDoc, collection } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';

const formSchema = z.object({
  name: z.string().min(1, 'Menu category name cannot be empty.'),
  cuisine: z.enum(['English', 'Indian', 'Italian']),
});

type AddCategoryFormProps = {
  onSuccess?: () => void;
  cuisine: 'English' | 'Indian' | 'Italian';
};

export function AddCategoryForm({ onSuccess, cuisine }: AddCategoryFormProps) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { name: '', cuisine: cuisine },
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!firestore) return;
    setLoading(true);
    try {
      const masterMenuCollection = collection(firestore, 'masterMenuCategories');
      await addDoc(masterMenuCollection, {
        name: values.name,
        cuisine: values.cuisine,
      });

      toast({
        title: 'Success!',
        description: `"${values.name}" has been added to the master menu.`,
      });
      form.reset();
      onSuccess?.();
    } catch (error: any) {
      console.error('Error adding document: ', error);
      toast({
        variant: 'destructive',
        title: 'Uh oh! Something went wrong.',
        description: 'Could not save the menu category. Please try again.',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>New Menu Category</FormLabel>
              <FormControl>
                <Input placeholder="e.g., Full Breakfast, Curry" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
            control={form.control}
            name="cuisine"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Cuisine</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                    <SelectTrigger>
                        <SelectValue placeholder="Select a cuisine" />
                    </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                        <SelectItem value="English">English</SelectItem>
                        <SelectItem value="Indian">Indian</SelectItem>
                        <SelectItem value="Italian">Italian</SelectItem>
                    </SelectContent>
                </Select>
                <FormMessage />
                </FormItem>
            )}
        />
        <Button type="submit" disabled={loading} className="w-full">
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save Category
        </Button>
      </form>
    </Form>
  );
}
