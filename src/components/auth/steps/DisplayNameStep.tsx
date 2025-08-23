import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/8bit/button";
import { OnboardingStepProps } from "../OnboardingWizard";
import { Label } from "@/components/ui/label";

export function DisplayNameStep({ onNext, onBack, data }: OnboardingStepProps) {
  const [displayName, setDisplayName] = useState(
    data.display?.displayName || data.username?.username || ""
  );
  const [touched, setTouched] = useState(false);

  const username = data.username?.username || "";

  const isValid = displayName.trim().length >= 1 && displayName.trim().length <= 50;
  const canContinue = isValid;

  const handleContinue = () => {
    if (!canContinue) return;
    
    onNext({
      displayName: displayName.trim()
    });
  };

  const handleUseSameAsUsername = () => {
    setDisplayName(username);
    setTouched(true);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && canContinue) {
      handleContinue();
    }
  };

  // Auto-focus on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      const input = document.querySelector('[data-display-name-input]') as HTMLInputElement;
      if (input) {
        input.focus();
      }
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h3 className="text-lg font-semibold">Choose your display name</h3>
        <p className="text-sm text-muted-foreground">
          This is the friendly name that appears in games
        </p>
      </div>

      {/* Current username reference */}
      <div className="bg-muted/30 rounded-lg p-3 text-center">
        <p className="text-sm text-muted-foreground">Your username: <span className="font-mono font-medium text-foreground">@{username}</span></p>
      </div>

      {/* Display name input */}
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="display-name">Display Name</Label>
          <Input
            id="display-name"
            data-display-name-input
            value={displayName}
            onChange={(e) => {
              setDisplayName(e.target.value);
              setTouched(true);
            }}
            onKeyDown={handleKeyDown}
            placeholder="e.g. Pixel Hero"
            aria-label="Display Name"
            className="text-center text-lg"
            maxLength={50}
          />
          
          {/* Character count */}
          <div className="flex justify-between items-center text-xs text-muted-foreground">
            <span>{displayName.length}/50 characters</span>
            {touched && !isValid && (
              <span className="text-red-500">
                {displayName.trim().length === 0 ? "Display name required" : "Too long"}
              </span>
            )}
          </div>
        </div>

        {/* Quick option */}
        {displayName !== username && (
          <div className="text-center">
            <button
              onClick={handleUseSameAsUsername}
              className="text-sm text-primary hover:underline"
            >
              Use same as username ({username})
            </button>
          </div>
        )}

        {/* Examples/Tips */}
        <div className="bg-muted/50 rounded-lg p-3">
          <p className="text-xs text-muted-foreground text-center mb-2">
            💡 Examples:
          </p>
          <div className="flex flex-wrap gap-2 justify-center">
            <span className="text-xs bg-background rounded px-2 py-1">The Artist</span>
            <span className="text-xs bg-background rounded px-2 py-1">Creative Mind</span>
            <span className="text-xs bg-background rounded px-2 py-1">Vision Master</span>
          </div>
        </div>
      </div>
      
      {/* Navigation buttons */}
      <div className="flex gap-3">
        <Button
          variant="outline"
          onClick={onBack}
          className="flex-1"
        >
          Back
        </Button>
        <Button 
          onClick={handleContinue} 
          disabled={!canContinue}
          className="flex-1"
        >
          Continue
        </Button>
      </div>
    </div>
  );
}