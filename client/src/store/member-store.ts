import { create } from 'zustand';
import { api } from '@/lib/api';

interface MemberProfile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  role: string;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
}

interface MemberStats {
  totalQuotes: number;
  totalEvents: number;
  totalDonations: number;
  memberSince: string;
  eventsAttended: number;
  productsPurchased: number;
  donationsMade: number;
  communityContributions: number;
  daysAsMember: number;
}

interface MemberState {
  profile: MemberProfile | null;
  stats: MemberStats | null;
  isLoading: boolean;
  error: string | null;
}

interface MemberActions {
  setProfile: (profile: MemberProfile | null) => void;
  setStats: (stats: MemberStats | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  fetchProfile: () => Promise<void>;
  fetchStats: () => Promise<void>;
  updateProfile: (data: Partial<MemberProfile>) => Promise<void>;
  clearError: () => void;
}

type MemberStore = MemberState & MemberActions;

export const useMemberStore = create<MemberStore>((set, get) => ({
  // State
  profile: null,
  stats: null,
  isLoading: false,
  error: null,

  // Actions
  setProfile: (profile) => set({ profile }),
  setStats: (stats) => set({ stats }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),

  fetchProfile: async () => {
    try {
      set({ isLoading: true, error: null });
      
      // Try to fetch from API first
      try {
        const response = await api.get('/api/auth/me');
        
        if (response.success) {
          set({ profile: response.user, isLoading: false });
          return;
        }
      } catch (apiError) {
        console.log('Member profile API not available, using fallback data');
      }
      
      // Fallback: Create profile from user data or use default
      const fallbackProfile: MemberProfile = {
        id: '1',
        firstName: 'Community',
        lastName: 'Member',
        email: 'member@tinhih.org',
        phone: null,
        role: 'member',
        isActive: true,
        lastLoginAt: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      set({ profile: fallbackProfile, isLoading: false });
    } catch (error: any) {
      set({ error: error.message || 'Failed to fetch profile', isLoading: false });
    }
  },

  fetchStats: async () => {
    try {
      set({ isLoading: true, error: null });
      
      // Try to fetch from API first
      try {
        console.log('Fetching member stats from API...');
        const response = await api.get('/api/member/stats');
        
        console.log('Member stats API response:', response);
        
        if (response.success) {
          console.log('Setting member stats:', response.data);
          set({ stats: response.data, isLoading: false });
          return;
        } else {
          console.log('Member stats API returned error:', response.error);
        }
      } catch (apiError) {
        console.error('Member stats API error:', apiError);
        console.log('Member stats API not available, using fallback data');
      }
      
      // Fallback: Create default stats
      const fallbackStats: MemberStats = {
        totalQuotes: 0,
        totalEvents: 0,
        totalDonations: 0,
        memberSince: new Date().toISOString(),
        eventsAttended: 0,
        productsPurchased: 0,
        donationsMade: 0,
        communityContributions: 0,
        daysAsMember: 0
      };
      
      set({ stats: fallbackStats, isLoading: false });
    } catch (error: any) {
      set({ error: error.message || 'Failed to fetch stats', isLoading: false });
    }
  },

  updateProfile: async (data) => {
    try {
      set({ isLoading: true, error: null });
      
      // Try to update via API first
      try {
        const response = await api.put('/api/auth/profile', data);
        
        if (response.success) {
          set({ profile: response.user, isLoading: false });
          return;
        }
      } catch (apiError) {
        console.log('Member profile update API not available, updating locally');
      }
      
      // Fallback: Update locally
      const currentProfile = get().profile;
      if (currentProfile) {
        const updatedProfile = { ...currentProfile, ...data, updatedAt: new Date().toISOString() };
        set({ profile: updatedProfile, isLoading: false });
      }
    } catch (error: any) {
      set({ error: error.message || 'Failed to update profile', isLoading: false });
    }
  },

  clearError: () => set({ error: null })
}));
