import * as React from "react";
import * as SwitchPrimitives from "@radix-ui/react-switch";

import { cn } from "@/lib/utils";

const Switch = React.forwardRef<
  React.ElementRef<typeof SwitchPrimitives.Root>,
  React.ComponentPropsWithoutRef<typeof SwitchPrimitives.Root>
>(({ className, ...props }, ref) => (
  <SwitchPrimitives.Root
    className={cn(
      "peer inline-flex h-7 w-12 shrink-0 cursor-pointer items-center rounded-full border transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50",
      // Enhanced styling for better visibility with subtle borders
      "data-[state=checked]:bg-gradient-to-r data-[state=checked]:from-yellow-400 data-[state=checked]:to-orange-400 data-[state=checked]:border-yellow-300 data-[state=checked]:shadow-lg data-[state=checked]:shadow-yellow-200/50 data-[state=checked]:ring-2 data-[state=checked]:ring-yellow-200/50",
      "data-[state=unchecked]:bg-gray-200 data-[state=unchecked]:border-gray-300 data-[state=unchecked]:shadow-inner",
      // Dark mode OFF state
      "dark:data-[state=unchecked]:bg-gray-700 dark:data-[state=unchecked]:border-gray-600",
      // Hover effects
      "hover:data-[state=checked]:bg-gradient-to-r hover:data-[state=checked]:from-yellow-500 hover:data-[state=checked]:to-orange-500 hover:data-[state=checked]:shadow-xl hover:data-[state=checked]:shadow-yellow-300/60",
      "hover:data-[state=unchecked]:bg-gray-300 hover:data-[state=unchecked]:border-gray-400",
      "dark:hover:data-[state=unchecked]:bg-gray-600 dark:hover:data-[state=unchecked]:border-gray-500",
      className
    )}
    {...props}
    ref={ref}
  >
    <SwitchPrimitives.Thumb
      className={cn(
        "pointer-events-none block h-5 w-5 rounded-full shadow-sm ring-0 transition-all duration-200",
        // Enhanced thumb styling with golden color and subtle shadows
        "data-[state=checked]:translate-x-5 data-[state=checked]:bg-white  data-[state=checked]:shadow-black/20 data-[state=checked]:scale-105",
        "data-[state=unchecked]:translate-x-0.5 data-[state=unchecked]:bg-white data-[state=unchecked]:shadow-sm",
        // Subtle border for better definition
        "data-[state=checked]:border data-[state=checked]:border-white/50",
        "data-[state=unchecked]:border data-[state=unchecked]:border-gray-300/50",
        // Dark mode support for thumb
        "dark:data-[state=unchecked]:border-gray-600/50",
        // Scale effect on toggle
        "data-[state=checked]:scale-100 data-[state=unchecked]:scale-95"
      )}
    />
  </SwitchPrimitives.Root>
));
Switch.displayName = SwitchPrimitives.Root.displayName;

export { Switch };
