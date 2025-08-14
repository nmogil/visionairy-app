import React, { useState, useRef } from "react";
import { motion, PanInfo, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, Heart, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface SwipeableImageCarouselProps {
  images: string[];
  onVote?: (index: number) => void;
  onImageTap?: (index: number) => void;
  showVoting?: boolean;
  className?: string;
}

const SwipeableImageCarousel: React.FC<SwipeableImageCarouselProps> = ({
  images,
  onVote,
  onImageTap,
  showVoting = true,
  className,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [dragDirection, setDragDirection] = useState<"left" | "right" | null>(null);
  const [isZoomed, setIsZoomed] = useState(false);
  const [votes, setVotes] = useState<number[]>([]);
  const [lastTap, setLastTap] = useState(0);
  
  const constraintsRef = useRef<HTMLDivElement>(null);

  const handleDragEnd = (event: any, info: PanInfo) => {
    const { offset, velocity } = info;
    const swipeThreshold = 100;
    const velocityThreshold = 500;

    if (offset.x > swipeThreshold || velocity.x > velocityThreshold) {
      // Swipe right - previous image
      if (currentIndex > 0) {
        setCurrentIndex(currentIndex - 1);
        setDragDirection("right");
      }
    } else if (offset.x < -swipeThreshold || velocity.x < -velocityThreshold) {
      // Swipe left - next image
      if (currentIndex < images.length - 1) {
        setCurrentIndex(currentIndex + 1);
        setDragDirection("left");
      }
    }

    setTimeout(() => setDragDirection(null), 300);
  };

  const handleImageTap = (index: number) => {
    const now = Date.now();
    const timeDiff = now - lastTap;
    
    if (timeDiff < 300) {
      // Double tap - zoom
      setIsZoomed(!isZoomed);
    } else {
      // Single tap
      onImageTap?.(index);
    }
    
    setLastTap(now);
  };

  const handleVote = (index: number) => {
    if (!votes.includes(index)) {
      setVotes([...votes, index]);
      onVote?.(index);
    }
  };

  const nextImage = () => {
    if (currentIndex < images.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const prevImage = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  if (images.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 bg-muted rounded-lg">
        <p className="text-muted-foreground">No images to display</p>
      </div>
    );
  }

  return (
    <div className={cn("relative overflow-hidden rounded-lg", className)}>
      {/* Image container */}
      <motion.div
        ref={constraintsRef}
        className="relative h-80 md:h-96 bg-background rounded-lg overflow-hidden"
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={currentIndex}
            drag="x"
            dragConstraints={constraintsRef}
            dragElastic={0.1}
            onDragEnd={handleDragEnd}
            initial={{ 
              x: dragDirection === "left" ? 300 : dragDirection === "right" ? -300 : 0,
              opacity: 0 
            }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ 
              x: dragDirection === "left" ? -300 : 300,
              opacity: 0 
            }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="absolute inset-0 cursor-grab active:cursor-grabbing"
            whileTap={{ scale: isZoomed ? 1 : 0.98 }}
            onClick={() => handleImageTap(currentIndex)}
          >
            <motion.img
              src={images[currentIndex]}
              alt={`Image ${currentIndex + 1}`}
              className="w-full h-full object-cover select-none"
              animate={{ scale: isZoomed ? 1.5 : 1 }}
              transition={{ duration: 0.3 }}
              draggable={false}
            />
            
            {/* Zoom indicator */}
            {isZoomed && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="absolute top-4 right-4 bg-black/50 text-white px-2 py-1 rounded text-xs"
              >
                Pinch to zoom out
              </motion.div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Navigation arrows */}
        <Button
          variant="outline"
          size="icon"
          className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-background/80 backdrop-blur-sm"
          onClick={prevImage}
          disabled={currentIndex === 0}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        <Button
          variant="outline"
          size="icon"
          className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-background/80 backdrop-blur-sm"
          onClick={nextImage}
          disabled={currentIndex === images.length - 1}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>

        {/* Vote button */}
        {showVoting && (
          <motion.div
            className="absolute bottom-4 right-4"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Button
              variant={votes.includes(currentIndex) ? "default" : "outline"}
              size="sm"
              className="bg-background/80 backdrop-blur-sm"
              onClick={() => handleVote(currentIndex)}
              disabled={votes.includes(currentIndex)}
            >
              {votes.includes(currentIndex) ? (
                <>
                  <Star className="h-4 w-4 mr-2 fill-current" />
                  Voted
                </>
              ) : (
                <>
                  <Heart className="h-4 w-4 mr-2" />
                  Vote
                </>
              )}
            </Button>
          </motion.div>
        )}

        {/* Image counter */}
        <div className="absolute bottom-4 left-4">
          <Badge variant="secondary" className="bg-background/80 backdrop-blur-sm">
            {currentIndex + 1} / {images.length}
          </Badge>
        </div>
      </motion.div>

      {/* Dots indicator */}
      <div className="flex justify-center mt-4 space-x-2">
        {images.map((_, index) => (
          <motion.button
            key={index}
            className={cn(
              "w-3 h-3 rounded-full transition-colors",
              index === currentIndex ? "bg-primary" : "bg-muted",
              votes.includes(index) && "ring-2 ring-accent"
            )}
            onClick={() => setCurrentIndex(index)}
            whileHover={{ scale: 1.2 }}
            whileTap={{ scale: 0.9 }}
          />
        ))}
      </div>

      {/* Swipe hint */}
      <motion.div
        className="text-center mt-2 text-xs text-muted-foreground"
        initial={{ opacity: 1 }}
        animate={{ opacity: 0 }}
        transition={{ delay: 3, duration: 1 }}
      >
        ← Swipe to navigate • Double tap to zoom →
      </motion.div>
    </div>
  );
};

export default SwipeableImageCarousel;