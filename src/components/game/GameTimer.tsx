import { useState, useEffect, useMemo } from "react";
import { Progress } from "../ui/progress";
import { Card } from "../ui/card";

interface GameTimerProps {
  endTime?: number;
  totalDuration: number;
  onTimeUp?: () => void;
  showProgress?: boolean;
  variant?: "default" | "warning" | "danger";
}

// Optimized timer without heavy animations initially
export function GameTimer({ 
  endTime, 
  totalDuration, 
  onTimeUp, 
  showProgress = true,
  variant = "default" 
}: GameTimerProps) {
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);
  
  // Calculate time remaining efficiently
  const { seconds, percentage, shouldWarn } = useMemo(() => {
    if (!endTime || !mounted) return { seconds: 0, percentage: 0, shouldWarn: false };
    
    const now = Date.now();
    const remaining = Math.max(0, Math.floor((endTime - now) / 1000));
    const pct = Math.max(0, (remaining / (totalDuration / 1000)) * 100);
    
    return {
      seconds: remaining,
      percentage: pct,
      shouldWarn: remaining < 10
    };
  }, [endTime, totalDuration, timeRemaining, mounted]);
  
  useEffect(() => {
    if (!endTime || !mounted) return;
    
    const interval = setInterval(() => {
      const now = Date.now();
      const remaining = Math.max(0, endTime - now);
      
      setTimeRemaining(remaining);
      
      if (remaining <= 0) {
        clearInterval(interval);
        onTimeUp?.();
      }
    }, 100);
    
    return () => clearInterval(interval);
  }, [endTime, onTimeUp, mounted]);
  
  const displayVariant = shouldWarn ? "danger" : variant;
  
  return (
    <Card className={`p-4 ${displayVariant === "danger" ? "border-red-500" : ""}`}>
      <div className="text-center space-y-2">
        <div className={`text-2xl font-mono font-bold ${
          displayVariant === "danger" ? "text-red-500" : "text-primary"
        }`}>
          {Math.floor(seconds / 60)}:{(seconds % 60).toString().padStart(2, "0")}
        </div>
        
        {showProgress && (
          <Progress 
            value={percentage} 
            className={`h-2 ${displayVariant === "danger" ? "bg-red-100" : ""}`}
          />
        )}
      </div>
    </Card>
  );
}

// Lazy load enhanced timer with animations when needed
export async function createEnhancedGameTimer() {
  const [{ motion }, { GameTimer: BaseTimer }] = await Promise.all([
    import("framer-motion"),
    import("./GameTimer")
  ]);
  
  return function EnhancedGameTimer(props: GameTimerProps) {
    return (
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.2 }}
      >
        <BaseTimer {...props} />
      </motion.div>
    );
  };
}