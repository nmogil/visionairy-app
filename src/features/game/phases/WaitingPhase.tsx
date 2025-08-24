import React from "react";
import { Card } from "@/components/ui/card";
import { LoadingSpinner } from "@/components/ui/loading";

interface WaitingPhaseProps {
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

const WaitingPhase: React.FC<WaitingPhaseProps> = ({
  roomId,
  gameState,
  onPhaseComplete,
}) => {
  return (
    <Card className="p-8 text-center space-y-6">
      <LoadingSpinner size="lg" className="mx-auto" />
      <div className="space-y-2">
        <h2 className="text-xl font-display">Waiting for players...</h2>
        <p className="text-muted-foreground">
          The game will start once all players are ready
        </p>
      </div>
    </Card>
  );
};

export default WaitingPhase;