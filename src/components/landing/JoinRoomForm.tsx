import { useCallback, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/8bit/button";
import { LogIn } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuthActions } from "@convex-dev/auth/react";
import { useAuth } from "@/hooks/use-auth";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import UsernameDialog from "@/components/auth/UsernameDialog";

export const JoinRoomForm = () => {
  const [code, setCode] = useState("");
  const [showNameModal, setShowNameModal] = useState(false);
  const { user, isAuthenticated, isLoading } = useAuth();
  const { signIn } = useAuthActions();
  const navigate = useNavigate();
  const updateUsername = useMutation(api.users.updateUsername);
  const [isSigningIn, setIsSigningIn] = useState(false);

  const navigateToRoom = useCallback((roomCode: string) => {
    console.log("Joining room:", roomCode);
    navigate(`/room/${roomCode}`);
  }, [navigate]);

  const handleJoin = useCallback(async () => {
    if (!/^[A-Z]{6}$/.test(code)) {
      alert("Please enter a valid 6-letter code");
      return;
    }
    
    // If not authenticated, sign in anonymously first
    if (!isAuthenticated && !isSigningIn) {
      setIsSigningIn(true);
      try {
        await signIn("anonymous");
        console.log("Anonymous sign-in successful");
      } catch (error) {
        console.error("Anonymous sign-in failed:", error);
        setIsSigningIn(false);
        return;
      }
      setIsSigningIn(false);
    }
    
    // Check if user has a username, if not show dialog
    if (isAuthenticated && user && !user.username) {
      setShowNameModal(true);
      return;
    }
    
    // If authenticated and has username, navigate to room
    if (isAuthenticated && user?.username) {
      navigateToRoom(code);
    }
  }, [code, isAuthenticated, isSigningIn, signIn, user, navigateToRoom]);

  const handleNameSubmit = useCallback(
    async (name: string) => {
      try {
        await updateUsername({ username: name });
        setShowNameModal(false);
        navigateToRoom(code);
      } catch (error) {
        console.error("Failed to update username:", error);
        // Dialog will show the error and remain open
      }
    },
    [code, updateUsername, navigateToRoom]
  );

  return (
    <>
      <form
        className="flex w-full items-center gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          handleJoin();
        }}
      >
        <Input
          aria-label="Room code"
          placeholder="ROOM CODE"
          value={code}
          maxLength={6}
          onChange={(e) => {
            const next = e.target.value.toUpperCase().replace(/[^A-Z]/g, "").slice(0, 6);
            setCode(next);
          }}
          className="flex-1 min-w-0 px-2 sm:px-3 h-12 text-center tracking-[0.1em] uppercase md:h-12 [&::placeholder]:whitespace-nowrap [&::placeholder]:tracking-tighter [&::placeholder]:normal-case [&::placeholder]:text-[9px] sm:[&::placeholder]:text-xs md:[&::placeholder]:text-sm"
        />
        <Button 
          type="submit" 
          variant="outline" 
          size="xl" 
          aria-label="Join with code"
          disabled={isLoading || isSigningIn}
        >
          <LogIn />
          {isLoading || isSigningIn ? "Loading..." : "Join"}
        </Button>
      </form>
      <UsernameDialog open={showNameModal} onSubmit={handleNameSubmit} />
    </>
  );
};

export default JoinRoomForm;
