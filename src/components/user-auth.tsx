
'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useUser } from '@/firebase/auth/use-user';
import { useDoc } from '@/firebase/firestore/use-doc';
import { useAuth, useFirestore } from '@/firebase/provider';
import { signOut } from 'firebase/auth';
import { BookMarked, ChefHat, LogIn, LogOut, Utensils, User as UserIcon } from 'lucide-react';
import React, { useMemo, useState } from 'react';
import { AuthForm } from './auth-form';
import { Button } from './ui/button';
import { Skeleton } from './ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuPortal,
  DropdownMenuSubContent
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { doc } from 'firebase/firestore';
import type { Restaurant, User as AppUser } from '@/lib/types';
import { AdminMenuDialog } from './admin-menu-dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from './ui/tooltip';
import { CookMenuDialog } from './cook-menu-dialog';
import { ViewMenuDialog } from './view-menu-dialog';
import { CookAccountDialog } from './cook-account-dialog';
import { cn } from '@/lib/utils';

export function UserAuth() {
  const { user: authUser, loading: authLoading } = useUser();
  const auth = useAuth();
  const firestore = useFirestore();
  const [dialogOpen, setDialogOpen] = React.useState(false);
  
  const [adminDialogOpen, setAdminDialogOpen] = useState(false);
  const [adminDialogCuisine, setAdminDialogCuisine] = useState<'English' | 'Indian' | 'Italian'>('English');
  const [cookMenuDialogOpen, setCookMenuDialogOpen] = useState(false);
  const [cookMenuDialogCuisine, setCookMenuDialogCuisine] = useState<'English' | 'Indian' | 'Italian'>('English');
  const [cookAccountDialogOpen, setCookAccountDialogOpen] = useState(false);
  const [viewMenuDialogOpen, setViewMenuDialogOpen] = useState(false);

  const userDocRef = useMemo(() => {
    if (!firestore || !authUser) return null;
    return doc(firestore, 'users', authUser.uid);
  }, [firestore, authUser]);

  const { data: userProfile, loading: profileLoading } =
    useDoc<AppUser>(userDocRef);

  const restaurantDocRef = useMemo(() => {
    if (!firestore || !authUser || !userProfile?.isCook) return null;
    return doc(firestore, 'restaurants', authUser.uid);
  }, [firestore, authUser, userProfile?.isCook]);

  const { data: restaurant, loading: restaurantLoading } = useDoc<Restaurant>(restaurantDocRef);


  const handleSignOut = () => {
    signOut(auth);
  };
  
  const openAdminDialog = (cuisine: 'English' | 'Indian' | 'Italian') => {
    setAdminDialogCuisine(cuisine);
    setAdminDialogOpen(true);
  }

  const openCookMenuDialog = (cuisine: 'English' | 'Indian' | 'Italian') => {
    setCookMenuDialogCuisine(cuisine);
    setCookMenuDialogOpen(true);
  }

  const loading = authLoading || (authUser && (profileLoading || restaurantLoading));

  if (loading) {
    return <Skeleton className="h-12 w-32" />;
  }

  if (authUser && userProfile) {
    const isCook = userProfile.isCook;
    const avatarSrc = isCook ? restaurant?.restaurantImageUrl : authUser.photoURL;
    const avatarAlt = userProfile.displayName || '';
    const avatarFallback = userProfile.displayName?.charAt(0).toUpperCase() || <UserIcon className='h-6 w-6' />;

    return (
      <div className="flex items-center gap-2">
        {/* Desktop-only icons for Cook */}
        {isCook && restaurant && (
            <div className="hidden md:flex items-center gap-2">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                        <Button variant="outline" size="xl" onClick={() => setCookAccountDialogOpen(true)}>
                          <ChefHat className='h-6 w-6' />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                        <p>Cook Account</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="xl">
                      <Utensils className='h-6 w-6' />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setViewMenuDialogOpen(true)}>
                        View My Dishes
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuSub>
                        <DropdownMenuSubTrigger>
                            Add New Dish
                        </DropdownMenuSubTrigger>
                        <DropdownMenuPortal>
                        <DropdownMenuSubContent>
                            <DropdownMenuItem onClick={() => openCookMenuDialog('English')}>English</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openCookMenuDialog('Indian')}>Indian</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openCookMenuDialog('Italian')}>Italian</DropdownMenuItem>
                        </DropdownMenuSubContent>
                        </DropdownMenuPortal>
                    </DropdownMenuSub>
                  </DropdownMenuContent>
                </DropdownMenu>
            </div>
        )}
        
        {/* Dialogs need to be available for both mobile and desktop */}
        {isCook && restaurant && (
          <>
            <CookAccountDialog
                isOpen={cookAccountDialogOpen}
                onOpenChange={setCookAccountDialogOpen}
                user={userProfile}
                restaurant={restaurant}
            />
            <CookMenuDialog 
                isOpen={cookMenuDialogOpen}
                onOpenChange={setCookMenuDialogOpen}
                cuisine={cookMenuDialogCuisine}
            />
            <ViewMenuDialog
                isOpen={viewMenuDialogOpen}
                onOpenChange={setViewMenuDialogOpen}
            />
          </>
        )}

        {/* Desktop-only icon for Admin */}
        {userProfile.isAdmin && (
          <>
            <div className='hidden md:block'>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      size="xl"
                    >
                      <BookMarked className='h-6 w-6' />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Master Menu</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => openAdminDialog('English')}>English</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => openAdminDialog('Indian')}>Indian</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => openAdminDialog('Italian')}>Italian</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            
            <AdminMenuDialog
              isOpen={adminDialogOpen}
              onOpenChange={setAdminDialogOpen}
              cuisine={adminDialogCuisine}
            />
          </>
        )}

        {/* Main User Dropdown - hidden on mobile for cooks */}
        <div className={cn(isCook && "hidden md:block")}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="relative h-12 w-12 rounded-full">
                <Avatar className="h-12 w-12 border-2 border-foreground">
                  <AvatarImage
                    src={avatarSrc || ''}
                    alt={avatarAlt}
                  />
                  <AvatarFallback>
                    {avatarFallback}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">
                    {userProfile.displayName}
                  </p>
                  <p className="text-xs leading-none text-muted-foreground">
                    @{userProfile.username}
                  </p>
                  <p className="text-xs leading-none text-muted-foreground">
                    {userProfile.email}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {userProfile.isAdmin && (
                <>
                 <DropdownMenuSub>
                    <DropdownMenuSubTrigger>
                      <BookMarked className="mr-2 h-4 w-4" />
                      <span>Master Menu</span>
                    </DropdownMenuSubTrigger>
                    <DropdownMenuPortal>
                    <DropdownMenuSubContent>
                      <DropdownMenuItem onClick={() => openAdminDialog('English')}>English</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => openAdminDialog('Indian')}>Indian</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => openAdminDialog('Italian')}>Italian</DropdownMenuItem>
                    </DropdownMenuSubContent>
                    </DropdownMenuPortal>
                  </DropdownMenuSub>
                  <DropdownMenuSeparator />
                </>
              )}
              <DropdownMenuItem onClick={handleSignOut} className="text-destructive focus:text-destructive-foreground focus:bg-destructive">
                <LogOut className="mr-2 h-4 w-4" />
                <span>Log out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    );
  }

  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <TooltipProvider>
        <Tooltip>
            <TooltipTrigger asChild>
                <DialogTrigger asChild>
                    <Button variant="outline" size="xl">
                        <LogIn className='h-6 w-6'/>
                    </Button>
                </DialogTrigger>
            </TooltipTrigger>
            <TooltipContent>
                <p>Log In / Sign Up</p>
            </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Welcome to CookWho</DialogTitle>
        </DialogHeader>
        <AuthForm onCompletion={() => setDialogOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}
