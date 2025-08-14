import React, { useState, useEffect, ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

// Hover Effects
export const ButtonLift: React.FC<{ children: ReactNode; className?: string }> = ({ 
  children, 
  className 
}) => (
  <motion.div
    className={cn("cursor-pointer", className)}
    whileHover={{ 
      y: -2, 
      transition: { duration: 0.2, ease: "easeOut" } 
    }}
    whileTap={{ 
      y: 0, 
      transition: { duration: 0.1 } 
    }}
  >
    {children}
  </motion.div>
);

export const CardShadow: React.FC<{ children: ReactNode; className?: string }> = ({ 
  children, 
  className 
}) => (
  <motion.div
    className={cn("rounded-lg transition-shadow duration-300", className)}
    whileHover={{ 
      boxShadow: "0 10px 30px -10px hsl(var(--primary) / 0.3)",
      transition: { duration: 0.3 } 
    }}
  >
    {children}
  </motion.div>
);

export const LinkUnderline: React.FC<{ children: ReactNode; className?: string }> = ({ 
  children, 
  className 
}) => (
  <span className={cn("relative inline-block cursor-pointer", className)}>
    {children}
    <motion.span
      className="absolute bottom-0 left-0 h-0.5 bg-primary"
      initial={{ width: 0 }}
      whileHover={{ 
        width: "100%",
        transition: { duration: 0.3, ease: "easeOut" }
      }}
    />
  </span>
);

export const IconRotate: React.FC<{ children: ReactNode; className?: string }> = ({ 
  children, 
  className 
}) => (
  <motion.div
    className={cn("inline-block", className)}
    whileHover={{ 
      rotate: 15,
      transition: { duration: 0.3, ease: "easeInOut" }
    }}
  >
    {children}
  </motion.div>
);

// Click Feedback
export const RippleEffect: React.FC<{ children: ReactNode; className?: string }> = ({ 
  children, 
  className 
}) => {
  const [ripples, setRipples] = useState<Array<{ id: number; x: number; y: number }>>([]);

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const newRipple = {
      id: Date.now(),
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
    
    setRipples(prev => [...prev, newRipple]);
    setTimeout(() => {
      setRipples(prev => prev.filter(r => r.id !== newRipple.id));
    }, 600);
  };

  return (
    <div 
      className={cn("relative overflow-hidden cursor-pointer", className)}
      onClick={handleClick}
    >
      {children}
      <AnimatePresence>
        {ripples.map(ripple => (
          <motion.div
            key={ripple.id}
            className="absolute rounded-full bg-primary/20 pointer-events-none"
            style={{
              left: ripple.x,
              top: ripple.y,
            }}
            initial={{ width: 0, height: 0, x: "-50%", y: "-50%" }}
            animate={{ 
              width: 200, 
              height: 200,
              opacity: [0.7, 0],
              transition: { duration: 0.6, ease: "easeOut" }
            }}
            exit={{ opacity: 0 }}
          />
        ))}
      </AnimatePresence>
    </div>
  );
};

export const ScaleClick: React.FC<{ children: ReactNode; className?: string }> = ({ 
  children, 
  className 
}) => (
  <motion.div
    className={cn("cursor-pointer", className)}
    whileTap={{ 
      scale: 0.95,
      transition: { duration: 0.1 }
    }}
  >
    {children}
  </motion.div>
);

export const ColorFlash: React.FC<{ 
  children: ReactNode; 
  className?: string;
  flashColor?: string;
}> = ({ 
  children, 
  className,
  flashColor = "hsl(var(--primary))"
}) => {
  const [isFlashing, setIsFlashing] = useState(false);

  const handleClick = () => {
    setIsFlashing(true);
    setTimeout(() => setIsFlashing(false), 200);
  };

  return (
    <motion.div
      className={cn("cursor-pointer transition-colors duration-200", className)}
      onClick={handleClick}
      animate={{
        backgroundColor: isFlashing ? flashColor : "transparent",
      }}
    >
      {children}
    </motion.div>
  );
};

// Success States
export const CheckmarkDraw: React.FC<{ isVisible: boolean; className?: string }> = ({ 
  isVisible, 
  className 
}) => (
  <motion.svg
    className={cn("w-6 h-6", className)}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
  >
    <motion.path
      d="M20 6L9 17l-5-5"
      initial={{ pathLength: 0 }}
      animate={{ pathLength: isVisible ? 1 : 0 }}
      transition={{ duration: 0.6, ease: "easeInOut" }}
    />
  </motion.svg>
);

export const ProgressCompletion: React.FC<{ 
  progress: number; 
  className?: string;
}> = ({ 
  progress, 
  className 
}) => (
  <div className={cn("w-full bg-muted rounded-full h-2", className)}>
    <motion.div
      className="h-full bg-primary rounded-full"
      initial={{ width: 0 }}
      animate={{ width: `${progress}%` }}
      transition={{ duration: 0.5, ease: "easeOut" }}
    />
  </div>
);

export const PointAddition: React.FC<{ 
  points: number; 
  isAnimating: boolean;
  className?: string;
}> = ({ 
  points, 
  isAnimating,
  className 
}) => (
  <div className={cn("relative", className)}>
    <motion.span
      animate={{
        scale: isAnimating ? [1, 1.2, 1] : 1,
        color: isAnimating ? ["currentColor", "hsl(var(--primary))", "currentColor"] : "currentColor",
      }}
      transition={{ duration: 0.5 }}
    >
      {points}
    </motion.span>
    <AnimatePresence>
      {isAnimating && (
        <motion.span
          className="absolute -top-6 left-1/2 text-primary font-bold pointer-events-none"
          initial={{ opacity: 0, y: 0, x: "-50%" }}
          animate={{ opacity: 1, y: -10 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.8 }}
        >
          +{Math.floor(Math.random() * 100) + 10}
        </motion.span>
      )}
    </AnimatePresence>
  </div>
);

// Loading States
export const SpinnerVariation: React.FC<{ 
  variant?: "dots" | "pulse" | "bounce";
  className?: string;
}> = ({ 
  variant = "dots", 
  className 
}) => {
  if (variant === "dots") {
    return (
      <div className={cn("flex space-x-1", className)}>
        {[0, 1, 2].map(i => (
          <motion.div
            key={i}
            className="w-2 h-2 bg-primary rounded-full"
            animate={{
              scale: [1, 1.5, 1],
              opacity: [0.5, 1, 0.5],
            }}
            transition={{
              duration: 1,
              repeat: Infinity,
              delay: i * 0.2,
            }}
          />
        ))}
      </div>
    );
  }

  if (variant === "pulse") {
    return (
      <motion.div
        className={cn("w-4 h-4 bg-primary rounded-full", className)}
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.7, 1, 0.7],
        }}
        transition={{
          duration: 1,
          repeat: Infinity,
        }}
      />
    );
  }

  return (
    <div className={cn("flex space-x-1", className)}>
      {[0, 1, 2].map(i => (
        <motion.div
          key={i}
          className="w-2 h-2 bg-primary rounded-full"
          animate={{ y: [0, -10, 0] }}
          transition={{
            duration: 0.6,
            repeat: Infinity,
            delay: i * 0.1,
          }}
        />
      ))}
    </div>
  );
};

