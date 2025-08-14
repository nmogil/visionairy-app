import { useState, useCallback } from "react";
import { Button } from "@/components/ui/8bit/button";
import { Play } from "lucide-react";
import UsernameDialog from "@/components/auth/UsernameDialog";
import useUser from "@/hooks/use-user";

export const CreateRoomButton = () => {
  const { user, setUsername, ensureGuest } = useUser();
  const [showNameModal, setShowNameModal] = useState(false);

  const navigateToRoom = useCallback(() => {
    const code = "ABCDEF"; // fixed code for demo
    console.log("Creating room with code:", code);
    window.location.href = `/room/${code}`;
  }, []);

  const handleCreateRoom = useCallback(() => {
    ensureGuest();
    if (!user?.username) {
      setShowNameModal(true);
      return;
    }
    navigateToRoom();
  }, [ensureGuest, navigateToRoom, user?.username]);

  const handleNameSubmit = useCallback(
    (name: string) => {
      setUsername(name);
      setShowNameModal(false);
      navigateToRoom();
    },
    [navigateToRoom, setUsername]
  );

  return (
    <>
      <Button size="xl" onClick={handleCreateRoom} aria-label="Create Room" className="hover-scale motion-reduce:transform-none">
        <Play />
        Create Room
      </Button>
      <UsernameDialog open={showNameModal} onSubmit={handleNameSubmit} />
    </>
  );
};

export default CreateRoomButton;
