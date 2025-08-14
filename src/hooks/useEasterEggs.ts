import { useState, useCallback } from 'react';

export const useEasterEggs = () => {
  const [easterEggsFound, setEasterEggsFound] = useState<string[]>([]);
  const [secretMode, setSecretMode] = useState(false);

  const addEasterEgg = useCallback((eggId: string) => {
    setEasterEggsFound(prev => 
      prev.includes(eggId) ? prev : [...prev, eggId]
    );
  }, []);

  const triggerSecretMode = useCallback(() => {
    setSecretMode(true);
    setTimeout(() => setSecretMode(false), 5000);
  }, []);

  const playSecretSound = useCallback(() => {
    // Mock sound effect - in real app would play actual audio
    console.log('🎵 Secret sound effect!');
  }, []);

  const easterEggActions = {
    konami: () => {
      addEasterEgg('konami');
      triggerSecretMode();
      playSecretSound();
    },
    tripleClick: () => {
      addEasterEgg('tripleClick');
      playSecretSound();
    },
    secretSequence: () => {
      addEasterEgg('secretSequence');
      triggerSecretMode();
    }
  };

  return {
    easterEggsFound,
    secretMode,
    addEasterEgg,
    triggerSecretMode,
    playSecretSound,
    easterEggActions
  };
};