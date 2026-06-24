import { create } from 'zustand';
import { api } from '@/lib/api';

interface Product {
  id: number;
  name: string;
  description: string;
  price: number;
  retail_price: number;
  currency: string;
  images: string[];
  variants: Array<{
    id: number;
    name: string;
    retail_price: number;
    in_stock: boolean;
  }>;
  category: string;
  tags: string[];
  is_enabled: boolean;
  // Optional fields for enhanced functionality
  rating?: number;
  reviews?: number;
  isFeatured?: boolean;
  isOnSale?: boolean;
  salePercentage?: number;
  originalPrice?: number;
  createdAt?: string;
  updatedAt?: string;
}

interface StoreState {
  products: Product[];
  filteredProducts: Product[];
  categories: string[];
  isLoading: boolean;
  error: string | null;
  searchTerm: string;
  selectedCategory: string;
  sortBy: 'name' | 'price' | 'rating' | 'newest';
  sortOrder: 'asc' | 'desc';
}

interface StoreActions {
  setProducts: (products: Product[]) => void;
  setFilteredProducts: (products: Product[]) => void;
  setCategories: (categories: string[]) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setSearchTerm: (term: string) => void;
  setSelectedCategory: (category: string) => void;
  setSortBy: (sortBy: 'name' | 'price' | 'rating' | 'newest') => void;
  setSortOrder: (order: 'asc' | 'desc') => void;
  fetchProducts: () => Promise<void>;
  fetchCategories: () => Promise<void>;
  filterProducts: () => void;
  clearError: () => void;
}

type StoreStore = StoreState & StoreActions;

export const useStoreStore = create<StoreStore>((set, get) => ({
  // State
  products: [],
  filteredProducts: [],
  categories: [],
  isLoading: false,
  error: null,
  searchTerm: '',
  selectedCategory: 'all',
  sortBy: 'newest',
  sortOrder: 'desc',

  // Actions
  setProducts: (products) => set({ products }),
  setFilteredProducts: (filteredProducts) => set({ filteredProducts }),
  setCategories: (categories) => set({ categories }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
  setSearchTerm: (searchTerm) => set({ searchTerm }),
  setSelectedCategory: (selectedCategory) => set({ selectedCategory }),
  setSortBy: (sortBy) => set({ sortBy }),
  setSortOrder: (sortOrder) => set({ sortOrder }),

  fetchProducts: async () => {
    try {
      set({ isLoading: true, error: null });
      const response = await api.get('/api/printful/sync-products');
      
      if (response.success && response.data) {
        // Transform Printful products to include additional fields
        const products = response.data.map((product: any) => ({
          ...product,
          // Add default values for missing fields
          rating: product.rating || 4.5,
          reviews: product.reviews || Math.floor(Math.random() * 50) + 10,
          isFeatured: product.isFeatured || false,
          isOnSale: product.isOnSale || false,
          salePercentage: product.salePercentage || 0,
          originalPrice: product.originalPrice || product.retail_price,
          createdAt: product.createdAt || new Date().toISOString(),
          updatedAt: product.updatedAt || new Date().toISOString(),
          // Ensure tags is always an array
          tags: Array.isArray(product.tags) ? product.tags : [],
          // Ensure variants is always an array
          variants: Array.isArray(product.variants) ? product.variants : []
        }));
        
        set({ products, filteredProducts: products, isLoading: false });
        get().filterProducts();
      } else {
        set({ error: response.error || 'Failed to fetch products', isLoading: false });
      }
    } catch (error: any) {
      console.error('Error fetching products:', error);
      set({ error: error.message || 'Failed to fetch products', isLoading: false });
    }
  },

  fetchCategories: async () => {
    try {
      const response = await api.get('/api/store/categories');
      
      if (response.success) {
        set({ categories: response.data });
      }
    } catch (error: any) {
      console.error('Failed to fetch categories:', error);
      // Set default categories if API fails
      set({ categories: ['apparel', 'accessories', 'printful'] });
    }
  },

  filterProducts: () => {
    const { products, searchTerm, selectedCategory, sortBy, sortOrder } = get();
    
    let filtered = [...products];

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(
        (product) =>
          product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          product.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
          product.tags.some((tag) => tag.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    // Category filter
    if (selectedCategory !== 'all') {
      filtered = filtered.filter((product) => product.category === selectedCategory);
    }

    // Sort products
    filtered.sort((a, b) => {
      let aValue: any, bValue: any;

      switch (sortBy) {
        case 'name':
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case 'price':
          aValue = a.retail_price || a.price;
          bValue = b.retail_price || b.price;
          break;
        case 'rating':
          aValue = a.rating || 0;
          bValue = b.rating || 0;
          break;
        case 'newest':
          aValue = new Date(a.createdAt || 0).getTime();
          bValue = new Date(b.createdAt || 0).getTime();
          break;
        default:
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
      }

      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    set({ filteredProducts: filtered });
  },

  clearError: () => set({ error: null })
}));
