import * as React from "react";
import { cn } from "@/lib/utils";

export interface RetroInputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {}

export const RetroInput = React.forwardRef<HTMLInputElement, RetroInputProps>(
  ({ className, ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={cn(
          "w-full h-10 px-3 py-2 rounded-none border-2",
          "border-foreground bg-background text-foreground",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          "placeholder:text-muted-foreground",
          className
        )}
        style={{ boxShadow: "4px 4px 0 0 hsl(var(--foreground))" }}
        {...props}
      />
    );
  }
);
RetroInput.displayName = "RetroInput";

export default RetroInput;
