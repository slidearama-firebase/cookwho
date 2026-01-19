
'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { AddCategoryForm } from './add-category-form';


type AdminMenuDialogProps = {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  cuisine: 'English' | 'Indian' | 'Italian';
};

export function AdminMenuDialog({
  isOpen,
  onOpenChange,
  cuisine,
}: AdminMenuDialogProps) {
  
  const handleSuccess = () => {
    onOpenChange(false);
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Admin: Add Master Dish</DialogTitle>
        </DialogHeader>
        <AddCategoryForm onSuccess={handleSuccess} cuisine={cuisine}/>
      </DialogContent>
    </Dialog>
  );
}
