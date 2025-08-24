import React, { lazy, ComponentType } from "react";
import { LoadingSpinner } from "../components/ui/loading";

// Type for game phase props
interface GamePhaseProps {
  roomId: string;
  gameState: any;
  onPhaseComplete?: () => void;
}

// Enhanced lazy loading for game phases
function createGamePhase<T extends ComponentType<GamePhaseProps>>(
  importFunction: () => Promise<{ default: T }>,
  phaseName: string
) {
  const LazyPhase = lazy(importFunction);
  
  return (props: GamePhaseProps) => (
    <React.Suspense 
      fallback={
        <div className="flex flex-col items-center justify-center min-h-[400px]">
          <LoadingSpinner size="lg" />
          <p className="mt-4 text-sm text-muted-foreground">
            Loading {phaseName}...
          </p>
        </div>
      }
    >
      <LazyPhase {...props} />
    </React.Suspense>
  );
}

// Lazy load all game phases
export const PromptPhase = createGamePhase(
  () => import("../features/game/phases/PromptPhase"),
  "Prompt Phase"
);

export const GeneratingPhase = createGamePhase(
  () => import("../features/game/phases/GeneratingPhase"),
  "Generating Images"
);

export const VotingPhase = createGamePhase(
  () => import("../features/game/phases/VotingPhase"),
  "Voting Phase"
);

export const ResultsPhase = createGamePhase(
  () => import("../features/game/phases/ResultsPhase"),
  "Results Phase"
);

export const WaitingPhase = createGamePhase(
  () => import("../features/game/phases/WaitingPhase"),
  "Waiting for Players"
);