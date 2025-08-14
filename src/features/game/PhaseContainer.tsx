import React from "react";
import { Button } from "@/components/ui/8bit/button";
import { Input } from "@/components/ui/8bit/input";
import PromptPhase from "./phases/PromptPhase";
import GeneratingPhase from "./phases/GeneratingPhase";
import VotingPhase from "./phases/VotingPhase";
import ResultsPhase from "./phases/ResultsPhase";
import GameOverPhase from "./phases/GameOverPhase";

export type GamePhase = "prompting" | "generating" | "voting" | "results" | "gameOver";

export interface Player { id: string; name: string; score: number }
export interface Submission { playerId: string; prompt: string; imageUrl: string | null }

interface Props {
  phase: GamePhase;
  timeRemaining: number;
  currentQuestion: string;
  players: Player[];
  submissions: Submission[];
  generatedImages: string[];
  selectedWinner: number | null;
  cardCzarId: string;
  currentUserId: string;
  onSubmitPrompt: (prompt: string) => void;
  onVote: (index: number) => void;
}

const PhaseContainer: React.FC<Props> = (props) => {
  const { phase } = props;
  if (phase === "prompting") return <PromptPhase {...props} />;
  if (phase === "generating") return <GeneratingPhase players={props.players} timeRemaining={props.timeRemaining} />;
  if (phase === "voting") return <VotingPhase {...props} />;
  if (phase === "results") return <ResultsPhase 
    currentQuestion={props.currentQuestion}
    generatedImages={props.generatedImages}
    selectedWinner={props.selectedWinner}
    players={props.players}
    submissions={props.submissions}
    timeRemaining={props.timeRemaining}
  />;
  return <GameOverPhase players={props.players} />;
};

export default PhaseContainer;





