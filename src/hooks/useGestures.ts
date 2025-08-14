import { useState, useEffect, useRef, useCallback } from "react";

export interface GestureState {
  isSwipeLeft: boolean;
  isSwipeRight: boolean;
  isSwipeUp: boolean;
  isSwipeDown: boolean;
  isPinching: boolean;
  isLongPress: boolean;
  isDoubleTap: boolean;
  touchCount: number;
  scale: number;
  lastTap: number;
}

export interface UseGesturesOptions {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  onPinch?: (scale: number) => void;
  onLongPress?: () => void;
  onDoubleTap?: () => void;
  swipeThreshold?: number;
  longPressThreshold?: number;
  doubleTapThreshold?: number;
}

export const useGestures = (
  elementRef: React.RefObject<HTMLElement>,
  options: UseGesturesOptions = {}
) => {
  const {
    onSwipeLeft,
    onSwipeRight,
    onSwipeUp,
    onSwipeDown,
    onPinch,
    onLongPress,
    onDoubleTap,
    swipeThreshold = 50,
    longPressThreshold = 500,
    doubleTapThreshold = 300,
  } = options;

  const [gestureState, setGestureState] = useState<GestureState>({
    isSwipeLeft: false,
    isSwipeRight: false,
    isSwipeUp: false,
    isSwipeDown: false,
    isPinching: false,
    isLongPress: false,
    isDoubleTap: false,
    touchCount: 0,
    scale: 1,
    lastTap: 0,
  });

  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const initialDistanceRef = useRef<number>(0);

  const resetGestureState = useCallback(() => {
    setGestureState(prev => ({
      ...prev,
      isSwipeLeft: false,
      isSwipeRight: false,
      isSwipeUp: false,
      isSwipeDown: false,
      isPinching: false,
      isLongPress: false,
      isDoubleTap: false,
    }));
  }, []);

  const getTouchDistance = (touch1: Touch, touch2: Touch) => {
    const dx = touch1.clientX - touch2.clientX;
    const dy = touch1.clientY - touch2.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const handleTouchStart = useCallback((e: TouchEvent) => {
    const touch = e.touches[0];
    const now = Date.now();
    
    setGestureState(prev => ({ 
      ...prev, 
      touchCount: e.touches.length,
      lastTap: now,
    }));

    if (e.touches.length === 1) {
      touchStartRef.current = {
        x: touch.clientX,
        y: touch.clientY,
        time: now,
      };

      // Start long press timer
      longPressTimerRef.current = setTimeout(() => {
        setGestureState(prev => ({ ...prev, isLongPress: true }));
        onLongPress?.();
      }, longPressThreshold);

      // Check for double tap
      if (gestureState.lastTap && now - gestureState.lastTap < doubleTapThreshold) {
        setGestureState(prev => ({ ...prev, isDoubleTap: true }));
        onDoubleTap?.();
      }
    } else if (e.touches.length === 2) {
      // Pinch gesture start
      initialDistanceRef.current = getTouchDistance(e.touches[0], e.touches[1]);
      setGestureState(prev => ({ ...prev, isPinching: true }));
    }
  }, [gestureState.lastTap, doubleTapThreshold, longPressThreshold, onLongPress, onDoubleTap]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }

    if (e.touches.length === 2 && gestureState.isPinching) {
      // Handle pinch gesture
      const currentDistance = getTouchDistance(e.touches[0], e.touches[1]);
      const scale = currentDistance / initialDistanceRef.current;
      
      setGestureState(prev => ({ ...prev, scale }));
      onPinch?.(scale);
    }
  }, [gestureState.isPinching, onPinch]);

  const handleTouchEnd = useCallback((e: TouchEvent) => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }

    const touch = e.changedTouches[0];
    
    if (touchStartRef.current && e.touches.length === 0) {
      const deltaX = touch.clientX - touchStartRef.current.x;
      const deltaY = touch.clientY - touchStartRef.current.y;
      const deltaTime = Date.now() - touchStartRef.current.time;

      // Only consider quick swipes (not slow drags)
      if (deltaTime < 300) {
        // Horizontal swipes
        if (Math.abs(deltaX) > swipeThreshold && Math.abs(deltaX) > Math.abs(deltaY)) {
          if (deltaX > 0) {
            setGestureState(prev => ({ ...prev, isSwipeRight: true }));
            onSwipeRight?.();
          } else {
            setGestureState(prev => ({ ...prev, isSwipeLeft: true }));
            onSwipeLeft?.();
          }
        }
        
        // Vertical swipes
        else if (Math.abs(deltaY) > swipeThreshold && Math.abs(deltaY) > Math.abs(deltaX)) {
          if (deltaY > 0) {
            setGestureState(prev => ({ ...prev, isSwipeDown: true }));
            onSwipeDown?.();
          } else {
            setGestureState(prev => ({ ...prev, isSwipeUp: true }));
            onSwipeUp?.();
          }
        }
      }

      touchStartRef.current = null;
    }

    setGestureState(prev => ({ 
      ...prev, 
      touchCount: e.touches.length,
      isPinching: e.touches.length >= 2,
    }));

    // Reset gesture states after a delay
    setTimeout(resetGestureState, 100);
  }, [swipeThreshold, onSwipeLeft, onSwipeRight, onSwipeUp, onSwipeDown, resetGestureState]);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    element.addEventListener('touchstart', handleTouchStart, { passive: true });
    element.addEventListener('touchmove', handleTouchMove, { passive: true });
    element.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      element.removeEventListener('touchstart', handleTouchStart);
      element.removeEventListener('touchmove', handleTouchMove);
      element.removeEventListener('touchend', handleTouchEnd);
      
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
      }
    };
  }, [elementRef, handleTouchStart, handleTouchMove, handleTouchEnd]);

  return gestureState;
};