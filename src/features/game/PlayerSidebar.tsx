import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/8bit/card";
import { Crown } from "lucide-react";
import { GamePhase } from "./PhaseContainer";

export interface SidebarPlayer {
  id: string;
  name: string;
  score: number;
}

interface Props {
  players: SidebarPlayer[];
  cardCzarId: string;
  timeRemaining: number;
  phase: GamePhase;
}

const PlayerSidebar: React.FC<Props> = ({ players, cardCzarId, timeRemaining, phase }) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          Players
          <span className={`text-xs md:text-sm ${timeRemaining <= 5 ? "pulse" : ""}`}>
            {phase !== "gameOver" ? `${timeRemaining}s left` : ""}
          </span>
        </CardTitle>
        <CardDescription>Scores and current Card Czar</CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="space-y-3">
          {players.map((p) => (
            <li key={p.id} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 rounded-full bg-primary/15 border border-foreground flex items-center justify-center text-xs">
                  {p.name.charAt(0)}
                </div>
                <span className="text-sm">{p.name}</span>
                {p.id === cardCzarId && (
                  <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                    <Crown className="h-3.5 w-3.5" /> Czar
                  </span>
                )}
              </div>
              <span className="text-sm font-medium">{p.score}</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
};

export default PlayerSidebar;
