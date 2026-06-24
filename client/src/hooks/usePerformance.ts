import { useEffect, useState, useCallback } from 'react';

interface PerformanceMetrics {
  fcp: number; // First Contentful Paint
  lcp: number; // Largest Contentful Paint
  fid: number; // First Input Delay
  cls: number; // Cumulative Layout Shift
  ttfb: number; // Time to First Byte
  domLoad: number; // DOM Content Loaded
  windowLoad: number; // Window Load
}

interface PerformanceData {
  metrics: PerformanceMetrics;
  isSupported: boolean;
  loadingStart: number;
  loadingEnd: number;
  totalLoadTime: number;
}

export function usePerformance() {
  const [performanceData, setPerformanceData] = useState<PerformanceData>({
    metrics: {
      fcp: 0,
      lcp: 0,
      fid: 0,
      cls: 0,
      ttfb: 0,
      domLoad: 0,
      windowLoad: 0,
    },
    isSupported: false,
    loadingStart: 0,
    loadingEnd: 0,
    totalLoadTime: 0,
  });

  const [isLoading, setIsLoading] = useState(true);

  const measurePerformance = useCallback(() => {
    if (!('PerformanceObserver' in window)) {
      setPerformanceData(prev => ({ ...prev, isSupported: false }));
      return;
    }

    const loadingStart = performance.now();
    setIsLoading(true);

    // Measure FCP (First Contentful Paint)
    const fcpObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const fcpEntry = entries.find(entry => entry.name === 'first-contentful-paint');
      if (fcpEntry) {
        setPerformanceData(prev => ({
          ...prev,
          metrics: { ...prev.metrics, fcp: fcpEntry.startTime }
        }));
      }
    });

    // Measure LCP (Largest Contentful Paint)
    const lcpObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const lcpEntry = entries[entries.length - 1];
      if (lcpEntry) {
        setPerformanceData(prev => ({
          ...prev,
          metrics: { ...prev.metrics, lcp: lcpEntry.startTime }
        }));
      }
    });

    // Measure FID (First Input Delay)
    const fidObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const fidEntry = entries[0] as PerformanceEventTiming;
      if (fidEntry && 'processingStart' in fidEntry) {
        setPerformanceData(prev => ({
          ...prev,
          metrics: { ...prev.metrics, fid: fidEntry.processingStart - fidEntry.startTime }
        }));
      }
    });

    // Measure CLS (Cumulative Layout Shift)
    const clsObserver = new PerformanceObserver((list) => {
      let clsValue = 0;
      for (const entry of list.getEntries()) {
        const layoutShiftEntry = entry as any;
        if (layoutShiftEntry && !layoutShiftEntry.hadRecentInput) {
          clsValue += layoutShiftEntry.value;
        }
      }
      setPerformanceData(prev => ({
        ...prev,
        metrics: { ...prev.metrics, cls: clsValue }
      }));
    });

    try {
      fcpObserver.observe({ entryTypes: ['paint'] });
      lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
      fidObserver.observe({ entryTypes: ['first-input'] });
      clsObserver.observe({ entryTypes: ['layout-shift'] });
    } catch (error) {
      console.warn('PerformanceObserver not supported:', error);
    }

    // Measure TTFB and other metrics
    const navigationEntry = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    if (navigationEntry) {
      setPerformanceData(prev => ({
        ...prev,
        metrics: {
          ...prev.metrics,
          ttfb: navigationEntry.responseStart - navigationEntry.requestStart,
          domLoad: navigationEntry.domContentLoadedEventEnd - navigationEntry.domContentLoadedEventStart,
          windowLoad: navigationEntry.loadEventEnd - navigationEntry.loadEventStart,
        }
      }));
    }

    // Measure total load time
    const handleLoad = () => {
      const loadingEnd = performance.now();
      const totalLoadTime = loadingEnd - loadingStart;
      
      setPerformanceData(prev => ({
        ...prev,
        loadingEnd,
        totalLoadTime,
        isSupported: true,
      }));
      setIsLoading(false);
    };

    if (document.readyState === 'complete') {
      handleLoad();
    } else {
      window.addEventListener('load', handleLoad);
      return () => window.removeEventListener('load', handleLoad);
    }

    return () => {
      fcpObserver.disconnect();
      lcpObserver.disconnect();
      fidObserver.disconnect();
      clsObserver.disconnect();
    };
  }, []);

  const getPerformanceScore = useCallback((metrics: PerformanceMetrics): number => {
    let score = 100;

    // FCP scoring (0-100)
    if (metrics.fcp > 1800) score -= 20;
    else if (metrics.fcp > 1000) score -= 10;

    // LCP scoring (0-100)
    if (metrics.lcp > 4000) score -= 20;
    else if (metrics.lcp > 2500) score -= 10;

    // FID scoring (0-100)
    if (metrics.fid > 300) score -= 20;
    else if (metrics.fid > 100) score -= 10;

    // CLS scoring (0-100)
    if (metrics.cls > 0.25) score -= 20;
    else if (metrics.cls > 0.1) score -= 10;

    return Math.max(0, score);
  }, []);

  const getPerformanceGrade = useCallback((score: number): string => {
    if (score >= 90) return 'A';
    if (score >= 80) return 'B';
    if (score >= 70) return 'C';
    if (score >= 60) return 'D';
    return 'F';
  }, []);

  useEffect(() => {
    const cleanup = measurePerformance();
    return cleanup;
  }, [measurePerformance]);

  return {
    ...performanceData,
    isLoading,
    getPerformanceScore,
    getPerformanceGrade,
    score: getPerformanceScore(performanceData.metrics),
    grade: getPerformanceGrade(getPerformanceScore(performanceData.metrics)),
  };
}
