import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Trophy, Crown, Medal, Star, Sparkles, Download, Share2, 
  RotateCcw, Plus, Users, Clock, ImageIcon, ThumbsUp, 
  Copy, Check, Smile, Zap, Brain, Skull 
} from "lucide-react";
import { Button } from "@/components/ui/8bit/button";
import { Card } from "@/components/ui/8bit/card";
import { Slider } from "@/components/ui/8bit/slider";
import { Label } from "@/components/ui/8bit/label";
import ImageGallery, { ImageData } from "@/components/game/ImageGallery";

interface Player {
  id: string;
  name: string;
  score: number;
}

interface GameOverPhaseProps {
  players: Player[];
}

// Mock data for demonstration
const MOCK_WINNING_IMAGES = [
  { url: "https://picsum.photos/300/300?random=10", prompt: "A cat wearing a space helmet", winner: "Alice" },
  { url: "https://picsum.photos/300/300?random=11", prompt: "A robot painting a masterpiece", winner: "Bob" },
  { url: "https://picsum.photos/300/300?random=12", prompt: "A dinosaur at a coffee shop", winner: "Charlie" },
  { url: "https://picsum.photos/300/300?random=13", prompt: "A wizard's magical garden", winner: "Diana" },
];

const SUPERLATIVES = [
  { title: "Most Creative", icon: Brain, player: "Alice", description: "For thinking outside the box!" },
  { title: "Funniest", icon: Smile, player: "Bob", description: "Had us rolling on the floor!" },
  { title: "Most Cursed", icon: Skull, player: "Charlie", description: "Disturbing yet fascinating..." },
  { title: "Lightning Fast", icon: Zap, player: "Diana", description: "Speediest submissions!" },
];

const FIREWORKS_COLORS = ["#FFD700", "#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4", "#FFEAA7", "#FD79A8"];

// Fireworks component
const Fireworks: React.FC = () => {
  const explosions = Array.from({ length: 8 }, (_, i) => ({
    id: i,
    x: 20 + Math.random() * 60,
    y: 20 + Math.random() * 40,
    delay: Math.random() * 2,
    color: FIREWORKS_COLORS[Math.floor(Math.random() * FIREWORKS_COLORS.length)],
  }));

  return (
    <div className="fixed inset-0 pointer-events-none z-10">
      {explosions.map((explosion) => (
        <div
          key={explosion.id}
          className="absolute"
          style={{ left: `${explosion.x}%`, top: `${explosion.y}%` }}
        >
          {Array.from({ length: 12 }, (_, j) => (
            <motion.div
              key={j}
              className="absolute w-1 h-1 rounded-full"
              style={{ backgroundColor: explosion.color }}
              animate={{
                x: [0, Math.cos((j * 30) * Math.PI / 180) * 50],
                y: [0, Math.sin((j * 30) * Math.PI / 180) * 50],
                opacity: [1, 0],
                scale: [1, 0],
              }}
              transition={{
                duration: 1.5,
                delay: explosion.delay,
                ease: "easeOut",
              }}
            />
          ))}
        </div>
      ))}
    </div>
  );
};

