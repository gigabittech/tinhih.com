import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface PremiumStatCardProps {
  icon: LucideIcon;
  number: number;
  label: string;
  subtext?: string;
  gradient: string;
  delay?: number;
  suffix?: string;
  prefix?: string;
}

export function PremiumStatCard({ 
  icon: Icon, 
  number, 
  label, 
  subtext, 
  gradient, 
  delay = 0,
  suffix = "",
  prefix = ""
}: PremiumStatCardProps) {
  const [count, setCount] = useState(0);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, delay);

    return () => clearTimeout(timer);
  }, [delay]);

  useEffect(() => {
    if (!isVisible) return;

    const duration = 2000; // 2 seconds
    const steps = 60;
    const increment = number / steps;
    let current = 0;

    const timer = setInterval(() => {
      current += increment;
      if (current >= number) {
        setCount(number);
        clearInterval(timer);
      } else {
        setCount(Math.floor(current));
      }
    }, duration / steps);

    return () => clearInterval(timer);
  }, [isVisible, number]);

  return (
    <Card className="group relative overflow-hidden border-0 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
      <div className={cn(
        "absolute inset-0 opacity-10 group-hover:opacity-20 transition-opacity duration-300",
        gradient
      )} />
      
      <CardContent className="relative p-6">
        <div className="flex items-center justify-between mb-4">
          <div className={cn(
            "p-3 rounded-xl shadow-md",
            gradient
          )}>
            <Icon className="h-6 w-6 text-white" />
          </div>
          {subtext && (
            <div className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
              {subtext}
            </div>
          )}
        </div>
        
        <div className="space-y-2">
          <div className="flex items-baseline space-x-1">
            {prefix && (
              <span className="text-lg font-medium text-gray-600">{prefix}</span>
            )}
            <span className="text-3xl font-bold text-gray-900">
              {count.toLocaleString()}
            </span>
            {suffix && (
              <span className="text-lg font-medium text-gray-600">{suffix}</span>
            )}
          </div>
          <p className="text-sm font-medium text-gray-600">{label}</p>
        </div>
        
        {/* Animated progress bar */}
        <div className="mt-4 h-1 bg-gray-200 rounded-full overflow-hidden">
          <div 
            className={cn(
              "h-full transition-all duration-1000 ease-out",
              gradient
            )}
            style={{ 
              width: isVisible ? `${Math.min((count / number) * 100, 100)}%` : '0%' 
            }}
          />
        </div>
      </CardContent>
    </Card>
  );
}
