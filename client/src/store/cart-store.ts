import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface Product {
  id: number | string;
  name: string;
  description: string;
  price: number;
  retail_price?: number;
  currency?: string;
  images: string[];
  category: string;
  is_enabled: boolean;
  rating?: number;
  reviews?: number;
  tags: string[];
  isFeatured?: boolean;
  isOnSale?: boolean;
  salePercentage?: number;
  originalPrice?: number;
  variants?: Array<{
    id: number;
    name: string;
    retail_price: number;
    in_stock: boolean;
  }>;
  createdAt?: string;
  updatedAt?: string;
}

interface CartItem {
  product: Product;
  quantity: number;
  selectedVariant?: string;
}

interface CartState {
  items: CartItem[];
  isOpen: boolean;
}

interface CartActions {
  addItem: (product: Product, quantity?: number, variant?: string) => void;
  removeItem: (productId: string | number, variant?: string) => void;
  updateQuantity: (productId: string | number, quantity: number, variant?: string) => void;
  clearCart: () => void;
  setIsOpen: (isOpen: boolean) => void;
  getTotal: () => number;
  getItemCount: () => number;
  getItem: (productId: string | number, variant?: string) => CartItem | undefined;
}

type CartStore = CartState & CartActions;

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      // State
      items: [],
      isOpen: false,

      // Actions
      addItem: (product, quantity = 1, variant) => {
        const { items } = get();
        const existingItem = items.find(
          item => item.product.id === product.id && item.selectedVariant === variant
        );

        if (existingItem) {
          set({
            items: items.map(item =>
              item.product.id === product.id && item.selectedVariant === variant
                ? { ...item, quantity: item.quantity + quantity }
                : item
            )
          });
        } else {
          set({
            items: [...items, { product, quantity, selectedVariant: variant }]
          });
        }
      },

      removeItem: (productId, variant) => {
        const { items } = get();
        set({
          items: items.filter(
            item => !(item.product.id === productId && item.selectedVariant === variant)
          )
        });
      },

      updateQuantity: (productId, quantity, variant) => {
        const { items } = get();
        if (quantity <= 0) {
          get().removeItem(productId, variant);
        } else {
          set({
            items: items.map(item =>
              item.product.id === productId && item.selectedVariant === variant
                ? { ...item, quantity }
                : item
            )
          });
        }
      },

      clearCart: () => {
        set({ items: [] });
      },

      setIsOpen: (isOpen) => {
        set({ isOpen });
      },

      getTotal: () => {
        const { items } = get();
        return items.reduce((total, item) => {
          const price = item.product.retail_price || item.product.price;
          return total + (price * item.quantity);
        }, 0);
      },

      getItemCount: () => {
        const { items } = get();
        return items.reduce((count, item) => count + item.quantity, 0);
      },

      getItem: (productId, variant) => {
        const { items } = get();
        return items.find(
          item => item.product.id === productId && item.selectedVariant === variant
        );
      }
    }),
    {
      name: 'tinhih-cart-storage',
      partialize: (state) => ({ items: state.items })
    }
  )
);
