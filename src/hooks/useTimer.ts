import { useState, useEffect, useRef, useCallback } from "react";

export interface UseTimerOptions {
  initialTime: number;
  onComplete?: () => void;
  onTick?: (time: number) => void;
  enableOvertime?: boolean;
  testMode?: boolean;
  testSpeed?: number;
}

export interface UseTimerReturn {
  time: number;
  isRunning: boolean;
  isPaused: boolean;
  isOvertime: boolean;
  start: () => void;
  pause: () => void;
  resume: () => void;
  stop: () => void;
  reset: (newTime?: number) => void;
  extend: (seconds: number) => void;
  setTestSpeed: (speed: number) => void;
}

export const useTimer = ({
  initialTime,
  onComplete,
  onTick,
  enableOvertime = false,
  testMode = false,
  testSpeed: initialTestSpeed = 1,
}: UseTimerOptions): UseTimerReturn => {
  const [time, setTime] = useState(initialTime);
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isOvertime, setIsOvertime] = useState(false);
  const [testSpeed, setTestSpeed] = useState(initialTestSpeed);
  
  const intervalRef = useRef<NodeJS.Timeout>();
  const lastTickRef = useRef<number>();

  const tick = useCallback(() => {
    const now = Date.now();
    const actualSpeed = testMode ? testSpeed : 1;
    
    if (lastTickRef.current) {
      const deltaMs = now - lastTickRef.current;
      const deltaSeconds = (deltaMs / 1000) * actualSpeed;
      
      setTime(prevTime => {
        const newTime = prevTime - deltaSeconds;
        
        if (newTime <= 0 && !isOvertime) {
          if (enableOvertime) {
            setIsOvertime(true);
            onTick?.(newTime);
            return newTime;
          } else {
            setIsRunning(false);
            onComplete?.();
            onTick?.(0);
            return 0;
          }
        }
        
        onTick?.(newTime);
        return newTime;
      });
    }
    
    lastTickRef.current = now;
  }, [onComplete, onTick, enableOvertime, isOvertime, testMode, testSpeed]);

  useEffect(() => {
    if (isRunning && !isPaused) {
      lastTickRef.current = Date.now();
      intervalRef.current = setInterval(tick, testMode ? 100 : 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRunning, isPaused, tick, testMode]);

  const start = useCallback(() => {
    setIsRunning(true);
    setIsPaused(false);
    lastTickRef.current = Date.now();
  }, []);

  const pause = useCallback(() => {
    setIsPaused(true);
  }, []);

  const resume = useCallback(() => {
    setIsPaused(false);
    lastTickRef.current = Date.now();
  }, []);

  const stop = useCallback(() => {
    setIsRunning(false);
    setIsPaused(false);
    setIsOvertime(false);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
  }, []);

  const reset = useCallback((newTime?: number) => {
    const timeToSet = newTime ?? initialTime;
    setTime(timeToSet);
    setIsRunning(false);
    setIsPaused(false);
    setIsOvertime(false);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
  }, [initialTime]);

  const extend = useCallback((seconds: number) => {
    setTime(prevTime => prevTime + seconds);
  }, []);

  return {
    time,
    isRunning,
    isPaused,
    isOvertime,
    start,
    pause,
    resume,
    stop,
    reset,
    extend,
    setTestSpeed,
  };
};