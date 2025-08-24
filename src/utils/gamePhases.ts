import React, { lazy, ComponentType } from "react";
import { LoadingSpinner } from "../components/ui/loading";

// Type for game phase props
interface GamePhaseProps {
  roomId: string;
  gameState: {
    room: {
      status: string;
      currentRound?: number;
      totalRounds: number;
    };
    round?: {
      _id: string;
      status: string;
      phaseEndTime?: number;
      question: string;
    };
    players: Array<{
      _id: string;
      displayName: string;
      score: number;
      hasSubmitted: boolean;
      hasVoted: boolean;
    }>;
    images: Array<{
      _id: string;
      promptId: string;
      imageUrl: string;
      promptText: string;
      voteCount: number;
      isWinner: boolean;
      isOwn: boolean;
    }>;
    myPrompt?: string;
    myVote?: string;
  };
  timeRemaining: number;
  handleSubmitPrompt?: (prompt: string) => Promise<void>;
  handleSubmitVote?: (imageId: string) => Promise<void>;
  onPhaseComplete?: () => void;
}

// Enhanced lazy loading for game phases
function createGamePhase<T extends ComponentType<GamePhaseProps>>(
  importFunction: () => Promise<{ default: T }>,
  phaseName: string
) {
  const LazyPhase = lazy(importFunction);
  
  return (props: GamePhaseProps) => (
    React.createElement(
      React.Suspense,
      {
        fallback: React.createElement(
          'div',
          { className: "flex flex-col items-center justify-center min-h-[400px]" },
          React.createElement(LoadingSpinner, { size: "lg" }),
          React.createElement(
            'p',
            { className: "mt-4 text-sm text-muted-foreground" },
            `Loading ${phaseName}...`
          )
        )
      },
      React.createElement(LazyPhase, props)
    )
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