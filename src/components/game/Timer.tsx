import React, { useState, useEffect, useRef } from "react";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Pause, Play, Plus, Volume2, VolumeX } from "lucide-react";
import { cn } from "@/lib/utils";

export type TimerDisplayMode = "circular" | "linear" | "digital" | "analog";

interface TimerProps {
  time: number;
  totalTime: number;
  displayMode?: TimerDisplayMode;
  isHost?: boolean;
  onPause?: () => void;
  onResume?: () => void;
  onExtend?: (seconds: number) => void;
  isPaused?: boolean;
  showControls?: boolean;
  size?: "sm" | "md" | "lg";
  enableSound?: boolean;
  onSoundToggle?: (enabled: boolean) => void;
  className?: string;
  isOvertime?: boolean;
  testMode?: boolean;
}

const Timer: React.FC<TimerProps> = ({
  time,
  totalTime,
  displayMode = "digital",
  isHost = false,
  onPause,
  onResume,
  onExtend,
  isPaused = false,
  showControls = false,
  size = "md",
  enableSound = true,
  onSoundToggle,
  className,
  isOvertime = false,
  testMode = false,
}) => {
  const [showMilestone, setShowMilestone] = useState<string | null>(null);
  const [hasCompleted, setHasCompleted] = useState(false);
  const [testSpeed, setTestSpeed] = useState(1);
  const lastTimeRef = useRef(time);

  // Calculate progress percentage
  const progress = isOvertime ? 100 : Math.max(0, ((totalTime - time) / totalTime) * 100);
  
  // Determine urgency state
  const isUrgent = time <= 10 && time > 5;
  const isCritical = time <= 5 && time > 0;
  
  // Color based on remaining time
  const getTimerColor = () => {
    if (isOvertime) return "hsl(var(--destructive))";
    if (isCritical) return "hsl(var(--destructive))";
    if (isUrgent) return "hsl(var(--accent))";
    return "hsl(var(--primary))";
  };

  // Milestone effects
  useEffect(() => {
    if (time !== lastTimeRef.current) {
      const milestones = [30, 15, 10, 5];
      const milestone = milestones.find(m => time === m);
      
      if (milestone) {
        const messages = {
          30: "30 seconds!",
          15: "15 seconds left!",
          10: "10 seconds!",
          5: "Hurry up!"
        };
        setShowMilestone(messages[milestone as keyof typeof messages]);
        setTimeout(() => setShowMilestone(null), 2000);
      }
      
      if (time === 0 && !hasCompleted) {
        setHasCompleted(true);
        // Trigger confetti effect
        setTimeout(() => setHasCompleted(false), 3000);
      }
      
      lastTimeRef.current = time;
    }
  }, [time, hasCompleted]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(Math.abs(seconds) / 60);
    const secs = Math.abs(seconds) % 60;
    const sign = seconds < 0 ? "-" : "";
    return `${sign}${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const CircularTimer = () => {
    const radius = size === "lg" ? 60 : size === "md" ? 45 : 30;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (progress / 100) * circumference;
    
    return (
      <div className="relative flex items-center justify-center">
        <svg
          width={radius * 2 + 20}
          height={radius * 2 + 20}
          className="transform -rotate-90"
        >
          {/* Background circle */}
          <circle
            cx={radius + 10}
            cy={radius + 10}
            r={radius}
            stroke="hsl(var(--muted))"
            strokeWidth="4"
            fill="none"
          />
          {/* Progress circle */}
          <circle
            cx={radius + 10}
            cy={radius + 10}
            r={radius}
            stroke={getTimerColor()}
            strokeWidth="4"
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            className="transition-all duration-300"
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={cn(
            "font-mono font-bold",
            size === "lg" ? "text-2xl" : size === "md" ? "text-lg" : "text-sm",
            isOvertime && "text-destructive"
          )}>
            {isOvertime ? formatTime(time) : time}
          </span>
        </div>
      </div>
    );
  };

  const AnalogClock = () => {
    const radius = size === "lg" ? 60 : size === "md" ? 45 : 30;
    const angle = isOvertime ? 0 : ((totalTime - time) / totalTime) * 360;
    
    return (
      <div className="relative flex items-center justify-center">
        <svg
          width={radius * 2 + 20}
          height={radius * 2 + 20}
          className="border-2 border-border rounded-full"
        >
          {/* Clock face */}
          <circle
            cx={radius + 10}
            cy={radius + 10}
            r={radius}
            fill="hsl(var(--card))"
            stroke="hsl(var(--border))"
            strokeWidth="2"
          />
          {/* Hour markers */}
          {[...Array(12)].map((_, i) => {
            const markerAngle = (i * 30) * (Math.PI / 180);
            const x1 = radius + 10 + (radius - 8) * Math.cos(markerAngle);
            const y1 = radius + 10 + (radius - 8) * Math.sin(markerAngle);
            const x2 = radius + 10 + (radius - 4) * Math.cos(markerAngle);
            const y2 = radius + 10 + (radius - 4) * Math.sin(markerAngle);
            
            return (
              <line
                key={i}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke="hsl(var(--muted-foreground))"
                strokeWidth="1"
              />
            );
          })}
          {/* Progress hand */}
          <line
            x1={radius + 10}
            y1={radius + 10}
            x2={radius + 10 + (radius - 15) * Math.cos((angle - 90) * (Math.PI / 180))}
            y2={radius + 10 + (radius - 15) * Math.sin((angle - 90) * (Math.PI / 180))}
            stroke={getTimerColor()}
            strokeWidth="3"
            strokeLinecap="round"
            className="transition-all duration-300"
          />
          {/* Center dot */}
          <circle
            cx={radius + 10}
            cy={radius + 10}
            r="3"
            fill={getTimerColor()}
          />
        </svg>
        <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-6">
          <span className={cn(
            "font-mono text-xs",
            isOvertime && "text-destructive"
          )}>
            {isOvertime ? formatTime(time) : `${time}s`}
          </span>
        </div>
      </div>
    );
  };

  const renderTimer = () => {
    const baseClasses = cn(
      "transition-all duration-300",
      isUrgent && "animate-pulse",
      isCritical && "animate-bounce",
      isOvertime && "animate-pulse",
      hasCompleted && "animate-ping",
      className
    );

    switch (displayMode) {
      case "circular":
        return (
          <div className={baseClasses}>
            <CircularTimer />
          </div>
        );
      
      case "linear":
        return (
          <div className={cn("space-y-2", baseClasses)}>
            <Progress 
              value={progress} 
              className={cn(
                "h-3 transition-all duration-300",
                size === "lg" && "h-6",
                size === "sm" && "h-2"
              )}
              style={{
                backgroundColor: "hsl(var(--muted))",
              }}
            />
            <div className="flex justify-between items-center">
              <span className={cn(
                "font-mono text-sm",
                isOvertime && "text-destructive"
              )}>
                {isOvertime ? formatTime(time) : `${time}s`}
              </span>
              <span className="text-xs text-muted-foreground">
                {isOvertime ? "OVERTIME" : `${totalTime}s`}
              </span>
            </div>
          </div>
        );
      
      case "analog":
        return (
          <div className={baseClasses}>
            <AnalogClock />
          </div>
        );
      
      default: // digital
        return (
          <div className={cn(
            "flex items-center justify-center",
            baseClasses
          )}>
            <span 
              className={cn(
                "font-mono font-bold tabular-nums",
                size === "lg" ? "text-4xl" : size === "md" ? "text-2xl" : "text-lg",
                isOvertime && "text-destructive",
                "transition-colors duration-300"
              )}
              style={{ color: getTimerColor() }}
            >
              {isOvertime ? formatTime(time) : time}
              {!isOvertime && <span className="text-muted-foreground text-sm ml-1">s</span>}
            </span>
          </div>
        );
    }
  };

  return (
    <div className="relative">
      {/* Main timer display */}
      {renderTimer()}
      
      {/* Milestone callout */}
      {showMilestone && (
        <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-accent text-accent-foreground px-3 py-1 rounded-md text-xs font-bold animate-bounce">
          {showMilestone}
        </div>
      )}
      
      {/* Confetti effect */}
      {hasCompleted && (
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute inset-0 bg-gradient-to-r from-accent via-primary to-destructive opacity-20 animate-pulse rounded-full"></div>
        </div>
      )}
      
      {/* Host controls */}
      {showControls && isHost && (
        <div className="flex items-center justify-center gap-2 mt-3">
          <Button
            size="sm"
            variant="outline"
            onClick={isPaused ? onResume : onPause}
            className="h-8 w-8 p-0"
          >
            {isPaused ? <Play className="h-3 w-3" /> : <Pause className="h-3 w-3" />}
          </Button>
          
          <Button
            size="sm"
            variant="outline"
            onClick={() => onExtend?.(30)}
            className="h-8 px-2 text-xs"
          >
            <Plus className="h-3 w-3 mr-1" />
            30s
          </Button>
          
          {onSoundToggle && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => onSoundToggle(!enableSound)}
              className="h-8 w-8 p-0"
            >
              {enableSound ? <Volume2 className="h-3 w-3" /> : <VolumeX className="h-3 w-3" />}
            </Button>
          )}
        </div>
      )}
      
      {/* Test mode controls */}
      {testMode && (
        <div className="flex items-center justify-center gap-2 mt-3">
          <span className="text-xs text-muted-foreground">Speed:</span>
          {[0.5, 1, 2, 5].map(speed => (
            <Button
              key={speed}
              size="sm"
              variant={testSpeed === speed ? "default" : "outline"}
              onClick={() => setTestSpeed(speed)}
              className="h-6 px-2 text-xs"
            >
              {speed}x
            </Button>
          ))}
        </div>
      )}
    </div>
  );
};

export default Timer;