// Attention Grabbers
export const GentlePulse: React.FC<{ children: ReactNode; className?: string }> = ({ 
  children, 
  className 
}) => (
  <motion.div
    className={cn("", className)}
    animate={{
      scale: [1, 1.02, 1],
    }}
    transition={{
      duration: 2,
      repeat: Infinity,
      ease: "easeInOut",
    }}
  >
    {children}
  </motion.div>
);

export const ShakeAttention: React.FC<{ 
  children: ReactNode; 
  isShaking: boolean;
  className?: string;
}> = ({ 
  children, 
  isShaking,
  className 
}) => (
  <motion.div
    className={cn("", className)}
    animate={isShaking ? {
      x: [0, -2, 2, -2, 2, 0],
    } : {}}
    transition={{
      duration: 0.5,
      ease: "easeInOut",
    }}
  >
    {children}
  </motion.div>
);

export const GlowEffect: React.FC<{ 
  children: ReactNode; 
  isGlowing: boolean;
  className?: string;
}> = ({ 
  children, 
  isGlowing,
  className 
}) => (
  <motion.div
    className={cn("transition-all duration-500", className)}
    animate={{
      boxShadow: isGlowing 
        ? "0 0 20px hsl(var(--primary) / 0.5)" 
        : "0 0 0px hsl(var(--primary) / 0)",
    }}
  >
    {children}
  </motion.div>
);

// Transitions
export const FadeVariations: React.FC<{ 
  children: ReactNode;
  variant?: "up" | "down" | "left" | "right" | "scale";
  isVisible: boolean;
  className?: string;
}> = ({ 
  children, 
  variant = "up",
  isVisible,
  className 
}) => {
  const variants = {
    up: { opacity: [0, 1], y: [20, 0] },
    down: { opacity: [0, 1], y: [-20, 0] },
    left: { opacity: [0, 1], x: [20, 0] },
    right: { opacity: [0, 1], x: [-20, 0] },
    scale: { opacity: [0, 1], scale: [0.8, 1] },
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          className={className}
          initial={{ opacity: 0, ...Object.fromEntries(
            Object.entries(variants[variant]).slice(1).map(([key, [start]]) => [key, start])
          )}}
          animate={variants[variant]}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
};