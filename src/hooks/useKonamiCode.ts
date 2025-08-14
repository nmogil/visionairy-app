import { useEffect, useState, useCallback } from 'react';

const KONAMI_CODE = [
  'ArrowUp',
  'ArrowUp', 
  'ArrowDown',
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
  'ArrowLeft',
  'ArrowRight',
  'KeyB',
  'KeyA'
];

export const useKonamiCode = (onComplete?: () => void) => {
  const [sequence, setSequence] = useState<string[]>([]);
  const [isActivated, setIsActivated] = useState(false);

  const resetSequence = useCallback(() => {
    setSequence([]);
  }, []);

  const handleKeyPress = useCallback((event: KeyboardEvent) => {
    setSequence(prev => {
      const newSequence = [...prev, event.code];
      
      // Check if current sequence matches the beginning of Konami code
      const isValidSequence = KONAMI_CODE.slice(0, newSequence.length)
        .every((key, index) => key === newSequence[index]);
      
      if (!isValidSequence) {
        return [];
      }
      
      // Check if sequence is complete
      if (newSequence.length === KONAMI_CODE.length) {
        setIsActivated(true);
        onComplete?.();
        return [];
      }
      
      return newSequence;
    });
  }, [onComplete]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [handleKeyPress]);

  return {
    isActivated,
    sequence,
    resetSequence,
    reset: () => setIsActivated(false)
  };
};