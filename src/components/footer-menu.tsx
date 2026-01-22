
'use client';

import { useAuth, useFirestore, useUser } from '@/firebase';
import { useDoc } from '@/firebase/firestore/use-doc';
import { signOut } from 'firebase/auth';
import { BookMarked, ChefHat, LogIn, LogOut, Utensils, User as UserIcon } from 'lucide-react';
import React, { useMemo, useState } from 'react';
import { Button } from './ui/button';
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
} from './ui/dropdown-menu';
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

export function FooterMenu() {
    const { user: authUser, loading: authLoading } = useUser();
    const firestore = useFirestore();
    const auth = useAuth();
    
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

    const openAdminDialog = (cuisine: 'English' | 'Indian' | 'Italian') => {
        setAdminDialogCuisine(cuisine);
        setAdminDialogOpen(true);
    }

    const openCookMenuDialog = (cuisine: 'English' | 'Indian' | 'Italian') => {
        setCookMenuDialogCuisine(cuisine);
        setCookMenuDialogOpen(true);
    }
    
    const loading = authLoading || (authUser && (profileLoading || restaurantLoading));

    if (loading || !authUser || !userProfile || !userProfile.isCook || !restaurant) {
        return null;
    }
  
    const avatarSrc = restaurant?.restaurantImageUrl || authUser.photoURL;
    const avatarAlt = userProfile.displayName || '';
    const avatarFallback = userProfile.displayName?.charAt(0).toUpperCase() || <UserIcon className='h-6 w-6' />;

    return (
        <div className="md:hidden fixed bottom-0 left-0 right-0 bg-background border-t p-2 flex justify-around items-center z-50">
            
            {/* Cook Account */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                    <Button variant="ghost" className="flex flex-col h-auto p-1" onClick={() => setCookAccountDialogOpen(true)}>
                      <ChefHat className='h-6 w-6' />
                      <span className='text-xs'>Account</span>
                    </Button>
                </TooltipTrigger>
                <TooltipContent>
                    <p>Cook Account</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            {/* My Menu Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex flex-col h-auto p-1">
                  <Utensils className='h-6 w-6' />
                  <span className='text-xs'>My Menu</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="center" className="mb-2">
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

            {/* Profile Dropdown */}
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="flex flex-col h-auto p-1">
                        <Avatar className="h-6 w-6 border-2 border-foreground">
                            <AvatarImage src={avatarSrc || ''} alt={avatarAlt} />
                            <AvatarFallback className="text-xs">{avatarFallback}</AvatarFallback>
                        </Avatar>
                        <span className="text-xs">Profile</span>
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56 mb-2" align="center" forceMount>
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
                    <DropdownMenuItem onClick={() => signOut(auth)} className="text-destructive focus:text-destructive-foreground focus:bg-destructive">
                        <LogOut className="mr-2 h-4 w-4" />
                        <span>Log out</span>
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>

            {/* Dialogs */}
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
            {userProfile.isAdmin && (
                <AdminMenuDialog
                    isOpen={adminDialogOpen}
                    onOpenChange={setAdminDialogOpen}
                    cuisine={adminDialogCuisine}
                />
            )}
        </div>
    );
}
