import React from "react";
import { Card } from "@/components/ui/card";
import { LoadingSpinner } from "@/components/ui/loading";

interface WaitingPhaseProps {
  roomId: string;
  gameState?: unknown;
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