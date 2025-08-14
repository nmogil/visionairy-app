import { useCallback, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/8bit/button";
import { LogIn } from "lucide-react";
import UsernameDialog from "@/components/auth/UsernameDialog";
import useUser from "@/hooks/use-user";

export const JoinRoomForm = () => {
  const [code, setCode] = useState("");
  const [showNameModal, setShowNameModal] = useState(false);
  const { user, setUsername, ensureGuest } = useUser();

  const navigateToRoom = useCallback((roomCode: string) => {
    console.log("Joining room:", roomCode);
    window.location.href = `/room/${roomCode}`;
  }, []);

  const handleJoin = useCallback(() => {
    ensureGuest();
    if (!/^[A-Z]{6}$/.test(code)) {
      alert("Please enter a valid 6-letter code");
      return;
    }
    if (!user?.username) {
      setShowNameModal(true);
      return;
    }
    navigateToRoom(code);
  }, [code, ensureGuest, navigateToRoom, user?.username]);

  const handleNameSubmit = useCallback(
    (name: string) => {
      setUsername(name);
      setShowNameModal(false);
      navigateToRoom(code);
    },
    [code, navigateToRoom, setUsername]
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
        <Button type="submit" variant="outline" size="xl" aria-label="Join with code">
          <LogIn />
          Join
        </Button>
      </form>
      <UsernameDialog open={showNameModal} onSubmit={handleNameSubmit} />
    </>
  );
};

export default JoinRoomForm;
