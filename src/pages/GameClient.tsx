import React, { useEffect, useMemo, useState } from "react";
import { Helmet } from "react-helmet-async";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/8bit/button";
import { Card } from "@/components/ui/8bit/card";
import GameTopBar from "@/features/game/GameTopBar";
import PlayerSidebar from "@/features/game/PlayerSidebar";
import PhaseContainer, { GamePhase, Submission, Player } from "@/features/game/PhaseContainer";

const mockQuestions = [
  "What would a cat say at a job interview?",
  "The worst superhero power",
  "What aliens think of Earth",
  "The secret life of rubber ducks",
  "Why the chicken REALLY crossed the road",
  "What your phone does while you sleep",
  "The real reason dinosaurs went extinct",
  "What clouds gossip about",
  "A toaster's biggest fear",
  "What fish dream about",
];

const currentUser = { id: "123", name: "Player 1" };

const getPhaseTime = (phase: GamePhase) => {
  switch (phase) {
    case "prompting":
      return 30;
    case "generating":
      return 5;
    case "voting":
      return 20;
    case "results":
      return 5;
    default:
      return 0;
  }
};

const GameClient: React.FC = () => {
  const { roomId = "room123" } = useParams();
  const navigate = useNavigate();

  const [phase, setPhase] = useState<GamePhase>("prompting");
  const [timeRemaining, setTimeRemaining] = useState<number>(getPhaseTime("prompting"));
  const [currentRound, setCurrentRound] = useState<number>(1);
  const [totalRounds] = useState<number>(3); // Demo: 3 rounds
  const [players, setPlayers] = useState<Player[]>([
    { id: "123", name: "Player 1", score: 0 },
    { id: "456", name: "Player 2", score: 1 },
    { id: "789", name: "Player 3", score: 2 },
  ]);
  const [cardCzarIndex, setCardCzarIndex] = useState<number>(1); // Player 2 starts as Czar
  const cardCzar = players[cardCzarIndex];

  const [currentQuestion, setCurrentQuestion] = useState<string>(mockQuestions[0]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [generatedImages, setGeneratedImages] = useState<string[]>([]);
  const [selectedWinner, setSelectedWinner] = useState<number | null>(null);

  // Timer: advance phases automatically
  useEffect(() => {
    if (phase === "gameOver") return;
    setTimeRemaining(getPhaseTime(phase));
    const interval = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          // advance phase
          advancePhase();
          return getPhaseTime(nextPhase(phase));
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  const nextPhase = (p: GamePhase): GamePhase => {
    if (p === "prompting") return "generating";
    if (p === "generating") return "voting";
    if (p === "voting") return "results";
    if (p === "results") return currentRound < totalRounds ? "prompting" : "gameOver";
    return "gameOver";
  };

  const rotateCardCzar = () => {
    setCardCzarIndex((idx) => (idx + 1) % players.length);
  };

  const mockImages = useMemo(
    () => [
      "https://via.placeholder.com/400x400/8B5CF6/FFFFFF?text=Image+1",
      "https://via.placeholder.com/400x400/F97316/FFFFFF?text=Image+2",
      "https://via.placeholder.com/400x400/10B981/FFFFFF?text=Image+3",
      "https://via.placeholder.com/400x400/EF4444/FFFFFF?text=Image+4",
      "https://via.placeholder.com/400x400/3B82F6/FFFFFF?text=Image+5",
    ],
    []
  );

  const advancePhase = () => {
    setPhase((prev) => {
      const nxt = nextPhase(prev);

      if (prev === "prompting") {
        // Prepare generation
        const count = players.length;
        setGeneratedImages(mockImages.slice(0, count));
      }

      if (prev === "generating") {
        // Ready for voting
      }

      if (prev === "voting") {
        // If no vote, pick random
        setSelectedWinner((w) => (w == null ? Math.floor(Math.random() * players.length) : w));
      }

      if (prev === "results") {
        // Award point and move to next round or end
        setSelectedWinner((w) => {
          if (w != null) {
            const winnerPlayer = players[w];
            if (winnerPlayer) {
              setPlayers((ps) =>
                ps.map((p, i) => (i === w ? { ...p, score: p.score + 1 } : p))
              );
            }
          }
          return w;
        });

        if (currentRound < totalRounds) {
          setCurrentRound((r) => r + 1);
          setCurrentQuestion(mockQuestions[Math.min(currentRound, mockQuestions.length - 1)]);
          rotateCardCzar();
          setSubmissions([]);
          setGeneratedImages([]);
          setSelectedWinner(null);
        }
      }

      return nxt;
    });
  };

  const handleSubmitPrompt = (prompt: string) => {
    setSubmissions((subs) => {
      const exists = subs.some((s) => s.playerId === currentUser.id);
      if (exists) return subs;
      return [...subs, { playerId: currentUser.id, prompt, imageUrl: null }];
    });
  };

  const handleVote = (index: number) => {
    if (currentUser.id !== cardCzar.id) return;
    setSelectedWinner(index);
    // Speed up demo: proceed to results shortly
    setTimeout(() => setPhase("results"), 800);
  };

  const handleLeave = () => {
    navigate("/");
  };

  const title = `Play Room ${roomId.toUpperCase()} – Round ${currentRound}/${totalRounds}`;
  const description = `Play round ${currentRound} in room ${roomId}. Submit prompts, generate images, and vote for the winner.`;
  const canonical = `${window.location.origin}/play/${roomId}`;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Helmet>
        <title>{title}</title>
        <meta name="description" content={description} />
        <link rel="canonical" href={canonical} />
      </Helmet>

      <header className="border-b border-border">
        <GameTopBar
          roomCode={roomId.toUpperCase()}
          currentRound={currentRound}
          totalRounds={totalRounds}
          onLeave={handleLeave}
        />
      </header>

      <main className="container mx-auto px-4 py-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        <section className="lg:col-span-8 space-y-4 animate-fade-in">
          <h1 className="sr-only">Game Room {roomId.toUpperCase()}</h1>
          <Card className="p-4">
            <PhaseContainer
              phase={phase}
              timeRemaining={timeRemaining}
              currentQuestion={currentQuestion}
              players={players}
              submissions={submissions}
              generatedImages={generatedImages}
              selectedWinner={selectedWinner}
              cardCzarId={cardCzar.id}
              currentUserId={currentUser.id}
              onSubmitPrompt={handleSubmitPrompt}
              onVote={handleVote}
            />
          </Card>
        </section>

        <aside className="lg:col-span-4">
          <PlayerSidebar
            players={players}
            cardCzarId={cardCzar.id}
            timeRemaining={timeRemaining}
            phase={phase}
          />
        </aside>

        <div className="lg:col-span-12 flex justify-between pt-2">
          <Button variant="outline" onClick={() => navigate(`/room/ABCDEF`)}>Back to Lobby</Button>
          <Button onClick={handleLeave}>Back Home</Button>
        </div>
      </main>
    </div>
  );
};

export default GameClient;
