import { useState } from "react";
import { useMutation } from "convex/react";
import { Button } from "@/components/ui/8bit/button";
import { api } from "../../../../convex/_generated/api";
import { OnboardingStepProps } from "../OnboardingWizard";
import { Loader2, CheckCircle } from "lucide-react";

export function CompletionStep({ onNext, onBack, onError, data }: OnboardingStepProps) {
  const [loading, setLoading] = useState(false);
  const [completed, setCompleted] = useState(false);
  const completeOnboarding = useMutation(api.users.completeOnboarding);

  const username = data.username?.username || "";
  const displayName = data.display?.displayName || username;
  const avatarData = data.avatar?.avatarData;

  const handleComplete = async () => {
    if (!username) {
      onError("Username is required to complete onboarding");
      return;
    }

    setLoading(true);
    
    try {
      await completeOnboarding({
        username,
        displayName: displayName !== username ? displayName : undefined,
        avatarId: data.avatar?.avatarId, // This would be a storage ID in real implementation
      });

      setCompleted(true);
      
      // Give a moment to show success state, then complete
      setTimeout(() => {
        onNext();
      }, 1500);
      
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Failed to complete onboarding";
      onError(errorMessage);
      setLoading(false);
    }
  };

  if (completed) {
    return (
      <div className="space-y-6 text-center">
        {/* Success animation */}
        <div className="flex justify-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center animate-pulse">
            <CheckCircle className="w-10 h-10 text-green-600" />
          </div>
        </div>

        <div className="space-y-3">
          <h3 className="text-2xl font-bold text-green-700">Welcome aboard! 🎉</h3>
          <p className="text-muted-foreground">
            Your profile has been set up successfully. Let's start playing!
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h3 className="text-lg font-semibold">Ready to play!</h3>
        <p className="text-sm text-muted-foreground">
          Review your profile and complete setup
        </p>
      </div>

      {/* Profile summary */}
      <div className="bg-muted/30 rounded-lg p-4 space-y-3">
        {/* Username */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
            <span className="text-sm">@</span>
          </div>
          <div>
            <p className="font-medium">Username</p>
            <p className="text-sm text-muted-foreground font-mono">{username}</p>
          </div>
        </div>

        {/* Display name */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <div>
            <p className="font-medium">Display Name</p>
            <p className="text-sm text-muted-foreground">{displayName}</p>
          </div>
        </div>

        {/* Avatar */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
            {avatarData ? (
              <span className="text-sm">{avatarData.emoji}</span>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
            )}
          </div>
          <div>
            <p className="font-medium">Avatar</p>
            <p className="text-sm text-muted-foreground">
              {avatarData ? avatarData.name : "Default avatar"}
            </p>
          </div>
        </div>
      </div>

      {/* What's next */}
      <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
        <h4 className="font-medium text-primary mb-2">What's next?</h4>
        <ul className="text-sm text-muted-foreground space-y-1">
          <li>• Create or join game rooms</li>
          <li>• Play with friends and other players</li>
          <li>• Track your game statistics</li>
          <li>• Customize your profile anytime</li>
        </ul>
      </div>
      
      {/* Navigation buttons */}
      <div className="flex gap-3">
        <Button
          variant="outline"
          onClick={onBack}
          disabled={loading}
          className="flex-1"
        >
          Back
        </Button>
        <Button 
          onClick={handleComplete} 
          disabled={loading}
          className="flex-1"
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Completing...
            </>
          ) : (
            "Complete Setup"
          )}
        </Button>
      </div>
    </div>
  );
}