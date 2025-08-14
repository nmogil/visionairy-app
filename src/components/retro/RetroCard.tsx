import * as React from "react";
import { cn } from "@/lib/utils";

export const RetroCard = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, style, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "rounded-none border-2 bg-card text-card-foreground",
      className
    )}
    style={{ boxShadow: "6px 6px 0 0 hsl(var(--border))", ...style }}
    {...props}
  />
));
RetroCard.displayName = "RetroCard";

export const RetroCardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("p-6", className)} {...props} />
));
RetroCardContent.displayName = "RetroCardContent";

export default RetroCard;
