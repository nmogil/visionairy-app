import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Crown, Download, Share2, Twitter, Facebook, Trophy, Star, Sparkles, ArrowUp, ArrowDown, Minus } from "lucide-react";
import { Button } from "@/components/ui/8bit/button";
import { Card } from "@/components/ui/8bit/card";
import ImageGallery, { ImageData } from "@/components/game/ImageGallery";
import { 
  GentlePulse, 
  PointAddition, 
  GlowEffect,
  CardShadow 
} from "@/components/interactions/MicroInteractions";

interface Player {
  id: string;
  name: string;
  score: number;
}

interface Submission {
  playerId: string;
  prompt: string;
  imageUrl: string | null;
}

interface ResultsPhaseProps {
  currentQuestion: string;
  generatedImages: string[];
  selectedWinner: number | null;
  players: Player[];
  submissions: Submission[];
  timeRemaining: number;
}

// Mock image URLs
const MOCK_IMAGES = [
  "https://picsum.photos/400/400?random=1",
  "https://picsum.photos/400/400?random=2", 
  "https://picsum.photos/400/400?random=3",
  "https://picsum.photos/400/400?random=4",
];

const WINNER_MESSAGES = [
  "Absolutely unhinged! 🔥",
  "Chef's kiss! 👨‍🍳💋",
  "Pure genius! 🧠✨",
  "Comedy gold! 🏆",
  "Masterpiece! 🎨",
  "Legendary! 🦸‍♂️",
  "Iconic! 💫",
  "Brilliant! 💡",
  "Flawless victory! ⚡",
  "Mind-blowing! 🤯"
];

const CONFETTI_COLORS = ["#FFD700", "#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4", "#FFEAA7"];

// Confetti component
const Confetti: React.FC = () => {
  const particles = Array.from({ length: 50 }, (_, i) => ({
    id: i,
    color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
    x: Math.random() * 100,
    delay: Math.random() * 3,
  }));

  return (
    <div className="fixed inset-0 pointer-events-none z-10">
      {particles.map((particle) => (
        <motion.div
          key={particle.id}
          className="absolute w-2 h-2 rounded-full"
          style={{
            backgroundColor: particle.color,
            left: `${particle.x}%`,
            top: "-10px",
          }}
          animate={{
            y: ["0vh", "100vh"],
            rotate: [0, 360],
            opacity: [1, 0],
          }}
          transition={{
            duration: 3,
            delay: particle.delay,
            ease: "easeOut",
          }}
        />
      ))}
    </div>
  );
};

