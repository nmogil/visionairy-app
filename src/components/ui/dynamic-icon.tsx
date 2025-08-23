import { useState, useEffect, FC, forwardRef } from "react";
import { LucideProps, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface DynamicIconProps extends LucideProps {
  name: string;
  fallback?: FC<LucideProps>;
  showLoader?: boolean;
}

export const DynamicIcon = forwardRef<SVGSVGElement, DynamicIconProps>(
  ({ name, fallback: Fallback, showLoader = true, className, ...props }, ref) => {
    const [IconComponent, setIconComponent] = useState<FC<LucideProps> | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [hasError, setHasError] = useState(false);
    
    useEffect(() => {
      const loadIcon = async () => {
        setIsLoading(true);
        setHasError(false);
        
        try {
          const iconModule = await import("lucide-react");
          const Icon = iconModule[name as keyof typeof iconModule] as FC<LucideProps>;
          
          if (Icon && typeof Icon === 'function') {
            setIconComponent(() => Icon);
          } else {
            throw new Error(`Icon ${name} not found`);
          }
        } catch (error) {
          console.warn(`Failed to load icon: ${name}`);
          setHasError(true);
          
          if (Fallback) {
            setIconComponent(() => Fallback);
          }
        } finally {
          setIsLoading(false);
        }
      };
      
      loadIcon();
    }, [name, Fallback]);
    
    // Show loader while loading
    if (isLoading && showLoader) {
      return (
        <Loader2 
          ref={ref}
          className={cn("animate-spin", className)} 
          {...props} 
        />
      );
    }
    
    // Show placeholder if no icon could be loaded
    if (!IconComponent) {
      return (
        <div 
          ref={ref as React.Ref<HTMLDivElement>}
          className={cn("inline-block", className)} 
          style={{ width: props.size || 16, height: props.size || 16 }}
          {...(props as React.HTMLAttributes<HTMLDivElement>)}
        />
      );
    }
    
    return <IconComponent ref={ref} className={className} {...props} />;
  }
);

DynamicIcon.displayName = "DynamicIcon";

// Specific optimized icons for common use cases
export const DynamicCopy = (props: Omit<DynamicIconProps, 'name'>) => (
  <DynamicIcon name="Copy" {...props} />
);

export const DynamicPlay = (props: Omit<DynamicIconProps, 'name'>) => (
  <DynamicIcon name="Play" {...props} />
);

export const DynamicSettings = (props: Omit<DynamicIconProps, 'name'>) => (
  <DynamicIcon name="Settings" {...props} />
);

export const DynamicUsers = (props: Omit<DynamicIconProps, 'name'>) => (
  <DynamicIcon name="Users" {...props} />
);

export const DynamicLogOut = (props: Omit<DynamicIconProps, 'name'>) => (
  <DynamicIcon name="LogOut" {...props} />
);

export const DynamicUserX = (props: Omit<DynamicIconProps, 'name'>) => (
  <DynamicIcon name="UserX" {...props} />
);

export default DynamicIcon;