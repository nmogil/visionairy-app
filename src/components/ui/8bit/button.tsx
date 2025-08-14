import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "@radix-ui/react-slot";
import { cn } from "@/lib/utils";
import { ButtonLift, ScaleClick } from "@/components/interactions/MicroInteractions";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 select-none rounded-none border-2 font-display tracking-wide transition-transform duration-150 ease-out hover:-translate-x-px hover:-translate-y-px active:translate-x-px active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background",
  {
    variants: {
      variant: {
        default: "bg-background text-foreground border-foreground",
        outline: "bg-transparent text-foreground border-foreground",
        ghost: "bg-transparent text-foreground border-transparent",
        neon: "bg-background text-primary border-border",
      },
      size: {
        default: "h-10 px-4 text-sm",
        sm: "h-8 px-3 text-xs",
        lg: "h-11 px-5 text-base",
        xl: "h-12 px-6 text-base md:text-lg",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  disableAnimations?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, disableAnimations = false, children, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    
    const buttonContent = (
      <Comp
        ref={ref}
        className={cn(buttonVariants({ variant, size }), className)}
        {...props}
      >
        {children}
      </Comp>
    );

    // Skip animations if disabled or if it's a ghost/icon variant (to avoid interference)
    if (disableAnimations || variant === "ghost" || size === "icon") {
      return buttonContent;
    }

    // Wrap primary action buttons with more emphasis
    if (variant === "default" || variant === "neon") {
      return (
        <ButtonLift>
          <ScaleClick>
            {buttonContent}
          </ScaleClick>
        </ButtonLift>
      );
    }

    // Wrap other buttons with subtle lift
    return (
      <ButtonLift>
        {buttonContent}
      </ButtonLift>
    );
  }
);
Button.displayName = "Button";

export { buttonVariants };
