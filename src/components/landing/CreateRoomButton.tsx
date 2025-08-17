import { useState, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/8bit/button";
import { Play } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuthActions } from "@convex-dev/auth/react";
import { useAuth } from "@/hooks/use-auth";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import UsernameDialog from "@/components/auth/UsernameDialog";

export const CreateRoomButton = () => {
  const { user, isAuthenticated, isLoading } = useAuth();
  const { signIn } = useAuthActions();
  const navigate = useNavigate();
  const updateUsername = useMutation(api.users.updateUsername);
  const [showNameModal, setShowNameModal] = useState(false);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [pendingRoomCreation, setPendingRoomCreation] = useState(false);

  const navigateToRoom = useCallback(() => {
    const code = "ABCDEF"; // fixed code for demo
    console.log("Creating room with code:", code);
    navigate(`/room/${code}`);
  }, [navigate]);

  // Handle post-sign-in logic
  useEffect(() => {
    if (pendingRoomCreation && isAuthenticated && !isLoading && user) {
      setPendingRoomCreation(false);
      
      // Check if user has a username
      if (!user.username) {
        console.log("User has no username, showing dialog");
        setShowNameModal(true);
      } else {
        console.log("User has username, navigating to room");
        navigateToRoom();
      }
    }
  }, [pendingRoomCreation, isAuthenticated, isLoading, user, navigateToRoom]);

  const handleCreateRoom = useCallback(async () => {
    // If not authenticated, sign in anonymously first
    if (!isAuthenticated && !isSigningIn) {
      setIsSigningIn(true);
      setPendingRoomCreation(true);
      try {
        await signIn("anonymous");
        console.log("Anonymous sign-in successful");
      } catch (error) {
        console.error("Anonymous sign-in failed:", error);
        setIsSigningIn(false);
        setPendingRoomCreation(false);
        return;
      }
      setIsSigningIn(false);
      return; // Let the useEffect handle the next step
    }
    
    // If already authenticated, check username immediately
    if (isAuthenticated && user && !user.username) {
      console.log("Already authenticated, user has no username, showing dialog");
      setShowNameModal(true);
      return;
    }
    
    // If authenticated and has username, navigate to room
    if (isAuthenticated && user?.username) {
      console.log("Already authenticated, user has username, navigating to room");
      navigateToRoom();
    }
  }, [isAuthenticated, isSigningIn, signIn, user, navigateToRoom]);

  const handleNameSubmit = useCallback(
    async (name: string) => {
      try {
        await updateUsername({ username: name });
        setShowNameModal(false);
        navigateToRoom();
      } catch (error) {
        console.error("Failed to update username:", error);
        // Dialog will show the error and remain open
      }
    },
    [updateUsername, navigateToRoom]
  );

  return (
    <>
      <Button 
        size="xl" 
        onClick={handleCreateRoom} 
        aria-label="Create Room" 
        className="hover-scale motion-reduce:transform-none"
        disabled={isLoading || isSigningIn}
      >
        <Play />
        {isLoading || isSigningIn ? "Loading..." : "Create Room"}
      </Button>
      <UsernameDialog open={showNameModal} onSubmit={handleNameSubmit} />
    </>
  );
};

export default CreateRoomButton;
