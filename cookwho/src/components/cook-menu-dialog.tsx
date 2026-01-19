
'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useState } from 'react';
import { CookSelectCategoryForm } from './cook-select-category-form';
import { CookAddItemForm } from './cook-add-item-form';


type CookMenuDialogProps = {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  cuisine: 'English' | 'Indian' | 'Italian';
};

export function CookMenuDialog({
  isOpen,
  onOpenChange,
  cuisine,
}: CookMenuDialogProps) {
  const [selectedCategory, setSelectedCategory] = useState<{id: string, name: string} | null>(null);

  const handleCategorySelect = (category: {id: string, name: string}) => {
    setSelectedCategory(category);
  };
  
  const handleSuccess = () => {
    // After successfully adding an item, go back to category selection
    setSelectedCategory(null);
  }
  
  // When dialog is closed, reset internal state
  const handleOpenChange = (open: boolean) => {
    if (!open) {
        setSelectedCategory(null);
    }
    onOpenChange(open);
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>My Menu</DialogTitle>
        </DialogHeader>
        
        {!selectedCategory ? (
            <CookSelectCategoryForm cuisine={cuisine} onCategorySelect={handleCategorySelect} />
        ) : (
            <CookAddItemForm masterCategory={selectedCategory} onSuccess={handleSuccess} />
        )}

      </DialogContent>
    </Dialog>
  );
}
