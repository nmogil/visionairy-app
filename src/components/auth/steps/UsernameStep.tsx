import { useState, useMemo, useEffect } from "react";
import { useQuery } from "convex/react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/8bit/button";
import { api } from "../../../../convex/_generated/api";
import { OnboardingStepProps } from "../OnboardingWizard";
import { Loader2 } from "lucide-react";

const pattern = /^[a-zA-Z0-9_]+$/;

export function UsernameStep({ onNext, onBack, onError, data, isFirst }: OnboardingStepProps) {
  const [username, setUsername] = useState(data.username?.username || "");
  const [touched, setTouched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  // Check username availability with debounced query
  const isUsernameAvailable = useQuery(
    api.users.checkUsernameAvailable,
    username.length >= 3 ? { username: username.trim() } : "skip"
  );

  const isValidFormat = useMemo(() => {
    const trimmed = username.trim();
    return trimmed.length >= 3 && trimmed.length <= 20 && pattern.test(trimmed);
  }, [username]);

  const getValidationError = () => {
    if (!touched) return null;
    if (!isValidFormat) {
      return "3-20 characters. Only letters, numbers, and underscores allowed.";
    }
    if (isUsernameAvailable === false) {
      return "Username already taken.";
    }
    return null;
  };

  const canContinue = isValidFormat && isUsernameAvailable === true && !loading;

  const handleContinue = async () => {
    setTouched(true);
    if (!canContinue) return;
    
    setLoading(true);
    
    try {
      // Store username data for next steps
      onNext({
        username: username.trim()
      });
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Failed to save username";
      
      // If authentication error, allow retry
      if (errorMessage.includes("Authentication required")) {
        setRetryCount(prev => prev + 1);
        if (retryCount < 3) {
          onError(`${errorMessage} (Attempt ${retryCount + 1}/3)`);
        } else {
          onError("Multiple authentication failures. Please refresh the page and try again.");
        }
      } else {
        onError(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRetry = () => {
    onError(""); // Clear error
    handleContinue();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && canContinue) {
      handleContinue();
    }
  };

  // Auto-focus on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      const input = document.querySelector('[data-username-input]') as HTMLInputElement;
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
        <h3 className="text-lg font-semibold">Choose your username</h3>
        <p className="text-sm text-muted-foreground">
          This is how other players will see you in games
        </p>
      </div>

      {/* Username input */}
      <div className="space-y-4">
        <div className="space-y-2">
          <Input
            data-username-input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            onBlur={() => setTouched(true)}
            onKeyDown={handleKeyDown}
            placeholder="e.g. pixel_hero"
            aria-label="Username"
            disabled={loading}
            className="text-center text-lg"
          />
          
          {/* Status indicators */}
          {username.length >= 3 && isValidFormat && (
            <div className="flex items-center justify-center gap-2 text-sm">
              {isUsernameAvailable === undefined ? (
                <>
                  <Loader2 className="h-3 w-3 animate-spin" />
                  <span className="text-muted-foreground">Checking availability...</span>
                </>
              ) : isUsernameAvailable ? (
                <span className="text-green-600">✓ Username available</span>
              ) : (
                <span className="text-red-500">✗ Username taken</span>
              )}
            </div>
          )}
          
          {/* Validation error */}
          {getValidationError() && (
            <p className="text-sm text-red-500 text-center">{getValidationError()}</p>
          )}
        </div>

        {/* Tips */}
        <div className="bg-muted/50 rounded-lg p-3">
          <p className="text-xs text-muted-foreground text-center">
            💡 Tips: Keep it memorable, avoid personal info, and make it fun!
          </p>
        </div>
      </div>
      
      {/* Navigation buttons */}
      <div className="flex gap-3">
        {!isFirst && (
          <Button
            variant="outline"
            onClick={onBack}
            disabled={loading}
            className="flex-1"
          >
            Back
          </Button>
        )}
        <Button 
          onClick={handleContinue} 
          disabled={!canContinue}
          className="flex-1"
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            "Continue"
          )}
        </Button>
      </div>

      {/* Retry option for authentication errors */}
      {retryCount > 0 && retryCount < 3 && (
        <div className="text-center">
          <button
            onClick={handleRetry}
            className="text-sm text-primary hover:underline"
          >
            Try again
          </button>
        </div>
      )}
    </div>
  );
}