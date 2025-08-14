import React from "react";
import { Button } from "@/components/ui/8bit/button";
import { Crown, LogOut } from "lucide-react";

interface Props {
  roomCode: string;
  currentRound: number;
  totalRounds: number;
  onLeave: () => void;
}

const GameTopBar: React.FC<Props> = ({ roomCode, currentRound, totalRounds, onLeave }) => {
  return (
    <div className="container mx-auto px-4 py-3 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <span className="text-sm md:text-base text-muted-foreground">Room</span>
        <span className="text-base md:text-xl font-semibold tracking-wide">{roomCode}</span>
      </div>
      <div className="flex items-center gap-4">
        <div className="hidden sm:flex items-center gap-2 text-sm">
          <Crown className="h-4 w-4" />
          <span>
            Round {currentRound} of {totalRounds}
          </span>
        </div>
        <Button variant="outline" size="sm" onClick={onLeave} className="gap-2">
          <LogOut className="h-4 w-4" /> Leave
        </Button>
      </div>
    </div>
  );
};

export default GameTopBar;
