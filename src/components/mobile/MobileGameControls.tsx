import React, { useState, useEffect } from "react";
import { motion, PanInfo, AnimatePresence } from "framer-motion";
import { Haptics, ImpactStyle } from "@capacitor/haptics";
import { Button } from "@/components/ui/button";
import { Plus, Settings, Send, RefreshCw, Download, Maximize2 } from "lucide-react";
import { cn } from "@/lib/utils";
import SwipeableImageCarousel from "./SwipeableImageCarousel";
import BottomSheet from "./BottomSheet";
import PullToRefresh from "./PullToRefresh";
import GestureHints from "./GestureHints";
import PWAInstallPrompt from "./PWAInstallPrompt";
import FloatingActionButton from "./FloatingActionButton";

interface MobileGameControlsProps {
  images?: string[];
  onVote?: (index: number) => void;
  onSubmitPrompt?: (prompt: string) => void;
  onRefresh?: () => void;
  className?: string;
  isHost?: boolean;
  children?: React.ReactNode;
}

const MobileGameControls: React.FC<MobileGameControlsProps> = ({
  images = [],
  onVote,
  onSubmitPrompt,
  onRefresh,
  className,
  isHost = false,
  children,
}) => {
  const [showPromptSheet, setShowPromptSheet] = useState(false);
  const [showSettingsSheet, setShowSettingsSheet] = useState(false);
  const [showHints, setShowHints] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [orientation, setOrientation] = useState<"portrait" | "landscape">("portrait");

  // Check if first visit for gesture hints
  useEffect(() => {
    const hasSeenHints = localStorage.getItem("gesture-hints-seen");
    if (!hasSeenHints && window.innerWidth <= 768) {
      setShowHints(true);
    }
  }, []);

  // Monitor orientation changes
  useEffect(() => {
    const handleOrientationChange = () => {
      setOrientation(window.innerHeight > window.innerWidth ? "portrait" : "landscape");
    };

    window.addEventListener("resize", handleOrientationChange);
    handleOrientationChange();

    return () => window.removeEventListener("resize", handleOrientationChange);
  }, []);

  const triggerHaptic = async (style: ImpactStyle = ImpactStyle.Light) => {
    try {
      await Haptics.impact({ style });
    } catch (error) {
      // Fallback to vibration API
      if ("vibrate" in navigator) {
        const patterns = {
          [ImpactStyle.Light]: 50,
          [ImpactStyle.Medium]: 100,
          [ImpactStyle.Heavy]: 200,
        };
        navigator.vibrate(patterns[style]);
      }
    }
  };

  const handleVote = async (index: number) => {
    await triggerHaptic(ImpactStyle.Medium);
    onVote?.(index);
  };

  const handlePromptSubmit = async (prompt: string) => {
    await triggerHaptic(ImpactStyle.Light);
    onSubmitPrompt?.(prompt);
    setShowPromptSheet(false);
  };

  const handleRefresh = async () => {
    if (isRefreshing) return;
    
    setIsRefreshing(true);
    await triggerHaptic(ImpactStyle.Light);
    onRefresh?.();
    
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  const handleSettingsOpen = async () => {
    await triggerHaptic(ImpactStyle.Light);
    setShowSettingsSheet(true);
  };

  const primaryActions = [
    {
      icon: Send,
      label: "Submit Prompt",
      action: () => setShowPromptSheet(true),
      color: "bg-primary",
    },
    {
      icon: RefreshCw,
      label: "Refresh",
      action: handleRefresh,
      color: "bg-secondary",
      disabled: isRefreshing,
    },
  ];

  const secondaryActions = isHost ? [
    {
      icon: Settings,
      label: "Game Settings",
      action: handleSettingsOpen,
    },
    {
      icon: Plus,
      label: "Extend Time",
      action: () => triggerHaptic(ImpactStyle.Light),
    },
  ] : [
    {
      icon: Maximize2,
      label: "Fullscreen",
      action: () => {
        if (document.documentElement.requestFullscreen) {
          document.documentElement.requestFullscreen();
        }
      },
    },
  ];

  return (
    <div className={cn("relative min-h-screen", className)}>
      {/* Orientation suggestion */}
      {orientation === "landscape" && (
        <motion.div
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          className="fixed top-4 left-4 right-4 z-50 bg-accent text-accent-foreground p-3 rounded-lg text-center text-sm"
        >
          📱 Rotate to portrait mode for better experience
        </motion.div>
      )}

      {/* Pull to refresh */}
      <PullToRefresh onRefresh={handleRefresh} isRefreshing={isRefreshing}>
        {/* Main content */}
        <div className="pb-20">
          {children}
          
          {/* Swipeable image carousel for voting */}
          {images.length > 0 && (
            <div className="p-4">
              <SwipeableImageCarousel
                images={images}
                onVote={handleVote}
                onImageTap={(index) => triggerHaptic(ImpactStyle.Light)}
              />
            </div>
          )}
        </div>
      </PullToRefresh>

      {/* Floating Action Buttons */}
      <div className="fixed bottom-6 right-6 z-40">
        <FloatingActionButton
          primaryActions={primaryActions}
          secondaryActions={secondaryActions}
          onActionTrigger={triggerHaptic}
        />
      </div>

      {/* Bottom navigation bar for mobile */}
      <div className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-sm border-t border-border z-30">
        <div className="flex items-center justify-around p-3">
          <Button
            variant="ghost"
            size="sm"
            className="flex-col h-auto py-2 min-w-0 flex-1"
            onClick={() => triggerHaptic(ImpactStyle.Light)}
          >
            <RefreshCw className="h-4 w-4 mb-1" />
            <span className="text-xs">Refresh</span>
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            className="flex-col h-auto py-2 min-w-0 flex-1"
            onClick={() => setShowPromptSheet(true)}
          >
            <Send className="h-4 w-4 mb-1" />
            <span className="text-xs">Submit</span>
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            className="flex-col h-auto py-2 min-w-0 flex-1"
            onClick={handleSettingsOpen}
          >
            <Settings className="h-4 w-4 mb-1" />
            <span className="text-xs">Settings</span>
          </Button>
        </div>
      </div>

      {/* Bottom sheets */}
      <BottomSheet
        isOpen={showPromptSheet}
        onClose={() => setShowPromptSheet(false)}
        title="Submit Your Prompt"
        onSubmit={handlePromptSubmit}
      />

      <BottomSheet
        isOpen={showSettingsSheet}
        onClose={() => setShowSettingsSheet(false)}
        title="Game Settings"
        content={
          <div className="space-y-4">
            <div className="text-center text-muted-foreground">
              Game settings will be available soon
            </div>
          </div>
        }
      />

      {/* Gesture hints overlay */}
      <GestureHints
        isVisible={showHints}
        onComplete={() => {
          setShowHints(false);
          localStorage.setItem("gesture-hints-seen", "true");
        }}
      />

      {/* PWA install prompt */}
      <PWAInstallPrompt />
    </div>
  );
};

export default MobileGameControls;