import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight, Hand, RotateCcw, ZoomIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface GestureHintsProps {
  isVisible: boolean;
  onComplete: () => void;
}

const GestureHints: React.FC<GestureHintsProps> = ({ isVisible, onComplete }) => {
  const [currentHint, setCurrentHint] = useState(0);

  const hints = [
    {
      icon: Hand,
      title: "Swipe to Navigate",
      description: "Swipe left or right on images to browse through them",
      animation: "translateX",
    },
    {
      icon: ZoomIn,
      title: "Double Tap to Zoom",
      description: "Double tap any image to zoom in for a closer look",
      animation: "scale",
    },
    {
      icon: RotateCcw,
      title: "Pull to Refresh",
      description: "Pull down from the top to refresh the game state",
      animation: "translateY",
    },
  ];

  const currentHintData = hints[currentHint];

  const nextHint = () => {
    if (currentHint < hints.length - 1) {
      setCurrentHint(currentHint + 1);
    } else {
      onComplete();
    }
  };

  const skipTutorial = () => {
    onComplete();
  };

  const getAnimationProps = () => {
    switch (currentHintData.animation) {
      case "translateX":
        return {
          animate: { x: [0, 20, -20, 0] },
          transition: { duration: 2, repeat: Infinity, repeatDelay: 1 },
        };
      case "scale":
        return {
          animate: { scale: [1, 1.2, 1] },
          transition: { duration: 1.5, repeat: Infinity, repeatDelay: 1 },
        };
      case "translateY":
        return {
          animate: { y: [0, -15, 0] },
          transition: { duration: 1.5, repeat: Infinity, repeatDelay: 1 },
        };
      default:
        return {};
    }
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-6"
        >
          <Card className="w-full max-w-sm">
            <CardContent className="p-6 text-center space-y-6">
              {/* Progress indicator */}
              <div className="flex space-x-2 justify-center">
                {hints.map((_, index) => (
                  <div
                    key={index}
                    className={`h-2 w-8 rounded-full transition-colors ${
                      index === currentHint ? "bg-primary" : "bg-muted"
                    }`}
                  />
                ))}
              </div>

              {/* Animated icon */}
              <motion.div
                className="flex justify-center"
                {...getAnimationProps()}
              >
                <div className="p-4 bg-primary/10 rounded-full">
                  <currentHintData.icon className="h-8 w-8 text-primary" />
                </div>
              </motion.div>

              {/* Content */}
              <div className="space-y-3">
                <h3 className="text-lg font-semibold">{currentHintData.title}</h3>
                <p className="text-muted-foreground text-sm">
                  {currentHintData.description}
                </p>
              </div>

              {/* Actions */}
              <div className="flex space-x-3">
                <Button
                  variant="outline"
                  onClick={skipTutorial}
                  className="flex-1"
                >
                  Skip
                </Button>
                <Button onClick={nextHint} className="flex-1">
                  {currentHint < hints.length - 1 ? (
                    <>
                      Next
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </>
                  ) : (
                    "Got it!"
                  )}
                </Button>
              </div>

              {/* Hint text */}
              <p className="text-xs text-muted-foreground">
                You can replay this tutorial anytime in settings
              </p>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default GestureHints;