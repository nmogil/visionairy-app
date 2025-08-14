import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Crown, Eye, Timer, Check, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/8bit/button";
import { Card } from "@/components/ui/8bit/card";
import { 
  RippleEffect, 
  GlowEffect, 
  ShakeAttention, 
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

interface VotingPhaseProps {
  currentQuestion: string;
  generatedImages: string[];
  players: Player[];
  submissions: Submission[];
  cardCzarId: string;
  currentUserId: string;
  timeRemaining: number;
  onVote: (index: number) => void;
}

// Mock image URLs with different dimensions for variety
const MOCK_IMAGES = [
  "https://picsum.photos/400/400?random=1",
  "https://picsum.photos/400/400?random=2", 
  "https://picsum.photos/400/400?random=3",
  "https://picsum.photos/400/400?random=4",
  "https://picsum.photos/400/400?random=5",
  "https://picsum.photos/400/400?random=6"
];

const VotingPhase: React.FC<VotingPhaseProps> = ({
  currentQuestion,
  generatedImages,
  players,
  submissions,
  cardCzarId,
  currentUserId,
  timeRemaining,
  onVote,
}) => {
  const [selectedImage, setSelectedImage] = useState<number | null>(null);
  const [lightboxImage, setLightboxImage] = useState<number | null>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [pendingVote, setPendingVote] = useState<number | null>(null);
  const [clickCount, setClickCount] = useState<{ [key: number]: number }>({});

  const isCzar = cardCzarId === currentUserId;
  const totalTime = 30; // 30 seconds for voting
  const progress = ((totalTime - timeRemaining) / totalTime) * 100;
  const isTimeWarning = timeRemaining <= 10;
  
  // Use mock images if no generated images provided
  const imagesToShow = generatedImages.length > 0 ? generatedImages : MOCK_IMAGES.slice(0, players.length);

  // Double-click protection
  const handleImageClick = (index: number) => {
    if (!isCzar) {
      setLightboxImage(index);
      return;
    }

    const currentCount = clickCount[index] || 0;
    const newCount = currentCount + 1;
    
    setClickCount(prev => ({ ...prev, [index]: newCount }));

    if (newCount === 1) {
      // First click - start timer
      setTimeout(() => {
        setClickCount(prev => ({ ...prev, [index]: 0 }));
      }, 300);
    } else if (newCount === 2) {
      // Double click - show confirmation
      setPendingVote(index);
      setShowConfirmation(true);
      setClickCount(prev => ({ ...prev, [index]: 0 }));
    }
  };

  const handleConfirmVote = () => {
    if (pendingVote !== null) {
      setSelectedImage(pendingVote);
      onVote(pendingVote);
      setShowConfirmation(false);
      setPendingVote(null);
    }
  };

  const handleCancelVote = () => {
    setShowConfirmation(false);
    setPendingVote(null);
  };

  // Get player name for image
  const getPlayerName = (index: number) => {
    const submission = submissions[index];
    if (submission) {
      const player = players.find(p => p.id === submission.playerId);
      return player?.name || `Player ${index + 1}`;
    }
    return players[index]?.name || `Player ${index + 1}`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-xl md:text-2xl font-display tracking-wide">
            {currentQuestion}
          </h2>
          <p className="text-sm text-muted-foreground">
            {isCzar ? (
              <span className="flex items-center gap-2">
                <Crown className="w-4 h-4 text-primary" />
                You're the Card Czar - Choose the winner!
              </span>
            ) : (
              "Waiting for Card Czar to choose the winner..."
            )}
          </p>
        </div>

        {/* Non-Czar Warning Banner */}
        {!isCzar && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-muted/80 border border-border px-4 py-2 rounded-none"
          >
            <div className="flex items-center gap-2 text-sm">
              <AlertCircle className="w-4 h-4 text-muted-foreground" />
              <span className="font-medium">Click any image to view full-size</span>
            </div>
          </motion.div>
        )}

        {/* Enhanced Timer with Shake Warning */}
        <ShakeAttention isShaking={isTimeWarning}>
          <div className="relative">
            <svg className="w-16 h-16 transform -rotate-90" viewBox="0 0 36 36">
              <path
                className="stroke-muted"
                strokeWidth="2"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
              <motion.path
                className={`${isTimeWarning ? 'stroke-destructive' : 'stroke-primary'}`}
                strokeWidth="2"
                strokeLinecap="round"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                initial={{ strokeDasharray: "0 100" }}
                animate={{ strokeDasharray: `${progress} 100` }}
                transition={{ duration: 0.5 }}
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <Timer className={`w-4 h-4 mx-auto ${isTimeWarning ? 'text-destructive' : 'text-primary'}`} />
                <span className={`text-xs font-mono ${isTimeWarning ? 'text-destructive font-bold' : ''}`}>
                  {timeRemaining}s
                </span>
              </div>
            </div>
          </div>
        </ShakeAttention>
      </div>

      {/* Images Grid */}
      <div className="relative">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-4 gap-4 md:gap-6">
          {imagesToShow.map((imageUrl, index) => {
            const isSelected = selectedImage === index;
            const isPending = pendingVote === index;
            
            return (
              <motion.div
                key={index}
                className="relative group"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.1 }}
              >
                {/* Enhanced Image Container with Ripple and Glow */}
                <RippleEffect>
                  <GlowEffect isGlowing={isSelected}>
                    <CardShadow>
                      <motion.div
                        className={`relative aspect-square overflow-hidden border-2 rounded-none cursor-pointer ${
                          isSelected 
                            ? "border-primary shadow-lg" 
                            : isCzar 
                              ? "border-foreground hover:border-primary" 
                              : "border-foreground"
                        }`}
                        whileHover={isCzar ? { scale: 1.02 } : { scale: 1.01 }}
                        whileTap={{ scale: 0.98 }}
                        animate={
                          isCzar && !isSelected ? {
                            borderColor: ["hsl(var(--foreground))", "hsl(var(--primary))", "hsl(var(--foreground))"]
                          } : {}
                        }
                        transition={
                          isCzar && !isSelected ? {
                            duration: 2,
                            repeat: Infinity,
                            ease: "easeInOut"
                          } : {}
                        }
                        onClick={() => handleImageClick(index)}
                      >
                  <img
                    src={imageUrl}
                    alt={`Generated image ${index + 1}`}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />

                  {/* Player Name Badge */}
                  <div className="absolute top-2 left-2 bg-background/90 border border-foreground px-2 py-1 text-xs font-medium rounded-none">
                    {getPlayerName(index)}
                  </div>

                  {/* Hover Overlay for Non-Czar */}
                  {!isCzar && (
                    <div className="absolute inset-0 bg-background/80 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <div className="text-center space-y-2">
                        <Eye className="w-6 h-6 mx-auto text-foreground" />
                        <p className="text-sm font-medium">Click to view</p>
                      </div>
                    </div>
                  )}

                  {/* Selection Indicator */}
                  <AnimatePresence>
                    {isSelected && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0 }}
                        className="absolute inset-0 bg-primary/20 flex items-center justify-center"
                      >
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: [0, 1.2, 1] }}
                          className="w-16 h-16 bg-primary rounded-full flex items-center justify-center"
                        >
                          <Check className="w-8 h-8 text-primary-foreground" />
                        </motion.div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Pending Selection Highlight */}
                  {isPending && (
                    <div className="absolute inset-0 bg-warning/20 border-2 border-warning animate-pulse" />
                  )}

                        {/* Click Indicator for Card Czar */}
                        {isCzar && clickCount[index] === 1 && (
                          <div className="absolute inset-0 bg-primary/10 animate-pulse" />
                        )}
                      </motion.div>
                    </CardShadow>
                  </GlowEffect>
                </RippleEffect>

                {/* Image Index */}
                <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-foreground text-background rounded-full flex items-center justify-center text-xs font-mono">
                  {index + 1}
                </div>
              </motion.div>
            );
          })}
        </div>

      </div>

      {/* Instructions */}
      <div className="text-center text-sm text-muted-foreground">
        {isCzar ? (
          <p>Double-click an image to select the winner. Take your time!</p>
        ) : (
          <p>The Card Czar is choosing the winner. Click any image to view it full-size.</p>
        )}
      </div>

      {/* Lightbox Modal */}
      <AnimatePresence>
        {lightboxImage !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-background/95 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setLightboxImage(null)}
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="relative max-w-3xl max-h-[90vh] bg-card border-2 border-foreground rounded-none"
              onClick={(e) => e.stopPropagation()}
            >
              <img
                src={imagesToShow[lightboxImage]}
                alt={`Full size image ${lightboxImage + 1}`}
                className="w-full h-full object-contain"
              />
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-2 right-2"
                onClick={() => setLightboxImage(null)}
              >
                <X className="w-4 h-4" />
              </Button>
              <div className="absolute bottom-2 left-2 bg-background/90 border border-foreground px-3 py-2 rounded-none">
                <p className="text-sm font-medium">{getPlayerName(lightboxImage)}</p>
                <p className="text-xs text-muted-foreground">Image {lightboxImage + 1}</p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Confirmation Modal */}
      <AnimatePresence>
        {showConfirmation && pendingVote !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-background/90 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
            >
              <CardShadow>
                <Card className="p-6 max-w-md text-center space-y-4">
                  <Crown className="w-12 h-12 text-primary mx-auto" />
                  <h3 className="text-lg font-display">Confirm Winner</h3>
                  <p className="text-sm text-muted-foreground">
                    Are you sure you want to choose <strong>{getPlayerName(pendingVote)}</strong>'s image as the winner?
                  </p>
                  <div className="aspect-square w-32 mx-auto border-2 border-foreground rounded-none overflow-hidden">
                    <img
                      src={imagesToShow[pendingVote]}
                      alt="Selected winner"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={handleCancelVote}
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleConfirmVote}
                      className="flex-1"
                    >
                      Confirm Winner
                    </Button>
                  </div>
                </Card>
              </CardShadow>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default VotingPhase;