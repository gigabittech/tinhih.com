import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/context/auth-context";

interface ThemeContextType {
  theme: 'light' | 'dark' | 'auto';
  compactMode: boolean;
  showPatientPhotos: boolean;
  highContrast: boolean;
  reduceMotion: boolean;
  screenReaderOptimized: boolean;
  fontSize: 'small' | 'medium' | 'large';
  calendarView: 'day' | 'week' | 'month';
  showWeekends: boolean;
  setTheme: (theme: 'light' | 'dark' | 'auto') => void;
  setCompactMode: (compact: boolean) => void;
  setShowPatientPhotos: (show: boolean) => void;
  setHighContrast: (contrast: boolean) => void;
  setReduceMotion: (reduce: boolean) => void;
  setScreenReaderOptimized: (optimized: boolean) => void;
  setFontSize: (size: 'small' | 'medium' | 'large') => void;
  setCalendarView: (view: 'day' | 'week' | 'month') => void;
  setShowWeekends: (show: boolean) => void;
  toggleTheme: () => void;
  currentTheme: 'light' | 'dark';
  resetTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [theme, setThemeState] = useState<'light' | 'dark' | 'auto'>('light');
  const [compactMode, setCompactModeState] = useState(false);
  const [showPatientPhotos, setShowPatientPhotosState] = useState(true);
  const [highContrast, setHighContrastState] = useState(false);
  const [reduceMotion, setReduceMotionState] = useState(false);
  const [screenReaderOptimized, setScreenReaderOptimizedState] = useState(false);
  const [fontSize, setFontSizeState] = useState<'small' | 'medium' | 'large'>('medium');
  const [calendarView, setCalendarViewState] = useState<'day' | 'week' | 'month'>('week');
  const [showWeekends, setShowWeekendsState] = useState(true);
  const [currentTheme, setCurrentTheme] = useState<'light' | 'dark'>('light');

  const queryClient = useQueryClient();

  // Load user preferences - only when user is authenticated
  const { data: userPreferences } = useQuery<any>({
    queryKey: ['/api/user-preferences'],
    queryFn: async () => {
      const response = await apiRequest('/api/user-preferences', 'GET');
      return response.json();
    },
    enabled: !!user,
    retry: false,
    staleTime: 30000,
    gcTime: 300000,
  });

  // Update preferences mutation
  const updatePreferences = useMutation({
    mutationFn: (data: any) => apiRequest('/api/user-preferences', 'PUT', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/user-preferences'] });
    }
  });

  // Reset theme to default values
  const resetTheme = () => {
    setThemeState('light');
    setCompactModeState(false);
    setShowPatientPhotosState(true);
    setHighContrastState(false);
    setReduceMotionState(false);
    setScreenReaderOptimizedState(false);
    setFontSizeState('medium');
    setCalendarViewState('week');
    setShowWeekendsState(true);
    setCurrentTheme('light');
    
    queryClient.removeQueries({ queryKey: ['/api/user-preferences'] });
  };

  // Reset theme when user logs out and apply default theme immediately
  useEffect(() => {
    if (!user) {
      resetTheme();
      const root = window.document.documentElement;
      const body = window.document.body;
      
      root.classList.remove('light', 'dark', 'compact-mode', 'high-contrast', 'reduce-motion', 'screen-reader-optimized');
      root.classList.remove('font-small', 'font-medium', 'font-large');
      body.classList.remove('light', 'dark', 'compact-mode', 'high-contrast', 'reduce-motion', 'screen-reader-optimized');
      body.classList.remove('font-small', 'font-medium', 'font-large');
      
      root.classList.add('light');
      body.classList.add('light');
      root.classList.add('font-medium');
      body.classList.add('font-medium');
      
      root.style.setProperty('color-scheme', 'light');
      body.style.setProperty('color-scheme', 'light');
    }
  }, [user]);

