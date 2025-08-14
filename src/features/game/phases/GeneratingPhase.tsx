import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, Sparkles, Zap } from "lucide-react";

interface Player {
  id: string;
  name: string;
  score: number;
}

interface GeneratingPhaseProps {
  players: Player[];
  timeRemaining: number;
}

const LOADING_MESSAGES = [
  "Teaching AI about humor...",
  "Mixing pixels with imagination...",
  "Adding a pinch of chaos...",
  "Consulting the digital muse...",
  "Brewing visual magic...",
  "Decoding creative DNA...",
  "Summoning artistic spirits...",
  "Calibrating comedy sensors...",
  "Unleashing digital dreams...",
  "Processing pure creativity..."
];

const PARTICLES_COUNT = 20;

const GeneratingPhase: React.FC<GeneratingPhaseProps> = ({
  players,
  timeRemaining,
}) => {
  const [messageIndex, setMessageIndex] = useState(0);
  const [completedCards, setCompletedCards] = useState<Set<number>>(new Set());
  const [progress, setProgress] = useState(0);
  const [particles, setParticles] = useState<Array<{ id: number; x: number; y: number; delay: number }>>([]);

  const totalTime = 8; // 8 seconds total generation time
  const currentProgress = ((totalTime - timeRemaining) / totalTime) * 100;
  const isNearComplete = timeRemaining <= 2;

  // Initialize particles
  useEffect(() => {
    const newParticles = Array.from({ length: PARTICLES_COUNT }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      delay: Math.random() * 2,
    }));
    setParticles(newParticles);
  }, []);

  // Rotate loading messages
  useEffect(() => {
    const interval = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % LOADING_MESSAGES.length);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  // Update progress smoothly
  useEffect(() => {
    setProgress(currentProgress);
  }, [currentProgress]);

  // Staggered card completion
  useEffect(() => {
    const completionThreshold = 70; // Start completing cards at 70% progress
    if (progress >= completionThreshold) {
      const cardsToComplete = Math.floor(((progress - completionThreshold) / (100 - completionThreshold)) * players.length);
      const newCompleted = new Set<number>();
      for (let i = 0; i < cardsToComplete; i++) {
        newCompleted.add(i);
      }
      setCompletedCards(newCompleted);
    }
  }, [progress, players.length]);

  return (
    <div className="space-y-6 relative overflow-hidden">
      {/* Scan-line effect */}
      <div className="absolute inset-0 pointer-events-none">
        <motion.div
          className="absolute w-full h-1 bg-gradient-to-r from-transparent via-primary to-transparent opacity-60"
          animate={{
            y: ["-100%", "100vh"],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: "linear",
          }}
        />
      </div>

      {/* Floating particles */}
      <div className="absolute inset-0 pointer-events-none">
        {particles.map((particle) => (
          <motion.div
            key={particle.id}
            className="absolute w-1 h-1 bg-primary/30 rounded-full"
            style={{
              left: `${particle.x}%`,
              top: `${particle.y}%`,
            }}
            animate={{
              y: [0, -20, 0],
              opacity: [0.3, 0.8, 0.3],
              scale: [0.5, 1, 0.5],
            }}
            transition={{
              duration: 4,
              repeat: Infinity,
              delay: particle.delay,
              ease: "easeInOut",
            }}
          />
        ))}
      </div>

      {/* Header */}
      <div className="text-center space-y-4 relative z-10">
        <motion.h2
          className="text-xl md:text-2xl font-display tracking-wide flex items-center justify-center gap-3"
          animate={{ scale: [1, 1.02, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <Sparkles className="w-6 h-6 text-primary" />
          Generating AI Masterpieces
          <Sparkles className="w-6 h-6 text-primary" />
        </motion.h2>

        {/* Loading Message */}
        <AnimatePresence mode="wait">
          <motion.div
            key={messageIndex}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.5 }}
            className="text-lg text-muted-foreground flex items-center justify-center gap-2"
          >
            <Loader2 className="w-4 h-4 animate-spin" />
            {LOADING_MESSAGES[messageIndex]}
          </motion.div>
        </AnimatePresence>

        {/* Final countdown message */}
        <AnimatePresence>
          {isNearComplete && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="text-lg font-semibold text-primary flex items-center justify-center gap-2"
            >
              <Zap className="w-5 h-5" />
              Get ready to vote!
              <Zap className="w-5 h-5" />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Progress Bar */}
      <div className="space-y-2 relative z-10">
        <div className="flex justify-between items-center">
          <span className="text-sm font-medium">Generation Progress</span>
          <span className="text-sm text-muted-foreground font-mono">
            {Math.round(progress)}%
          </span>
        </div>
        <div className="h-3 bg-muted border-2 border-foreground rounded-none overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-primary to-primary-glow"
            style={{ width: `${progress}%` }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          />
        </div>
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Starting generation...</span>
          <span>{timeRemaining}s remaining</span>
        </div>
      </div>

      {/* Player Cards Grid */}
      <div className="space-y-4 relative z-10">
        <h3 className="text-lg font-medium text-center">
          Images for {players.length} players
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {players.map((player, index) => {
            const isCompleted = completedCards.has(index);
            return (
              <motion.div
                key={player.id}
                className="space-y-2"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.1 }}
              >
                {/* Card Placeholder */}
                <div className="relative">
                  <motion.div
                    className={`aspect-square border-2 border-foreground rounded-none overflow-hidden ${
                      isCompleted ? "bg-success/20" : "bg-muted"
                    }`}
                    animate={
                      isCompleted
                        ? { 
                            scale: [1, 1.05, 1],
                            borderColor: ["hsl(var(--foreground))", "hsl(var(--success))", "hsl(var(--foreground))"]
                          }
                        : { opacity: [0.6, 1, 0.6] }
                    }
                    transition={
                      isCompleted
                        ? { duration: 0.6, ease: "easeInOut" }
                        : { duration: 2, repeat: Infinity, ease: "easeInOut" }
                    }
                  >
                    {/* Loading animation */}
                    {!isCompleted && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <motion.div
                          className="w-8 h-8 border-2 border-foreground rounded-full border-t-transparent"
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        />
                      </div>
                    )}

                    {/* Completion effect */}
                    <AnimatePresence>
                      {isCompleted && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="absolute inset-0 flex items-center justify-center bg-success/20"
                        >
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: [0, 1.2, 1] }}
                            transition={{ delay: 0.2 }}
                            className="w-8 h-8 bg-success rounded-full flex items-center justify-center"
                          >
                            <span className="text-white text-lg">✓</span>
                          </motion.div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Scan line effect on individual cards */}
                    {!isCompleted && (
                      <motion.div
                        className="absolute w-full h-0.5 bg-primary/60"
                        animate={{
                          y: ["0%", "100%"],
                          opacity: [0, 1, 0],
                        }}
                        transition={{
                          duration: 2,
                          repeat: Infinity,
                          delay: index * 0.3,
                          ease: "linear",
                        }}
                      />
                    )}
                  </motion.div>
                </div>

                {/* Player Name */}
                <motion.div
                  className="text-center"
                  animate={isCompleted ? { color: "hsl(var(--success))" } : {}}
                >
                  <p className="text-sm font-medium truncate">{player.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {isCompleted ? "Ready!" : "Generating..."}
                  </p>
                </motion.div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Bottom status */}
      <div className="text-center space-y-2 relative z-10">
        <motion.div
          className="text-sm text-muted-foreground"
          animate={{ opacity: [0.7, 1, 0.7] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          AI is working its magic... Please wait
        </motion.div>
        <div className="flex justify-center items-center gap-2 text-xs">
          <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
          <span>Estimated time: {timeRemaining}s</span>
          <div className="w-2 h-2 bg-primary rounded-full animate-pulse" style={{ animationDelay: "0.5s" }} />
        </div>
      </div>
    </div>
  );
};

export default GeneratingPhase;