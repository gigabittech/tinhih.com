import { create } from 'zustand';
import { api } from '@/lib/api';

interface Event {
  id: string;
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  location: string;
  isActive: boolean;
  maxAttendees?: number;
  currentAttendees?: number;
  category: string;
  tags: string[];
  image?: string;
  createdAt: string;
  updatedAt: string;
}

interface EventState {
  events: Event[];
  upcomingEvents: Event[];
  pastEvents: Event[];
  isLoading: boolean;
  error: string | null;
  selectedEvent: Event | null;
}

interface EventActions {
  setEvents: (events: Event[]) => void;
  setUpcomingEvents: (events: Event[]) => void;
  setPastEvents: (events: Event[]) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setSelectedEvent: (event: Event | null) => void;
  fetchEvents: () => Promise<void>;
  fetchEventById: (id: string) => Promise<void>;
  clearError: () => void;
}

type EventStore = EventState & EventActions;

export const useEventStore = create<EventStore>((set, get) => ({
  // State
  events: [],
  upcomingEvents: [],
  pastEvents: [],
  isLoading: false,
  error: null,
  selectedEvent: null,

  // Actions
  setEvents: (events) => set({ events }),
  setUpcomingEvents: (upcomingEvents) => set({ upcomingEvents }),
  setPastEvents: (pastEvents) => set({ pastEvents }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
  setSelectedEvent: (selectedEvent) => set({ selectedEvent }),

  fetchEvents: async () => {
    try {
      set({ isLoading: true, error: null });
      const response = await api.get('/api/events');
      
      if (response.success) {
        const events = response.data || response;
        const now = new Date();
        
        const upcomingEvents = events.filter(
          (event: Event) => new Date(event.startDate) > now && event.isActive
        );
        
        const pastEvents = events.filter(
          (event: Event) => new Date(event.startDate) <= now
        );

        set({ 
          events, 
          upcomingEvents, 
          pastEvents, 
          isLoading: false 
        });
      } else {
        set({ error: response.error || 'Failed to fetch events', isLoading: false });
      }
    } catch (error: any) {
      set({ error: error.message || 'Failed to fetch events', isLoading: false });
    }
  },

  fetchEventById: async (id) => {
    try {
      set({ isLoading: true, error: null });
      const response = await api.get(`/api/events/${id}`);
      
      if (response.success) {
        set({ selectedEvent: response.data, isLoading: false });
      } else {
        set({ error: response.error || 'Failed to fetch event', isLoading: false });
      }
    } catch (error: any) {
      set({ error: error.message || 'Failed to fetch event', isLoading: false });
    }
  },

  clearError: () => set({ error: null })
}));
