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
  username: string;
  displayName: string;
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
};

export type CookMenuItem = {
  id: string;
  masterCategoryId: string;
  name: string;
  description: string;
  price: number;
  tags?: string[];
  imageUrls?: string[];
};

export type BasketItem = CookMenuItem & {
  quantity: number;
  restaurantId: string;
  restaurantName: string;
};

export type Order = {
  id: string;
  userId: string;
  cookId: string;
  items: BasketItem[];
  totalPrice: number;
  status: 'pending' | 'paid' | 'preparing' | 'ready' | 'delivered' | 'cancelled';
  createdAt: any;
  stripePaymentIntentId: string;
};

export type ChatInvoiceItem = {
  description: string;
  price: number;
};

export type ChatMessage = {
  id: string;
  sender: 'cook' | 'customer';
  text: string;
  createdAt: any;
};

export type Chat = {
  id: string;
  cookId: string;
  cookDisplayName: string;
  cookEmail: string;
  alertId: string;
  sessionId: string;
  status: 'open' | 'invoiced' | 'paid' | 'closed';
  createdAt: any;
  invoiceItems?: ChatInvoiceItem[];
  invoiceTotal?: number;
  basketItems?: BasketItem[];   // Customer's basket at time of order
  stripePaymentIntentId?: string;
};