  // Initialize theme and preferences from API when user logs in
  useEffect(() => {
    if (user && userPreferences) {
      setThemeState(userPreferences?.theme || 'light');
      setCompactModeState(userPreferences?.compactMode || false);
      setShowPatientPhotosState(userPreferences?.showPatientPhotos !== false);
      setHighContrastState(userPreferences?.highContrast || false);
      setReduceMotionState(userPreferences?.reduceMotion || false);
      setScreenReaderOptimizedState(userPreferences?.screenReaderOptimized || false);
      setFontSizeState(userPreferences?.fontSizeScale || 'medium');
      setCalendarViewState(userPreferences?.calendarView || 'week');
      setShowWeekendsState(userPreferences?.showWeekends !== false);
      
      setTimeout(() => {
        const root = window.document.documentElement;
        const body = window.document.body;
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        
        let resolvedTheme: 'light' | 'dark' = 'light';
        const userTheme = userPreferences?.theme || 'light';
        
        if (userTheme === 'auto') {
          resolvedTheme = mediaQuery.matches ? 'dark' : 'light';
        } else {
          resolvedTheme = userTheme;
        }
        
        root.classList.remove('light', 'dark', 'compact-mode', 'high-contrast', 'reduce-motion', 'screen-reader-optimized');
        root.classList.remove('font-small', 'font-medium', 'font-large');
        body.classList.remove('light', 'dark', 'compact-mode', 'high-contrast', 'reduce-motion', 'screen-reader-optimized');
        body.classList.remove('font-small', 'font-medium', 'font-large');
        
        root.classList.add(resolvedTheme);
        body.classList.add(resolvedTheme);
        root.classList.add(`font-${userPreferences?.fontSizeScale || 'medium'}`);
        body.classList.add(`font-${userPreferences?.fontSizeScale || 'medium'}`);
        
        root.style.setProperty('color-scheme', resolvedTheme);
        body.style.setProperty('color-scheme', resolvedTheme);
      }, 0);
    }
  }, [user, userPreferences]);

  // Apply theme to document
  useEffect(() => {
    const root = window.document.documentElement;
    const body = window.document.body;
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const contrastMediaQuery = window.matchMedia('(prefers-contrast: high)');
    const motionMediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    
    const applyTheme = () => {
      let resolvedTheme: 'light' | 'dark' = 'light';
      
      if (theme === 'auto') {
        resolvedTheme = mediaQuery.matches ? 'dark' : 'light';
      } else {
        resolvedTheme = theme;
      }
      
      setCurrentTheme(resolvedTheme);
      
      requestAnimationFrame(() => {
        // Remove all theme classes
        root.classList.remove('light', 'dark', 'compact-mode', 'high-contrast', 'reduce-motion', 'screen-reader-optimized');
        root.classList.remove('font-small', 'font-medium', 'font-large');
        body.classList.remove('light', 'dark', 'compact-mode', 'high-contrast', 'reduce-motion', 'screen-reader-optimized');
        body.classList.remove('font-small', 'font-medium', 'font-large');
        
        // Apply base theme
        root.classList.add(resolvedTheme);
        body.classList.add(resolvedTheme);
        
        // Apply high contrast if needed
        const shouldUseHighContrast = highContrast || contrastMediaQuery.matches;
        if (shouldUseHighContrast) {
          root.classList.add('high-contrast');
          body.classList.add('high-contrast');
        }
        
        // Apply compact mode
        if (compactMode) {
          root.classList.add('compact-mode');
          body.classList.add('compact-mode');
        }
        
        // Apply reduced motion
        const shouldReduceMotion = reduceMotion || motionMediaQuery.matches;
        if (shouldReduceMotion) {
          root.classList.add('reduce-motion');
          body.classList.add('reduce-motion');
        }
        
        // Apply font size
        root.classList.add(`font-${fontSize}`);
        body.classList.add(`font-${fontSize}`);
        
        // Apply screen reader optimization
        if (screenReaderOptimized) {
          root.classList.add('screen-reader-optimized');
          body.classList.add('screen-reader-optimized');
        }

        // Set color scheme
        root.style.setProperty('color-scheme', resolvedTheme);
        body.style.setProperty('color-scheme', resolvedTheme);
        
        // Set data attribute for CSS targeting
        root.setAttribute('data-theme', resolvedTheme);
        body.setAttribute('data-theme', resolvedTheme);
        
        // Force reflow
        void root.offsetHeight;
        
        // Dispatch theme change event
        window.dispatchEvent(new CustomEvent('themechange', { 
          detail: { theme: resolvedTheme } 
        }));
      });
    };

    applyTheme();
    
    const handleMediaQueryChange = () => {
      if (theme === 'auto') {
        applyTheme();
      }
    };
    
    const handleContrastChange = () => {
      applyTheme();
    };
    
    const handleMotionChange = () => {
      applyTheme();
    };
    
    mediaQuery.addEventListener('change', handleMediaQueryChange);
    contrastMediaQuery.addEventListener('change', handleContrastChange);
    motionMediaQuery.addEventListener('change', handleMotionChange);
    
    return () => {
      mediaQuery.removeEventListener('change', handleMediaQueryChange);
      contrastMediaQuery.removeEventListener('change', handleContrastChange);
      motionMediaQuery.removeEventListener('change', handleMotionChange);
    };
  }, [theme, compactMode, highContrast, reduceMotion, fontSize, screenReaderOptimized]);

