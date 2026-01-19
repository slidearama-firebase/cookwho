

export type Restaurant = {
  id: string;
  userId: string;
  name: string;
  rating?: number;
  latitude?: number;
  longitude?: number;
  distance?: number;
  email?: string;
  restaurantImageUrl?: string;
  showcaseImageUrls?: string[];
  description?: string;
  isAvailable?: boolean;
};

export type User = {
  id: string;
  username: string; // The unique @handle
  displayName: string; // The user's chosen display name
  email: string;
  mobile?: string;
  postcode?: string;
  latitude?: number;
  longitude?: number;
  isCook?: boolean;
  isAdmin?: boolean;
};

export type MasterMenuCategory = {
    id: string;
    name: string;
    cuisine: 'English' | 'Indian' | 'Italian';
};

export type MenuDish = {
    id: string;
    name: string;
}

export type CookMenuItem = {
    id: string;
    masterCategoryId: string;
    name: string;
    description: string;
    price: number;
    tags?: string[];
    imageUrls?: string[];
}

export type BasketItem = CookMenuItem & {
    quantity: number;
    restaurantId: string;
    restaurantName: string;
  };

export type Order = {
    id: string;
    userId: string; // The user who placed the order
    cookId: string; // The cook receiving the order
    items: BasketItem[];
    totalPrice: number; // Price in the smallest currency unit (e.g. pence)
    status: 'pending' | 'paid' | 'preparing' | 'ready' | 'delivered' | 'cancelled';
    createdAt: any; // Firestore Timestamp
    stripePaymentIntentId: string;
};