const ResultsPhase: React.FC<ResultsPhaseProps> = ({
  currentQuestion,
  generatedImages,
  selectedWinner,
  players,
  submissions,
  timeRemaining,
}) => {
  const [showConfetti, setShowConfetti] = useState(true);
  const [winnerMessage] = useState(WINNER_MESSAGES[Math.floor(Math.random() * WINNER_MESSAGES.length)]);
  const [showScoreAnimations, setShowScoreAnimations] = useState(false);
  const [previousScores] = useState<{ [key: string]: number }>(() => {
    // Mock previous scores (1 point less for winner)
    const prev: { [key: string]: number } = {};
    players.forEach(player => {
      prev[player.id] = player.score;
      if (selectedWinner !== null && submissions[selectedWinner]?.playerId === player.id) {
        prev[player.id] = Math.max(0, player.score - 1);
      }
    });
    return prev;
  });

  const imagesToShow = generatedImages.length > 0 ? generatedImages : MOCK_IMAGES;
  const winningImage = selectedWinner !== null ? imagesToShow[selectedWinner] : null;
  const winningSubmission = selectedWinner !== null ? submissions[selectedWinner] : null;
  const winningPlayer = winningSubmission ? players.find(p => p.id === winningSubmission.playerId) : null;

  // Stop confetti after 4 seconds and trigger score animations
  useEffect(() => {
    const confettiTimer = setTimeout(() => setShowConfetti(false), 4000);
    const scoreTimer = setTimeout(() => setShowScoreAnimations(true), 2000);
    return () => {
      clearTimeout(confettiTimer);
      clearTimeout(scoreTimer);
    };
  }, []);

  const handleDownload = async () => {
    if (!winningImage) return;
    
    try {
      const response = await fetch(winningImage);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `winning-image-${Date.now()}.jpg`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Download failed:', error);
    }
  };

  const handleShare = (platform: 'twitter' | 'facebook') => {
    const text = `Check out this winning AI-generated image! ${winnerMessage}`;
    const url = window.location.href;
    
    if (platform === 'twitter') {
      window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`);
    } else {
      window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}&quote=${encodeURIComponent(text)}`);
    }
  };

  const getScoreChange = (player: Player) => {
    const previous = previousScores[player.id] || 0;
    const change = player.score - previous;
    if (change > 0) return { type: 'up', value: change };
    if (change < 0) return { type: 'down', value: Math.abs(change) };
    return { type: 'same', value: 0 };
  };

  const sortedPlayers = [...players].sort((a, b) => b.score - a.score);

  return (
    <div className="space-y-8 relative">
      {/* Confetti */}
      <AnimatePresence>
        {showConfetti && <Confetti />}
      </AnimatePresence>

      {/* Header */}
      <div className="text-center space-y-4">
        <GentlePulse>
          <motion.h2
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-2xl md:text-3xl font-display tracking-wide flex items-center justify-center gap-3"
          >
            <Trophy className="w-8 h-8 text-primary" />
            Round Results!
            <Trophy className="w-8 h-8 text-primary" />
          </motion.h2>
        </GentlePulse>

        {/* Winner Message */}
        {winningPlayer && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="space-y-2"
          >
            <p className="text-lg font-medium">
              🎉 <span className="text-primary">{winningPlayer.name}</span> wins this round! 🎉
            </p>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1 }}
              className="text-xl font-display text-primary"
            >
              {winnerMessage}
            </motion.p>
          </motion.div>
        )}
      </div>

      {/* Winning Image Showcase */}
      {winningImage && winningSubmission && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 }}
          className="relative"
        >
          <CardShadow>
            <Card className="p-6 bg-gradient-to-br from-primary/10 to-primary/5 border-primary">
              <div className="flex flex-col lg:flex-row gap-6 items-center">
                {/* Enhanced Winning Image */}
                <div className="relative">
                  <GlowEffect isGlowing={true}>
                    <GentlePulse>
                      <motion.div
                        className="relative aspect-square w-64 h-64 border-4 border-primary rounded-none overflow-hidden"
                        animate={{ 
                          boxShadow: [
                            "0 0 20px rgba(255, 215, 0, 0.5)",
                            "0 0 40px rgba(255, 215, 0, 0.8)",
                            "0 0 20px rgba(255, 215, 0, 0.5)"
                          ]
                        }}
                        transition={{ duration: 2, repeat: Infinity }}
                      >
                        <img
                          src={winningImage}
                          alt="Winning submission"
                          className="w-full h-full object-cover"
                        />
                        
                        {/* Crown overlay */}
                        <div className="absolute -top-3 -right-3">
                          <motion.div
                            animate={{ rotate: [0, 10, -10, 0] }}
                            transition={{ duration: 2, repeat: Infinity }}
                            className="w-8 h-8 bg-primary rounded-full flex items-center justify-center"
                          >
                            <Crown className="w-5 h-5 text-primary-foreground" />
                          </motion.div>
                        </div>
                      </motion.div>
                    </GentlePulse>
                  </GlowEffect>

                  {/* Enhanced +1 Point Animation */}
                  <PointAddition 
                    points={1} 
                    isVisible={showScoreAnimations} 
                    className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2"
                  />
                </div>

              {/* Winning Details */}
              <div className="flex-1 space-y-4 text-center lg:text-left">
                <div>
                  <h3 className="text-xl font-display mb-2">Winning Prompt:</h3>
                  <p className="text-lg italic bg-muted/50 p-4 rounded-none border-l-4 border-primary">
                    "{winningSubmission.prompt}"
                  </p>
                </div>

                <div className="flex flex-wrap gap-2 justify-center lg:justify-start">
                  <Button
                    onClick={handleDownload}
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    Download
                  </Button>
                  <Button
                    onClick={() => handleShare('twitter')}
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-2"
                  >
                    <Twitter className="w-4 h-4" />
                    Share
                  </Button>
                  <Button
                    onClick={() => handleShare('facebook')}
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-2"
                  >
                    <Facebook className="w-4 h-4" />
                    Share
                  </Button>
                </div>
              </div>
            </div>
          </Card>
          </CardShadow>
        </motion.div>
      )}

      {/* All Submissions */}
      <div className="space-y-4">
        <h3 className="text-lg font-display text-center">All Submissions</h3>
        <ImageGallery
          images={imagesToShow.map((imageUrl, index) => {
            const submission = submissions[index];
            const player = submission ? players.find(p => p.id === submission.playerId) : players[index];
            return {
              id: `submission-${index}`,
              url: imageUrl,
              player: player?.name || `Player ${index + 1}`,
              prompt: submission?.prompt || currentQuestion,
              timestamp: new Date(),
              isFavorite: selectedWinner === index,
              metadata: {
                width: 400,
                height: 400,
              },
            } as ImageData;
          })}
          className="mt-4"
          enableComparison={true}
          autoLayout={true}
        />
      </div>

      {/* Enhanced Scoreboard */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.2 }}
      >
        <CardShadow>
          <Card className="p-6">
            <h3 className="text-lg font-display mb-4 text-center">Updated Scoreboard</h3>
            <div className="space-y-2">
              {sortedPlayers.map((player, index) => {
                const scoreChange = getScoreChange(player);
                const isWinner = winningPlayer?.id === player.id;
                
                return (
                  <motion.div
                    key={player.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 1.4 + index * 0.1 }}
                    className={`flex items-center justify-between p-3 bg-muted/30 rounded-none border border-border ${
                      isWinner ? 'bg-primary/10 border-primary' : ''
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2">
                        {index === 0 && <Trophy className="w-5 h-5 text-primary" />}
                        {index === 1 && <Star className="w-4 h-4 text-muted-foreground" />}
                        {index === 2 && <Sparkles className="w-4 h-4 text-muted-foreground" />}
                        <span className="font-medium">{player.name}</span>
                        {isWinner && <Crown className="w-4 h-4 text-primary" />}
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      {/* Enhanced Score Change Animation */}
                      <AnimatePresence>
                        {showScoreAnimations && scoreChange.type === 'up' && (
                          <motion.div
                            initial={{ opacity: 0, scale: 0.5, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                            className="flex items-center gap-1 text-green-500 text-sm font-medium"
                          >
                            <ArrowUp className="w-3 h-3" />
                            +{scoreChange.value}
                          </motion.div>
                        )}
                        {showScoreAnimations && scoreChange.type === 'down' && (
                          <motion.div
                            initial={{ opacity: 0, scale: 0.5, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                            className="flex items-center gap-1 text-red-500 text-sm font-medium"
                          >
                            <ArrowDown className="w-3 h-3" />
                            -{scoreChange.value}
                          </motion.div>
                        )}
                      </AnimatePresence>

                      <div className="text-right">
                        <motion.div 
                          className="text-lg font-bold"
                          animate={isWinner && showScoreAnimations ? { 
                            scale: [1, 1.2, 1],
                            color: ["hsl(var(--foreground))", "hsl(var(--primary))", "hsl(var(--foreground))"]
                          } : {}}
                          transition={{ duration: 0.6, delay: 2 }}
                        >
                          {player.score}
                        </motion.div>
                        <div className="text-xs text-muted-foreground">points</div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </Card>
        </CardShadow>
      </motion.div>

      {/* Next Round Countdown */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2 }}
        className="text-center space-y-4"
      >
        <div className="flex items-center justify-center gap-2">
          <Sparkles className="w-5 h-5 text-primary" />
          <span className="text-lg font-medium">Next round starting in</span>
          <Sparkles className="w-5 h-5 text-primary" />
        </div>
        <motion.div
          className="text-4xl font-display font-bold text-primary"
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ duration: 1, repeat: Infinity }}
        >
          {timeRemaining}s
        </motion.div>
        <p className="text-sm text-muted-foreground">Get ready for the next challenge!</p>
      </motion.div>
    </div>
  );
};

export default ResultsPhase;