  // Theme setters that also update the backend
  const setTheme = (newTheme: 'light' | 'dark' | 'auto') => {
    // Update state immediately for instant UI response
    setThemeState(newTheme);
    
    // Apply theme changes synchronously to DOM
    const root = window.document.documentElement;
    const body = window.document.body;
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const contrastMediaQuery = window.matchMedia('(prefers-contrast: high)');
    const motionMediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    
    let resolvedTheme: 'light' | 'dark' = 'light';
    if (newTheme === 'auto') {
      resolvedTheme = mediaQuery.matches ? 'dark' : 'light';
    } else {
      resolvedTheme = newTheme;
    }
    
    // Immediately update current theme state
    setCurrentTheme(resolvedTheme);
    
    // Apply theme changes synchronously (no requestAnimationFrame for immediate effect)
    // Remove all theme classes first
    root.classList.remove('light', 'dark', 'compact-mode', 'high-contrast', 'reduce-motion', 'screen-reader-optimized');
    root.classList.remove('font-small', 'font-medium', 'font-large');
    body.classList.remove('light', 'dark', 'compact-mode', 'high-contrast', 'reduce-motion', 'screen-reader-optimized');
    body.classList.remove('font-small', 'font-medium', 'font-large');
    
    // Apply base theme classes
    root.classList.add(resolvedTheme);
    body.classList.add(resolvedTheme);
    
    // Apply high contrast if needed
    const shouldUseHighContrast = highContrast || contrastMediaQuery.matches;
    if (shouldUseHighContrast) {
      root.classList.add('high-contrast');
      body.classList.add('high-contrast');
    }
    
    // Apply compact mode
    if (compactMode) {
      root.classList.add('compact-mode');
      body.classList.add('compact-mode');
    }
    
    // Apply reduced motion
    const shouldReduceMotion = reduceMotion || motionMediaQuery.matches;
    if (shouldReduceMotion) {
      root.classList.add('reduce-motion');
      body.classList.add('reduce-motion');
    }
    
    // Apply font size
    root.classList.add(`font-${fontSize}`);
    body.classList.add(`font-${fontSize}`);
    
    // Apply screen reader optimization
    if (screenReaderOptimized) {
      root.classList.add('screen-reader-optimized');
      body.classList.add('screen-reader-optimized');
    }

    // Set color scheme
    root.style.setProperty('color-scheme', resolvedTheme);
    body.style.setProperty('color-scheme', resolvedTheme);
    
    // Set data attribute for CSS targeting
    root.setAttribute('data-theme', resolvedTheme);
    body.setAttribute('data-theme', resolvedTheme);
    
    // Force immediate reflow to ensure all changes are applied
    void root.offsetHeight;
    
    // Dispatch theme change event to notify all components
    window.dispatchEvent(new CustomEvent('themechange', { 
      detail: { theme: resolvedTheme } 
    }));
    
    // Update backend preferences (non-blocking)
    updatePreferences.mutate({ theme: newTheme });
  };

  const setCompactMode = (compact: boolean) => {
    setCompactModeState(compact);
    updatePreferences.mutate({ compactMode: compact });
  };

  const setShowPatientPhotos = (show: boolean) => {
    setShowPatientPhotosState(show);
    updatePreferences.mutate({ showPatientPhotos: show });
  };

  const setHighContrast = (contrast: boolean) => {
    setHighContrastState(contrast);
    updatePreferences.mutate({ highContrast: contrast });
  };

  const setReduceMotion = (reduce: boolean) => {
    setReduceMotionState(reduce);
    updatePreferences.mutate({ reduceMotion: reduce });
  };

  const setScreenReaderOptimized = (optimized: boolean) => {
    setScreenReaderOptimizedState(optimized);
    updatePreferences.mutate({ screenReaderOptimized: optimized });
  };

  const setFontSize = (size: 'small' | 'medium' | 'large') => {
    setFontSizeState(size);
    updatePreferences.mutate({ fontSizeScale: size });
  };

  const setCalendarView = (view: 'day' | 'week' | 'month') => {
    setCalendarViewState(view);
    updatePreferences.mutate({ calendarView: view });
  };

  const setShowWeekends = (show: boolean) => {
    setShowWeekendsState(show);
    updatePreferences.mutate({ showWeekends: show });
  };

  const toggleTheme = () => {
    if (theme === 'light') {
      setTheme('dark');
    } else if (theme === 'dark') {
      setTheme('auto');
    } else {
      setTheme('light');
    }
  };

  return (
    <ThemeContext.Provider value={{
      theme,
      compactMode,
      showPatientPhotos,
      highContrast,
      reduceMotion,
      screenReaderOptimized,
      fontSize,
      calendarView,
      showWeekends,
      currentTheme,
      setTheme,
      setCompactMode,
      setShowPatientPhotos,
      setHighContrast,
      setReduceMotion,
      setScreenReaderOptimized,
      setFontSize,
      setCalendarView,
      setShowWeekends,
      toggleTheme,
      resetTheme,
    }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}