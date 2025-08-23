import { useMemo, useState, useEffect } from "react";
import { useMutation, useQuery } from "convex/react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/8bit/button";
import { api } from "../../../convex/_generated/api";
import { Loader2 } from "lucide-react";

interface Props {
  open: boolean;
  onSubmit?: (username: string) => void;
  onClose?: () => void;
}

const pattern = /^[a-zA-Z0-9_]+$/;

export default function UsernameDialog({ open, onSubmit, onClose }: Props) {
  const [username, setUsername] = useState("");
  const [touched, setTouched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateUsername = useMutation(api.users.updateUsername);
  
  // Check username availability with debounced query
  const isUsernameAvailable = useQuery(
    api.users.checkUsernameAvailable,
    username.length >= 3 ? { username: username.trim() } : "skip"
  );

  const isValidFormat = useMemo(() => {
    const trimmed = username.trim();
    return trimmed.length >= 3 && trimmed.length <= 20 && pattern.test(trimmed);
  }, [username]);

  const getError = () => {
    if (!touched) return null;
    if (!isValidFormat) {
      return "3-20 characters. Only letters, numbers, and underscores allowed.";
    }
    if (isUsernameAvailable === false) {
      return "Username already taken.";
    }
    return error;
  };

  const canSubmit = isValidFormat && isUsernameAvailable === true && !loading;

  const handleSave = async () => {
    setTouched(true);
    if (!canSubmit) return;
    
    setLoading(true);
    setError(null);
    
    try {
      if (onSubmit) {
        // Landing page flow - use the provided callback
        onSubmit(username.trim());
      } else {
        // Protected route flow - use enhanced Convex mutation with better error handling
        await updateUsername({ username: username.trim() });
        // Dialog will close automatically when user data updates
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Failed to update username";
      // Enhanced error handling for authentication context issues
      if (errorMessage.includes("Authentication required")) {
        setError(`${errorMessage} Please try again or refresh the page.`);
      } else {
        setError(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && canSubmit) {
      handleSave();
    }
  };

  const handleOpenChange = (open: boolean) => {
    // Only allow closing if onClose callback is provided
    if (!open && onClose) {
      onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Choose a username</DialogTitle>
          <DialogDescription>Pick a unique username other players will see.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Input
              autoFocus
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              onBlur={() => setTouched(true)}
              onKeyDown={handleKeyDown}
              placeholder="e.g. pixel_hero"
              aria-label="Username"
              disabled={loading}
            />
            
            {/* Status indicators */}
            {username.length >= 3 && isValidFormat && (
              <div className="flex items-center gap-2 text-sm">
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
            
            {/* Error messages */}
            {getError() && (
              <p className="text-sm text-red-500">{getError()}</p>
            )}
          </div>
          
          <div className="flex justify-end">
            <Button 
              size="lg" 
              onClick={handleSave} 
              disabled={!canSubmit}
              aria-label="Save username"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
