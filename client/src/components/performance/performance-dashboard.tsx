import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { usePerformance } from '@/hooks/usePerformance';
import { TrendingUp, TrendingDown, Clock, Zap, AlertTriangle } from 'lucide-react';

export function PerformanceDashboard() {
  const { metrics, score, grade, totalLoadTime, isLoading } = usePerformance();

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 80) return 'text-yellow-600';
    if (score >= 70) return 'text-orange-600';
    return 'text-red-600';
  };

  const getGradeColor = (grade: string) => {
    switch (grade) {
      case 'A': return 'bg-green-100 text-green-800 border-green-200';
      case 'B': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'C': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'D': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'F': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getMetricStatus = (metric: string, value: number) => {
    const thresholds: Record<string, { good: number; poor: number }> = {
      fcp: { good: 1000, poor: 1800 },
      lcp: { good: 2500, poor: 4000 },
      fid: { good: 100, poor: 300 },
      cls: { good: 0.1, poor: 0.25 },
      ttfb: { good: 800, poor: 1800 },
    };

    const threshold = thresholds[metric];
    if (!threshold) return 'unknown';

    if (value <= threshold.good) return 'good';
    if (value <= threshold.poor) return 'needs-improvement';
    return 'poor';
  };

  const getMetricIcon = (status: string) => {
    switch (status) {
      case 'good': return <TrendingUp className="h-4 w-4 text-green-600" />;
      case 'needs-improvement': return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      case 'poor': return <TrendingDown className="h-4 w-4 text-red-600" />;
      default: return <Clock className="h-4 w-4 text-gray-600" />;
    }
  };

  const getMetricColor = (status: string) => {
    switch (status) {
      case 'good': return 'text-green-600';
      case 'needs-improvement': return 'text-yellow-600';
      case 'poor': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overall Performance Score */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Performance Overview
          </CardTitle>
          <CardDescription>
            Real-time performance metrics and recommendations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <div className="text-center">
                <div className={`text-4xl font-bold ${getScoreColor(score)}`}>
                  {score}
                </div>
                <div className="text-sm text-muted-foreground">Score</div>
              </div>
              <Badge className={`text-lg px-4 py-2 ${getGradeColor(grade)}`}>
                Grade {grade}
              </Badge>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold">
                {totalLoadTime.toFixed(0)}ms
              </div>
              <div className="text-sm text-muted-foreground">Total Load Time</div>
            </div>
          </div>
          <Progress value={score} className="h-3" />
        </CardContent>
      </Card>

      {/* Core Web Vitals */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">First Contentful Paint</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className={`text-2xl font-bold ${getMetricColor(getMetricStatus('fcp', metrics.fcp))}`}>
                {metrics.fcp.toFixed(0)}ms
              </span>
              {getMetricIcon(getMetricStatus('fcp', metrics.fcp))}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              Target: &lt;1000ms
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Largest Contentful Paint</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className={`text-2xl font-bold ${getMetricColor(getMetricStatus('lcp', metrics.lcp))}`}>
                {metrics.lcp.toFixed(0)}ms
              </span>
              {getMetricIcon(getMetricStatus('lcp', metrics.lcp))}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              Target: &lt;2500ms
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">First Input Delay</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className={`text-2xl font-bold ${getMetricColor(getMetricStatus('fid', metrics.fid))}`}>
                {metrics.fid.toFixed(0)}ms
              </span>
              {getMetricIcon(getMetricStatus('fid', metrics.fid))}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              Target: &lt;100ms
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Cumulative Layout Shift</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className={`text-2xl font-bold ${getMetricColor(getMetricStatus('cls', metrics.cls))}`}>
                {metrics.cls.toFixed(3)}
              </span>
              {getMetricIcon(getMetricStatus('cls', metrics.cls))}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              Target: &lt;0.1
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Time to First Byte</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className={`text-2xl font-bold ${getMetricColor(getMetricStatus('ttfb', metrics.ttfb))}`}>
                {metrics.ttfb.toFixed(0)}ms
              </span>
              {getMetricIcon(getMetricStatus('ttfb', metrics.ttfb))}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              Target: &lt;800ms
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">DOM Load Time</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold text-gray-600">
                {metrics.domLoad.toFixed(0)}ms
              </span>
              <Clock className="h-4 w-4 text-gray-600" />
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              DOM Ready
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Performance Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle>Performance Recommendations</CardTitle>
          <CardDescription>
            Actionable steps to improve your application performance
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {score < 90 && (
              <>
                {metrics.fcp > 1000 && (
                  <div className="flex items-start gap-3 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                    <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
                    <div>
                      <div className="font-medium text-yellow-800">Optimize First Contentful Paint</div>
                      <div className="text-sm text-yellow-700">
                        Consider code splitting, lazy loading, and optimizing critical rendering path
                      </div>
                    </div>
                  </div>
                )}
                
                {metrics.lcp > 2500 && (
                  <div className="flex items-start gap-3 p-3 bg-orange-50 rounded-lg border border-orange-200">
                    <AlertTriangle className="h-5 w-5 text-orange-600 mt-0.5" />
                    <div>
                      <div className="font-medium text-orange-800">Improve Largest Contentful Paint</div>
                      <div className="text-sm text-orange-700">
                        Optimize images, implement lazy loading, and reduce render-blocking resources
                      </div>
                    </div>
                  </div>
                )}
                
                {metrics.fid > 100 && (
                  <div className="flex items-start gap-3 p-3 bg-red-50 rounded-lg border border-red-200">
                    <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
                    <div>
                      <div className="font-medium text-red-800">Reduce First Input Delay</div>
                      <div className="text-sm text-red-700">
                        Break up long tasks, optimize JavaScript execution, and reduce main thread blocking
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
            
            {score >= 90 && (
              <div className="flex items-start gap-3 p-3 bg-green-50 rounded-lg border border-green-200">
                <TrendingUp className="h-5 w-5 text-green-600 mt-0.5" />
                <div>
                  <div className="font-medium text-green-800">Excellent Performance!</div>
                  <div className="text-sm text-green-700">
                    Your application is performing well. Keep monitoring for any regressions.
                  </div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
