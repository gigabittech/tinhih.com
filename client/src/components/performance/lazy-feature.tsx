import React, { Suspense, lazy, useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, Download } from 'lucide-react';

interface LazyFeatureProps {
  feature: string;
  fallback?: React.ReactNode;
  children: React.ReactNode;
  threshold?: number; // Intersection Observer threshold
  preload?: boolean; // Whether to preload when in viewport
}

// Component loading states
const loadingStates = {
  'charts': { name: 'Charts & Analytics', size: '~380KB' },
  'pdf': { name: 'PDF Generation', size: '~590KB' },
  'stripe': { name: 'Payment Processing', size: '~35KB' },
  'calendar': { name: 'Calendar Features', size: '~90KB' },
  'default': { name: 'Feature', size: 'Unknown' }
};

export function LazyFeature({ 
  feature, 
  fallback, 
  children, 
  threshold = 0.1,
  preload = true 
}: LazyFeatureProps) {
  const [isInView, setIsInView] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const featureInfo = loadingStates[feature as keyof typeof loadingStates] || loadingStates.default;

  useEffect(() => {
    if (!preload) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      { threshold }
    );

    const element = document.getElementById(`lazy-feature-${feature}`);
    if (element) {
      observer.observe(element);
    }

    return () => observer.disconnect();
  }, [feature, threshold, preload]);

  const handleLoad = () => {
    setIsLoading(true);
    // Simulate loading time for better UX
    setTimeout(() => {
      setIsLoaded(true);
      setIsLoading(false);
    }, 100);
  };

  if (!isInView && !isLoaded) {
    return (
      <div 
        id={`lazy-feature-${feature}`}
        className="flex flex-col items-center justify-center p-8 text-center border-2 border-dashed border-muted-foreground/20 rounded-lg bg-muted/10"
      >
        <Download className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">{featureInfo.name}</h3>
        <p className="text-sm text-muted-foreground mb-4">
          This feature will be loaded when needed to improve performance
        </p>
        <p className="text-xs text-muted-foreground mb-4">
          Bundle size: {featureInfo.size}
        </p>
        <Button 
          onClick={handleLoad}
          disabled={isLoading}
          variant="outline"
          size="sm"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Loading...
            </>
          ) : (
            'Load Now'
          )}
        </Button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
        <p className="text-sm text-muted-foreground">
          Loading {featureInfo.name}...
        </p>
      </div>
    );
  }

  return (
    <Suspense fallback={fallback || (
      <div className="flex items-center justify-center p-4">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    )}>
      {children}
    </Suspense>
  );
}

// Predefined lazy loaders for common heavy features
export const LazyCharts = ({ children }: { children: React.ReactNode }) => (
  <LazyFeature feature="charts" preload={false}>
    {children}
  </LazyFeature>
);

export const LazyPDF = ({ children }: { children: React.ReactNode }) => (
  <LazyFeature feature="pdf" preload={false}>
    {children}
  </LazyFeature>
);

export const LazyStripe = ({ children }: { children: React.ReactNode }) => (
  <LazyFeature feature="stripe" preload={false}>
    {children}
  </LazyFeature>
);

export const LazyCalendar = ({ children }: { children: React.ReactNode }) => (
  <LazyFeature feature="calendar" preload={true}>
    {children}
  </LazyFeature>
);
