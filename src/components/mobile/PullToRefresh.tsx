import React, { useState, useRef } from "react";
import { motion, PanInfo } from "framer-motion";
import { RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

interface PullToRefreshProps {
  onRefresh: () => void;
  isRefreshing: boolean;
  children: React.ReactNode;
  threshold?: number;
  className?: string;
}

const PullToRefresh: React.FC<PullToRefreshProps> = ({
  onRefresh,
  isRefreshing,
  children,
  threshold = 80,
  className,
}) => {
  const [pullDistance, setPullDistance] = useState(0);
  const [isPulling, setIsPulling] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleDragStart = () => {
    if (window.scrollY === 0) {
      setIsPulling(true);
    }
  };

  const handleDrag = (event: any, info: PanInfo) => {
    if (!isPulling) return;

    const distance = Math.max(0, info.offset.y);
    const maxDistance = threshold * 1.5;
    const constrainedDistance = Math.min(distance, maxDistance);
    
    setPullDistance(constrainedDistance);
  };

  const handleDragEnd = (event: any, info: PanInfo) => {
    if (!isPulling) return;

    setIsPulling(false);
    
    if (pullDistance >= threshold && !isRefreshing) {
      onRefresh();
    }
    
    setPullDistance(0);
  };

  const pullProgress = Math.min(pullDistance / threshold, 1);
  const shouldTrigger = pullProgress >= 1;

  return (
    <motion.div
      ref={containerRef}
      className={cn("relative overflow-hidden", className)}
      drag="y"
      dragConstraints={{ top: 0, bottom: 0 }}
      dragElastic={0.2}
      onDragStart={handleDragStart}
      onDrag={handleDrag}
      onDragEnd={handleDragEnd}
      animate={{
        y: isRefreshing ? 60 : 0,
      }}
      transition={{ type: "spring", damping: 20, stiffness: 300 }}
    >
      {/* Pull indicator */}
      <motion.div
        className="absolute top-0 left-0 right-0 flex items-center justify-center bg-background/95 backdrop-blur-sm border-b border-border z-10"
        initial={{ y: -60, opacity: 0 }}
        animate={{
          y: isPulling || isRefreshing ? 0 : -60,
          opacity: isPulling || isRefreshing ? 1 : 0,
        }}
        transition={{ duration: 0.2 }}
        style={{ height: 60 }}
      >
        <div className="flex items-center space-x-3">
          <motion.div
            animate={{
              rotate: isRefreshing ? 360 : shouldTrigger ? 180 : 0,
            }}
            transition={{
              rotate: {
                duration: isRefreshing ? 1 : 0.3,
                repeat: isRefreshing ? Infinity : 0,
                ease: "linear",
              },
            }}
          >
            <RefreshCw
              className={cn(
                "h-5 w-5 transition-colors",
                shouldTrigger ? "text-primary" : "text-muted-foreground"
              )}
            />
          </motion.div>
          
          <div className="text-sm">
            {isRefreshing ? (
              <span className="text-primary">Refreshing...</span>
            ) : shouldTrigger ? (
              <span className="text-primary">Release to refresh</span>
            ) : (
              <span className="text-muted-foreground">Pull to refresh</span>
            )}
          </div>
        </div>

        {/* Progress indicator */}
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-muted">
          <motion.div
            className="h-full bg-primary"
            initial={{ width: "0%" }}
            animate={{ width: `${pullProgress * 100}%` }}
            transition={{ duration: 0.1 }}
          />
        </div>
      </motion.div>

      {/* Content */}
      <motion.div
        animate={{
          y: isPulling ? pullDistance * 0.5 : 0,
        }}
        transition={{ type: "spring", damping: 20, stiffness: 300 }}
      >
        {children}
      </motion.div>
    </motion.div>
  );
};

export default PullToRefresh;