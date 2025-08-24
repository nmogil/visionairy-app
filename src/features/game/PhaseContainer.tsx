import React from "react";
import PromptPhase from "./phases/PromptPhase";
import GeneratingPhase from "./phases/GeneratingPhase";
import VotingPhase from "./phases/VotingPhase";
import ResultsPhase from "./phases/ResultsPhase";
import GameOverPhase from "./phases/GameOverPhase";
import { Id } from "../../../convex/_generated/dataModel";

export type GamePhase = "prompt" | "generating" | "voting" | "results" | "finished";

interface Player {
  _id: Id<"players">;
  displayName: string;
  score: number;
  hasSubmitted?: boolean;
  hasVoted?: boolean;
}

interface Image {
  _id: Id<"generatedImages">;
  promptId: Id<"prompts">;
  imageUrl: string;
  promptText: string;
  voteCount: number;
  isWinner?: boolean;
  isOwn?: boolean;
}

interface PhaseContainerProps {
  phase: GamePhase | string;
  timeRemaining: number;
  currentQuestion: string;
  players: Player[];
  images: Image[];
  myPrompt?: string;
  myVote?: Id<"generatedImages">;
  hasSubmittedPrompt: boolean;
  hasVoted: boolean;
  onSubmitPrompt: (prompt: string) => void;
  onVote: (imageId: Id<"generatedImages">) => void;
}

const PhaseContainer: React.FC<PhaseContainerProps> = ({
  phase,
  timeRemaining,
  currentQuestion,
  players,
  images,
  myPrompt,
  myVote,
  hasSubmittedPrompt,
  hasVoted,
  onSubmitPrompt,
  onVote,
}) => {
  switch (phase) {
    case "prompt":
    case "prompting":
      return (
        <PromptPhase
          currentQuestion={currentQuestion}
          timeRemaining={timeRemaining}
          hasSubmitted={hasSubmittedPrompt}
          myPrompt={myPrompt}
          players={players}
          onSubmitPrompt={onSubmitPrompt}
        />
      );
    
    case "generating":
      return (
        <GeneratingPhase
          players={players}
          timeRemaining={timeRemaining}
        />
      );
    
    case "voting":
      return (
        <VotingPhase
          currentQuestion={currentQuestion}
          images={images}
          hasVoted={hasVoted}
          myVote={myVote}
          timeRemaining={timeRemaining}
          onVote={onVote}
        />
      );
    
    case "results":
      return (
        <ResultsPhase
          currentQuestion={currentQuestion}
          images={images}
          players={players}
          timeRemaining={timeRemaining}
        />
      );
    
    case "finished":
      return <GameOverPhase players={players} />;
    
    default:
      return (
        <div className="text-center py-8">
          <p className="text-muted-foreground">Waiting for game to start...</p>
        </div>
      );
  }
};

export default PhaseContainer;





