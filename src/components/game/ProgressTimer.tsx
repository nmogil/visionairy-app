import { Progress } from "../ui/progress";
import { Card } from "../ui/card";
import { Loader2, CheckCircle } from "lucide-react";

interface ProgressTimerProps {
  expectedCount: number;
  completedCount: number;
  maxTimeSeconds: number;
  timeRemaining: number;
}

export function ProgressTimer({
  expectedCount,
  completedCount,
  maxTimeSeconds,
  timeRemaining
}: ProgressTimerProps) {
  const percentage = expectedCount > 0
    ? (completedCount / expectedCount) * 100
    : 0;

  const isComplete = completedCount >= expectedCount && expectedCount > 0;

  return (
    <Card className={`p-4 ${isComplete ? "border-green-500" : ""}`}>
      <div className="text-center space-y-2">
        {/* Progress Status */}
        <div className="flex items-center justify-center gap-2">
          {isComplete ? (
            <>
              <CheckCircle className="w-5 h-5 text-green-500" />
              <span className="text-lg font-semibold text-green-500">
                Images Ready!
              </span>
            </>
          ) : (
            <>
              <Loader2 className="w-5 h-5 animate-spin text-primary" />
              <span className="text-lg font-semibold">
                Generating {completedCount}/{expectedCount} images...
              </span>
            </>
          )}
        </div>

        {/* Progress Bar */}
        <Progress
          value={percentage}
          className={`h-3 ${isComplete ? "bg-green-100" : ""}`}
        />

        {/* Fallback Timer (small, de-emphasized) */}
        <div className="text-xs text-muted-foreground">
          {!isComplete && `Max time: ${Math.floor(timeRemaining / 60)}:${(timeRemaining % 60).toString().padStart(2, "0")}`}
          {isComplete && "Moving to voting phase..."}
        </div>
      </div>
    </Card>
  );
}