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

import { Id } from "../../../../convex/_generated/dataModel";

interface Image {
  _id: Id<"generatedImages">;
  promptId: Id<"prompts">;
  imageUrl: string;
  promptText: string;
  voteCount: number;
  isWinner?: boolean;
  isOwn?: boolean;
}

interface VotingPhaseProps {
  currentQuestion: string;
  images: Image[];
  hasVoted: boolean;
  myVote?: Id<"generatedImages">;
  timeRemaining: number;
  onVote: (imageId: Id<"generatedImages">) => void;
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
  images,
  hasVoted,
  myVote,
  timeRemaining,
  onVote,
}) => {
  const [selectedImage, setSelectedImage] = useState<Id<"generatedImages"> | null>(myVote || null);
  const [lightboxImage, setLightboxImage] = useState<number | null>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [pendingVote, setPendingVote] = useState<Id<"generatedImages"> | null>(null);
  const [clickCount, setClickCount] = useState<{ [key: string]: number }>({});

  const totalTime = 45; // 45 seconds for voting (from GAME_CONFIG.VOTING_PHASE_DURATION)
  const progress = ((totalTime - timeRemaining) / totalTime) * 100;
  const isTimeWarning = timeRemaining <= 10;
  
  // Use provided images or fallback to mock data for demo
  const imagesToShow = images.length > 0 ? images : MOCK_IMAGES.slice(0, 3).map((url, index) => ({
    _id: `mock-${index}` as Id<"generatedImages">,
    promptId: `mock-prompt-${index}` as Id<"prompts">,
    imageUrl: url,
    promptText: `Mock prompt ${index + 1}`,
    voteCount: 0,
    isOwn: false
  }));

  // Image click handler
  const handleImageClick = (image: typeof imagesToShow[0], index: number) => {
    // Always allow lightbox view
    setLightboxImage(index);
    
    // If already voted, don't allow change
    if (hasVoted) return;
    
    // Check if it's user's own image
    if (image.isOwn) return;
    
    // Show confirmation for voting
    setPendingVote(image._id);
    setShowConfirmation(true);
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
            {hasVoted ? (
              <span className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-success" />
                Vote submitted! Waiting for results...
              </span>
            ) : (
              "Click on an image to vote for your favorite!"
            )}
          </p>
        </div>

        {/* Voting Instructions */}
        {!hasVoted && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-primary/10 border border-primary/20 px-4 py-2 rounded-none"
          >
            <div className="flex items-center gap-2 text-sm">
              <Eye className="w-4 h-4 text-primary" />
              <span className="font-medium">Click on any image to vote (except your own)</span>
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6">
          {imagesToShow.map((image, index) => {
            const isSelected = selectedImage === image._id;
            const isPending = pendingVote === image._id;
            const isMyVote = myVote === image._id;
            
            return (
              <motion.div
                key={image._id}
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
                          isMyVote || isSelected
                            ? "border-primary shadow-lg" 
                            : image.isOwn
                              ? "border-muted opacity-50" 
                              : "border-foreground hover:border-primary"
                        }`}
                        whileHover={!image.isOwn && !hasVoted ? { scale: 1.02 } : { scale: 1.01 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => handleImageClick(image, index)}
                      >
                  <img
                    src={image.imageUrl}
                    alt={`Generated image for "${image.promptText}"`}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />

                  {/* Prompt Text Badge */}
                  <div className="absolute top-2 left-2 bg-background/90 border border-foreground px-2 py-1 text-xs font-medium rounded-none max-w-[80%] truncate">
                    {image.promptText}
                  </div>

                  {/* Vote Count Badge */}
                  {image.voteCount > 0 && (
                    <div className="absolute top-2 right-2 bg-primary text-primary-foreground px-2 py-1 text-xs font-bold rounded-none">
                      {image.voteCount} 🗳️
                    </div>
                  )}

                  {/* Own Image Indicator */}
                  {image.isOwn && (
                    <div className="absolute bottom-2 left-2 bg-muted text-muted-foreground px-2 py-1 text-xs rounded-none">
                      Your Image
                    </div>
                  )}

                  {/* Hover Overlay */}
                  {!hasVoted && !image.isOwn && (
                    <div className="absolute inset-0 bg-background/80 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <div className="text-center space-y-2">
                        <Eye className="w-6 h-6 mx-auto text-foreground" />
                        <p className="text-sm font-medium">Click to vote</p>
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
        {hasVoted ? (
          <p>Great! You've submitted your vote. Waiting for others to finish voting.</p>
        ) : (
          <p>Click on any image to vote for your favorite (you cannot vote for your own image).</p>
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
                src={imagesToShow[lightboxImage].imageUrl}
                alt={`Full size image for "${imagesToShow[lightboxImage].promptText}"`}
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
                <p className="text-sm font-medium">{imagesToShow[lightboxImage].promptText}</p>
                <p className="text-xs text-muted-foreground">
                  {imagesToShow[lightboxImage].voteCount} votes
                  {imagesToShow[lightboxImage].isOwn && " • Your image"}
                </p>
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
                  <Check className="w-12 h-12 text-primary mx-auto" />
                  <h3 className="text-lg font-display">Confirm Your Vote</h3>
                  <p className="text-sm text-muted-foreground">
                    Are you sure you want to vote for this image?
                  </p>
                  {pendingVote && (
                    <div className="aspect-square w-32 mx-auto border-2 border-foreground rounded-none overflow-hidden">
                      {(() => {
                        const pendingImage = imagesToShow.find(img => img._id === pendingVote);
                        return pendingImage ? (
                          <img
                            src={pendingImage.imageUrl}
                            alt="Selected image"
                            className="w-full h-full object-cover"
                          />
                        ) : null;
                      })()}
                    </div>
                  )}
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
                      Vote
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