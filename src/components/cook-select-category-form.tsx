
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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
  } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { useCollection, useFirestore } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import { useMemo } from 'react';
import { type MasterMenuCategory } from '@/lib/types';

const formSchema = z.object({
    categoryId: z.string().min(1, 'Please select a category.'),
});

type CookSelectCategoryFormProps = {
  onCategorySelect: (category: {id: string, name: string}) => void;
  cuisine: 'English' | 'Indian' | 'Italian';
};

export function CookSelectCategoryForm({ onCategorySelect, cuisine }: CookSelectCategoryFormProps) {
  const firestore = useFirestore();

  const categoriesQuery = useMemo(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'masterMenuCategories'), where('cuisine', '==', cuisine));
  }, [firestore, cuisine]);

  const { data: categories, loading: categoriesLoading } = useCollection<MasterMenuCategory>(categoriesQuery);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { categoryId: '' },
  });

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    const selectedCategory = categories?.find(c => c.id === values.categoryId);
    if(selectedCategory) {
        onCategorySelect({ id: selectedCategory.id, name: selectedCategory.name });
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
            control={form.control}
            name="categoryId"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Select a Menu Category</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value} disabled={categoriesLoading || !categories || categories.length === 0}>
                    <FormControl>
                    <SelectTrigger>
                        <SelectValue placeholder="Select from the master list" />
                    </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                    {categories && categories.length > 0 ? (
                        categories.map(category => (
                        <SelectItem key={category.id} value={category.id}>{category.name}</SelectItem>
                        ))
                    ) : (
                        <SelectItem value="none" disabled>No categories found for {cuisine}</SelectItem>
                    )}
                    </SelectContent>
                </Select>
                <FormMessage />
                </FormItem>
            )}
            />
        <Button type="submit" className="w-full">
          Next: Add Your Dish
        </Button>
      </form>
    </Form>
  );
}
