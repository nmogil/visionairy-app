import * as React from "react";
import { cn } from "@/lib/utils";

export interface RetroButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  size?: "default" | "sm" | "lg" | "xl" | "icon";
}

const sizeClasses: Record<NonNullable<RetroButtonProps["size"]>, string> = {
  sm: "h-8 px-3 text-xs",
  default: "h-10 px-4 text-sm",
  lg: "h-11 px-5 text-base",
  xl: "h-12 px-6 text-base md:text-lg",
  icon: "h-10 w-10",
};

export const RetroButton = React.forwardRef<HTMLButtonElement, RetroButtonProps>(
  ({ className, size = "default", children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center gap-2 select-none rounded-none border-2",
          "font-display tracking-wide",
          "border-foreground bg-background text-foreground",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          "transition-transform duration-150 ease-out",
          "hover:-translate-x-px hover:-translate-y-px active:translate-x-px active:translate-y-px",
          sizeClasses[size],
          className
        )}
        style={{ boxShadow: "4px 4px 0 0 hsl(var(--foreground))" }}
        {...props}
      >
        {children}
      </button>
    );
  }
);
RetroButton.displayName = "RetroButton";

export default RetroButton;
