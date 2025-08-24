import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/8bit/card";
import { CheckCircle, Clock, Users } from "lucide-react";
import { GameTimer } from "@/components/game/GameTimer";
import { Id } from "../../../convex/_generated/dataModel";

interface Player {
  _id: Id<"players">;
  displayName: string;
  score: number;
  hasSubmitted?: boolean;
  hasVoted?: boolean;
}

interface Props {
  players: Player[];
  currentPhase: string;
  timeRemaining: number;
}

const PlayerSidebar: React.FC<Props> = ({ players, currentPhase, timeRemaining }) => {
  const getPhaseDescription = (phase: string) => {
    switch (phase) {
      case "prompt":
      case "prompting":
        return "Submitting prompts";
      case "generating":
        return "Generating images";
      case "voting":
        return "Voting on images";
      case "results":
        return "Viewing results";
      default:
        return "Game in progress";
    }
  };

  const getPlayerStatus = (player: Player) => {
    switch (currentPhase) {
      case "prompt":
      case "prompting":
        return player.hasSubmitted ? (
          <CheckCircle className="h-4 w-4 text-success" />
        ) : (
          <Clock className="h-4 w-4 text-muted-foreground" />
        );
      case "voting":
        return player.hasVoted ? (
          <CheckCircle className="h-4 w-4 text-success" />
        ) : (
          <Clock className="h-4 w-4 text-muted-foreground" />
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-4">
      {/* Timer Card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Clock className="h-4 w-4" />
            Time Remaining
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center">
            <div className={`text-2xl font-mono font-bold ${
              timeRemaining <= 10 ? "text-destructive animate-pulse" : "text-primary"
            }`}>
              {Math.floor(timeRemaining / 60)}:{(timeRemaining % 60).toString().padStart(2, "0")}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {getPhaseDescription(currentPhase)}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Players Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Players ({players.length})
          </CardTitle>
          <CardDescription>
            Scores and status
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="space-y-3">
            {players
              .sort((a, b) => b.score - a.score) // Sort by score descending
              .map((player, index) => (
                <li key={player._id} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-7 w-7 rounded-full bg-primary/15 border border-foreground flex items-center justify-center text-xs font-medium">
                      {player.displayName.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm font-medium">{player.displayName}</span>
                      {index === 0 && players.length > 1 && (
                        <span className="text-xs text-primary">Leading</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {getPlayerStatus(player)}
                    <span className="text-sm font-bold">{player.score}</span>
                  </div>
                </li>
              ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
};

export default PlayerSidebar;