const GameOverPhase: React.FC<GameOverPhaseProps> = ({ players }) => {
  const [showFireworks, setShowFireworks] = useState(true);
  const [copiedRoomCode, setCopiedRoomCode] = useState(false);
  const [gameRating, setGameRating] = useState(5);
  const [funRating, setFunRating] = useState(5);

  const sortedPlayers = [...players].sort((a, b) => b.score - a.score);
  const champion = sortedPlayers[0];
  const podiumPlayers = sortedPlayers.slice(0, 3);

  // Mock game statistics
  const gameStats = {
    totalImages: players.length * 3, // 3 rounds
    avgGenerationTime: "6.2s",
    totalPlayTime: "18m 42s",
    mostPopularPrompt: "A cat wearing a space helmet",
    roomCode: "ABCDEF",
  };

  // Stop fireworks after 5 seconds
  useEffect(() => {
    const timer = setTimeout(() => setShowFireworks(false), 5000);
    return () => clearTimeout(timer);
  }, []);

  const handleCopyRoomCode = async () => {
    try {
      await navigator.clipboard.writeText(gameStats.roomCode);
      setCopiedRoomCode(true);
      setTimeout(() => setCopiedRoomCode(false), 2000);
    } catch (error) {
      console.error('Failed to copy room code:', error);
    }
  };

  const handleSaveResults = () => {
    const results = {
      champion: champion.name,
      finalScores: sortedPlayers.map(p => ({ name: p.name, score: p.score })),
      gameStats,
      timestamp: new Date().toISOString(),
    };

    const blob = new Blob([JSON.stringify(results, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `game-results-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  const handleShare = () => {
    const text = `🎮 Just finished an epic AI image game! ${champion.name} was crowned champion with ${champion.score} points! Want to play? Join room: ${gameStats.roomCode}`;
    
    if (navigator.share) {
      navigator.share({ text });
    } else {
      navigator.clipboard.writeText(text);
    }
  };

  return (
    <div className="space-y-8 relative">
      {/* Fireworks */}
      <AnimatePresence>
        {showFireworks && <Fireworks />}
      </AnimatePresence>

      {/* Game Over Header */}
      <div className="text-center space-y-6">
        <motion.h1
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-4xl md:text-6xl font-display tracking-wide text-primary"
        >
          GAME OVER!
        </motion.h1>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="space-y-2"
        >
          <h2 className="text-2xl md:text-3xl font-display flex items-center justify-center gap-3">
            <Crown className="w-8 h-8 text-primary" />
            {champion.name} is the Champion!
            <Crown className="w-8 h-8 text-primary" />
          </h2>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
            className="text-lg text-muted-foreground"
          >
            With {champion.score} points of pure creativity!
          </motion.p>
        </motion.div>
      </div>

      {/* Podium */}
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8 }}
      >
        <Card className="p-8 bg-gradient-to-br from-primary/10 to-primary/5">
          <h3 className="text-xl font-display text-center mb-6">🏆 Final Podium 🏆</h3>
          <div className="flex justify-center items-end gap-4 max-w-2xl mx-auto">
            {/* Silver (2nd place) */}
            {podiumPlayers[1] && (
              <motion.div
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.2 }}
                className="text-center"
              >
                <div className="w-20 h-20 mx-auto mb-2 bg-slate-400 rounded-full flex items-center justify-center border-4 border-slate-300">
                  <Medal className="w-10 h-10 text-white" />
                </div>
                <div className="bg-slate-400 h-24 w-32 flex flex-col justify-center items-center text-white rounded-t-lg">
                  <span className="font-bold text-sm">{podiumPlayers[1].name}</span>
                  <span className="text-xs">{podiumPlayers[1].score} pts</span>
                  <span className="text-xs font-mono">2nd</span>
                </div>
              </motion.div>
            )}

            {/* Gold (1st place) */}
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.0 }}
              className="text-center"
            >
              <div className="w-24 h-24 mx-auto mb-2 bg-primary rounded-full flex items-center justify-center border-4 border-yellow-300 shadow-lg">
                <Trophy className="w-12 h-12 text-primary-foreground" />
              </div>
              <div className="bg-primary h-32 w-36 flex flex-col justify-center items-center text-primary-foreground rounded-t-lg">
                <span className="font-bold">{podiumPlayers[0].name}</span>
                <span className="text-sm">{podiumPlayers[0].score} pts</span>
                <span className="text-sm font-mono">1st</span>
              </div>
            </motion.div>

            {/* Bronze (3rd place) */}
            {podiumPlayers[2] && (
              <motion.div
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.4 }}
                className="text-center"
              >
                <div className="w-20 h-20 mx-auto mb-2 bg-amber-600 rounded-full flex items-center justify-center border-4 border-amber-500">
                  <Medal className="w-10 h-10 text-white" />
                </div>
                <div className="bg-amber-600 h-20 w-32 flex flex-col justify-center items-center text-white rounded-t-lg">
                  <span className="font-bold text-sm">{podiumPlayers[2].name}</span>
                  <span className="text-xs">{podiumPlayers[2].score} pts</span>
                  <span className="text-xs font-mono">3rd</span>
                </div>
              </motion.div>
            )}
          </div>
        </Card>
      </motion.div>

      {/* Full Scoreboard */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 1.6 }}
      >
        <Card className="p-6">
          <h3 className="text-lg font-display mb-4 text-center">Final Scoreboard</h3>
          <div className="space-y-2">
            {sortedPlayers.map((player, index) => (
              <motion.div
                key={player.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 1.8 + index * 0.1 }}
                className={`flex items-center justify-between p-4 rounded-none border-2 ${
                  index === 0 ? 'border-primary bg-primary/5' : 'border-border bg-muted/30'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                    index === 0 ? 'bg-primary text-primary-foreground' : 'bg-foreground text-background'
                  }`}>
                    #{index + 1}
                  </span>
                  <span className="font-medium text-lg">{player.name}</span>
                  {index === 0 && <Crown className="w-5 h-5 text-primary" />}
                </div>
                <span className="font-bold text-xl">{player.score} pts</span>
              </motion.div>
            ))}
          </div>
        </Card>
      </motion.div>

      {/* Best Images Gallery */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 2.0 }}
      >
        <Card className="p-6">
          <h3 className="text-lg font-display mb-4 text-center flex items-center justify-center gap-2">
            <ImageIcon className="w-5 h-5" />
            Best Images Gallery
            <ImageIcon className="w-5 h-5" />
          </h3>
          <ImageGallery
            images={MOCK_WINNING_IMAGES.map((image, index) => ({
              id: `winner-${index}`,
              url: image.url,
              player: image.winner,
              prompt: image.prompt,
              timestamp: new Date(),
              isFavorite: true,
              metadata: {
                width: 300,
                height: 300,
              },
            } as ImageData))}
            className="mt-4"
            enableComparison={true}
            autoLayout={true}
          />
        </Card>
      </motion.div>

      {/* Superlatives */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 2.4 }}
      >
        <Card className="p-6">
          <h3 className="text-lg font-display mb-4 text-center flex items-center justify-center gap-2">
            <Sparkles className="w-5 h-5" />
            Special Awards
            <Sparkles className="w-5 h-5" />
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {SUPERLATIVES.map((award, index) => {
              const IconComponent = award.icon;
              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: index % 2 === 0 ? -20 : 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 2.6 + index * 0.1 }}
                  className="bg-muted/50 p-4 rounded-none border border-border"
                >
                  <div className="flex items-center gap-3">
                    <IconComponent className="w-8 h-8 text-primary" />
                    <div>
                      <h4 className="font-bold">{award.title}</h4>
                      <p className="text-sm text-primary">{award.player}</p>
                      <p className="text-xs text-muted-foreground">{award.description}</p>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </Card>
      </motion.div>

      {/* Game Statistics */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 2.8 }}
      >
        <Card className="p-6">
          <h3 className="text-lg font-display mb-4 text-center">Game Statistics</h3>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-center">
            <div className="space-y-1">
              <ImageIcon className="w-6 h-6 mx-auto text-primary" />
              <p className="text-2xl font-bold">{gameStats.totalImages}</p>
              <p className="text-xs text-muted-foreground">Images Created</p>
            </div>
            <div className="space-y-1">
              <Clock className="w-6 h-6 mx-auto text-primary" />
              <p className="text-2xl font-bold">{gameStats.avgGenerationTime}</p>
              <p className="text-xs text-muted-foreground">Avg Generation</p>
            </div>
            <div className="space-y-1">
              <Users className="w-6 h-6 mx-auto text-primary" />
              <p className="text-2xl font-bold">{players.length}</p>
              <p className="text-xs text-muted-foreground">Players</p>
            </div>
            <div className="space-y-1">
              <Trophy className="w-6 h-6 mx-auto text-primary" />
              <p className="text-2xl font-bold">3</p>
              <p className="text-xs text-muted-foreground">Rounds Played</p>
            </div>
            <div className="space-y-1">
              <Sparkles className="w-6 h-6 mx-auto text-primary" />
              <p className="text-2xl font-bold">{gameStats.totalPlayTime}</p>
              <p className="text-xs text-muted-foreground">Total Time</p>
            </div>
          </div>
        </Card>
      </motion.div>

      {/* Player Feedback */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 3.0 }}
      >
        <Card className="p-6">
          <h3 className="text-lg font-display mb-4 text-center">Rate Your Experience</h3>
          <div className="space-y-6 max-w-md mx-auto">
            <div className="space-y-2">
              <Label className="text-sm font-medium">How fun was this game?</Label>
              <Slider
                value={[funRating]}
                onValueChange={(value) => setFunRating(value[0])}
                max={10}
                min={1}
                step={1}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Not fun</span>
                <span className="font-medium">{funRating}/10</span>
                <span>Amazing!</span>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label className="text-sm font-medium">Would you recommend this game?</Label>
              <Slider
                value={[gameRating]}
                onValueChange={(value) => setGameRating(value[0])}
                max={10}
                min={1}
                step={1}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Never</span>
                <span className="font-medium">{gameRating}/10</span>
                <span>Absolutely!</span>
              </div>
            </div>
          </div>
        </Card>
      </motion.div>

      {/* Action Buttons */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 3.2 }}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
      >
        <Button
          onClick={() => window.location.reload()}
          className="flex items-center gap-2 h-12"
        >
          <RotateCcw className="w-4 h-4" />
          Play Again
        </Button>
        
        <Button
          onClick={() => window.location.href = '/'}
          variant="outline"
          className="flex items-center gap-2 h-12"
        >
          <Plus className="w-4 h-4" />
          New Room
        </Button>
        
        <Button
          onClick={handleSaveResults}
          variant="outline"
          className="flex items-center gap-2 h-12"
        >
          <Download className="w-4 h-4" />
          Save Results
        </Button>
        
        <Button
          onClick={handleShare}
          variant="outline"
          className="flex items-center gap-2 h-12"
        >
          <Share2 className="w-4 h-4" />
          Share Game
        </Button>
      </motion.div>

      {/* Share Room Code */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 3.4 }}
        className="text-center space-y-2"
      >
        <p className="text-sm text-muted-foreground">Want a rematch? Share this room code:</p>
        <div className="flex items-center justify-center gap-2">
          <code className="bg-muted px-4 py-2 rounded-none border border-border font-mono text-lg">
            {gameStats.roomCode}
          </code>
          <Button
            onClick={handleCopyRoomCode}
            variant="ghost"
            size="sm"
            className="flex items-center gap-1"
          >
            {copiedRoomCode ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            {copiedRoomCode ? 'Copied!' : 'Copy'}
          </Button>
        </div>
      </motion.div>
    </div>
  );
};

export default GameOverPhase;