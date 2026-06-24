import { create } from 'zustand';
import { api } from '@/lib/api';

interface Quote {
  id: string;
  text: string;
  author: string;
  category: string;
  tags: string[];
  isActive: boolean;
  isFeatured: boolean;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
}

interface QuoteState {
  quotes: Quote[];
  featuredQuotes: Quote[];
  currentQuote: Quote | null;
  isLoading: boolean;
  error: string | null;
}

interface QuoteActions {
  setQuotes: (quotes: Quote[]) => void;
  setFeaturedQuotes: (quotes: Quote[]) => void;
  setCurrentQuote: (quote: Quote | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  fetchQuotes: () => Promise<void>;
  getRandomQuote: () => void;
  clearError: () => void;
}

type QuoteStore = QuoteState & QuoteActions;

export const useQuoteStore = create<QuoteStore>((set, get) => ({
  // State
  quotes: [],
  featuredQuotes: [],
  currentQuote: null,
  isLoading: false,
  error: null,

  // Actions
  setQuotes: (quotes) => set({ quotes }),
  setFeaturedQuotes: (featuredQuotes) => set({ featuredQuotes }),
  setCurrentQuote: (currentQuote) => set({ currentQuote }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),

  fetchQuotes: async () => {
    try {
      set({ isLoading: true, error: null });
      const response = await api.get('/api/quotes');
      
      if (response.success) {
        const quotes = response.data || response;
        const featuredQuotes = quotes.filter((quote: Quote) => quote.isFeatured && quote.isActive);
        
        set({ 
          quotes, 
          featuredQuotes, 
          isLoading: false 
        });
        
        // Set initial random quote
        get().getRandomQuote();
      } else {
        set({ error: response.error || 'Failed to fetch quotes', isLoading: false });
      }
    } catch (error: any) {
      set({ error: error.message || 'Failed to fetch quotes', isLoading: false });
    }
  },

  getRandomQuote: () => {
    const { quotes, featuredQuotes } = get();
    
    if (quotes.length === 0) return;

    // Priority: featured quotes first, then non-featured
    const nonFeaturedQuotes = quotes.filter(q => !q.isFeatured && q.isActive);
    
    // 70% chance to show featured quote if available
    if (featuredQuotes.length > 0 && Math.random() < 0.7) {
      const randomIndex = Math.floor(Math.random() * featuredQuotes.length);
      set({ currentQuote: featuredQuotes[randomIndex] });
    } else if (nonFeaturedQuotes.length > 0) {
      const randomIndex = Math.floor(Math.random() * nonFeaturedQuotes.length);
      set({ currentQuote: nonFeaturedQuotes[randomIndex] });
    } else if (featuredQuotes.length > 0) {
      const randomIndex = Math.floor(Math.random() * featuredQuotes.length);
      set({ currentQuote: featuredQuotes[randomIndex] });
    }
  },

  clearError: () => set({ error: null })
}));
