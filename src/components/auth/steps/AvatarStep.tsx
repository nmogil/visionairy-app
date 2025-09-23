import { useState } from "react";
import { Button } from "@/components/ui/8bit/button";
import { OnboardingStepProps } from "../OnboardingWizard";

// Default avatar options (could be expanded to use actual file storage)
const defaultAvatars = [
  { id: "pixel-1", name: "Pixel Hero", emoji: "🦸", color: "bg-blue-100" },
  { id: "pixel-2", name: "Digital Artist", emoji: "🎨", color: "bg-purple-100" },
  { id: "pixel-3", name: "Game Master", emoji: "🎮", color: "bg-green-100" },
  { id: "pixel-4", name: "Creative Mind", emoji: "🧠", color: "bg-yellow-100" },
  { id: "pixel-5", name: "Vision Seeker", emoji: "👁️", color: "bg-red-100" },
  { id: "pixel-6", name: "Dream Weaver", emoji: "✨", color: "bg-pink-100" },
  { id: "pixel-7", name: "Code Wizard", emoji: "🧙", color: "bg-indigo-100" },
  { id: "pixel-8", name: "Art Explorer", emoji: "🚀", color: "bg-orange-100" },
];

export function AvatarStep({ onNext, onBack, data }: OnboardingStepProps) {
  const [selectedAvatar, setSelectedAvatar] = useState<string | null>(
    data.avatar?.avatarId || null
  );

  const handleContinue = () => {
    onNext({
      avatarId: selectedAvatar, // String-based avatar ID (matches schema)
      avatarData: selectedAvatar ? defaultAvatars.find(a => a.id === selectedAvatar) : null
    });
  };

  const handleSkip = () => {
    onNext({
      avatarId: null,
      avatarData: null
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h3 className="text-lg font-semibold">Choose your avatar</h3>
        <p className="text-sm text-muted-foreground">
          Pick a visual identity that represents you
        </p>
      </div>

      {/* Avatar grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 sm:gap-3">
        {defaultAvatars.map((avatar) => (
          <button
            key={avatar.id}
            onClick={() => setSelectedAvatar(avatar.id)}
            className={`
              aspect-square rounded-lg border-2 transition-all duration-200 p-2 sm:p-3
              flex flex-col items-center justify-center gap-1 hover:scale-105
              min-h-[4rem] sm:min-h-[5rem]
              ${avatar.color}
              ${selectedAvatar === avatar.id
                ? 'border-primary ring-2 ring-primary/20 scale-105'
                : 'border-border hover:border-primary/50'
              }
            `}
          >
            <span className="text-lg sm:text-xl md:text-2xl">{avatar.emoji}</span>
            <span className="text-[0.6rem] sm:text-xs font-medium text-center leading-tight">
              {avatar.name.split(' ').map(word => word.slice(0, 4)).join(' ')}
            </span>
          </button>
        ))}
      </div>

      {/* Selected avatar preview */}
      {selectedAvatar && (
        <div className="text-center p-3 sm:p-4 bg-muted/30 rounded-lg">
          <div className="flex items-center justify-center gap-2 sm:gap-3">
            <div className={`
              w-10 h-10 sm:w-12 sm:h-12 rounded-lg flex items-center justify-center
              ${defaultAvatars.find(a => a.id === selectedAvatar)?.color}
            `}>
              <span className="text-lg sm:text-2xl">
                {defaultAvatars.find(a => a.id === selectedAvatar)?.emoji}
              </span>
            </div>
            <div className="text-left">
              <p className="text-sm sm:text-base font-medium">
                {defaultAvatars.find(a => a.id === selectedAvatar)?.name}
              </p>
              <p className="text-xs sm:text-sm text-muted-foreground">Selected avatar</p>
            </div>
          </div>
        </div>
      )}

      {/* Upload option placeholder */}
      <div className="border-2 border-dashed border-border rounded-lg p-3 sm:p-4 text-center">
        <svg
          className="w-6 h-6 sm:w-8 sm:h-8 text-muted-foreground mx-auto mb-2"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
          />
        </svg>
        <p className="text-xs sm:text-sm text-muted-foreground">
          Custom avatar upload coming soon!
        </p>
      </div>
      
      {/* Navigation buttons */}
      <div className="flex gap-2 sm:gap-3">
        <Button
          variant="outline"
          onClick={onBack}
          className="flex-1"
        >
          Back
        </Button>
        <Button
          variant="outline"
          onClick={handleSkip}
          className="flex-1"
        >
          Skip
        </Button>
        <Button 
          onClick={handleContinue} 
          className="flex-1"
          disabled={!selectedAvatar}
        >
          Continue
        </Button>
      </div>
    </div>
  );
}