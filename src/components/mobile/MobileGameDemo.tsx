import React, { useState } from "react";
import MobileGameControls from "./MobileGameControls";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useMobileDetection } from "@/hooks/useMobileDetection";

const MobileGameDemo: React.FC = () => {
  const [refreshCount, setRefreshCount] = useState(0);
  const [submittedPrompts, setSubmittedPrompts] = useState<string[]>([]);
  const [votes, setVotes] = useState<number[]>([]);
  
  const detection = useMobileDetection();

  const mockImages = [
    "https://via.placeholder.com/400x400/8B5CF6/FFFFFF?text=Image+1",
    "https://via.placeholder.com/400x400/F97316/FFFFFF?text=Image+2", 
    "https://via.placeholder.com/400x400/10B981/FFFFFF?text=Image+3",
    "https://via.placeholder.com/400x400/EF4444/FFFFFF?text=Image+4",
    "https://via.placeholder.com/400x400/3B82F6/FFFFFF?text=Image+5",
  ];

  const handleVote = (index: number) => {
    if (!votes.includes(index)) {
      setVotes([...votes, index]);
    }
  };

  const handleSubmitPrompt = (prompt: string) => {
    setSubmittedPrompts([...submittedPrompts, prompt]);
  };

  const handleRefresh = () => {
    setRefreshCount(count => count + 1);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile detection info */}
      <div className="p-4 space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Mobile Game Controls Demo</CardTitle>
            <CardDescription>
              Test touch-optimized controls with haptic feedback
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Device info */}
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-2">
                <Badge variant={detection.isMobile ? "default" : "secondary"}>
                  {detection.isMobile ? "📱 Mobile" : "💻 Desktop"}
                </Badge>
                <Badge variant={detection.isTouchDevice ? "default" : "secondary"}>
                  {detection.isTouchDevice ? "👆 Touch" : "🖱️ Mouse"}
                </Badge>
              </div>
              <div className="space-y-2">
                <Badge variant="outline">
                  📐 {detection.orientation}
                </Badge>
                <Badge variant="outline">
                  📏 {detection.screenSize}
                </Badge>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold">{refreshCount}</div>
                <div className="text-xs text-muted-foreground">Refreshes</div>
              </div>
              <div>
                <div className="text-2xl font-bold">{submittedPrompts.length}</div>
                <div className="text-xs text-muted-foreground">Prompts</div>
              </div>
              <div>
                <div className="text-2xl font-bold">{votes.length}</div>
                <div className="text-xs text-muted-foreground">Votes</div>
              </div>
            </div>

            {/* Recent prompts */}
            {submittedPrompts.length > 0 && (
              <div>
                <h4 className="font-semibold mb-2">Recent Prompts:</h4>
                <div className="space-y-1">
                  {submittedPrompts.slice(-3).map((prompt, index) => (
                    <div key={index} className="text-sm p-2 bg-muted rounded">
                      {prompt}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Mobile controls wrapper */}
      <MobileGameControls
        images={mockImages}
        onVote={handleVote}
        onSubmitPrompt={handleSubmitPrompt}
        onRefresh={handleRefresh}
        isHost={true}
      />
    </div>
  );
};

export default MobileGameDemo;