import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import Header from "@/components/layout/Header";
import { Button } from "@/components/ui/8bit/button";
import { Card } from "@/components/ui/8bit/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Copy, Share2, Crown, Loader2, Users } from "lucide-react";
import { toast } from "sonner";
import RoomSettings from "@/components/room/RoomSettings";
import UsernameDialog from "@/components/auth/UsernameDialog";
import useUser from "@/hooks/use-user";

// Types
interface Player {
  id: string;
  name: string;
  isHost: boolean;
  isConnected: boolean;
}

const Room = () => {
  const { code: codeParam } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const code = (codeParam || "").toUpperCase();

  // User (guest or signed-in)
  const { user, setUsername, ensureGuest } = useUser();
  useEffect(() => {
    ensureGuest();
  }, [ensureGuest]);
  const showUsernameDialog = !user?.username;

  // Mock Room + Current User
  const mockRoom = useMemo(
    () => ({
      code,
      hostId: "123",
      settings: { maxPlayers: 8, rounds: 10, timer: 30 },
      state: "waiting" as const,
    }),
    [code]
  );
  const currentUser = useMemo(() => ({ id: "123", name: "Player 1" }), []);
  const isHost = currentUser.id === mockRoom.hostId;

  // Loading state
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 1000);
    return () => clearTimeout(t);
  }, []);

  // Players state (mock)
  const initialPlayers: Player[] = [
    { id: "123", name: "Player 1", isHost: true, isConnected: true },
    { id: "456", name: "Player 2", isHost: false, isConnected: true },
    { id: "789", name: "Player 3", isHost: false, isConnected: true },
  ];
  const [players, setPlayers] = useState<Player[]>(initialPlayers);

  // Page metadata
  useEffect(() => {
    document.title = `Room ${code} — AI Image Party`;
    const meta = document.querySelector('meta[name="description"]');
    if (meta) {
      meta.setAttribute(
        "content",
        `Room ${code} lobby. Invite friends and start the AI Image Party game.`
      );
    }
  }, [code]);

  // Simulate players joining (every 5s) and connection status toggles (every 8s)
  useEffect(() => {
    if (loading) return;
    const joinInterval = setInterval(() => {
      setPlayers((prev) => {
        const cap = Math.min(5, mockRoom.settings.maxPlayers);
        if (prev.length >= cap) return prev;
        const nextNum = prev.length + 1;
        const newPlayer: Player = {
          id: Date.now().toString(),
          name: `Player ${nextNum}`,
          isHost: false,
          isConnected: true,
        };
        return [...prev, newPlayer];
      });
    }, 5000);

    const statusInterval = setInterval(() => {
      setPlayers((prev) => {
        if (prev.length === 0) return prev;
        const idx = Math.floor(Math.random() * prev.length);
        const next = [...prev];
        next[idx] = { ...next[idx], isConnected: !next[idx].isConnected };
        return next;
      });
    }, 8000);

    return () => {
      clearInterval(joinInterval);
      clearInterval(statusInterval);
    };
  }, [loading, mockRoom.settings.maxPlayers]);

  const isFull = players.length >= mockRoom.settings.maxPlayers;
  const validCodes = ["ABCDEF"]; // only this code exists in mock mode
  const notFound = !loading && code && !validCodes.includes(code);

  // Actions
  const handleCopyCode = async () => {
    await navigator.clipboard.writeText(code);
    toast.success("Room code copied!");
  };
  const handleShareLink = async () => {
    const url = `${window.location.origin}/room/${code}`;
    await navigator.clipboard.writeText(url);
    toast.success("Room link copied!");
  };
  const handleStartGame = () => {
    if (players.length < 3) {
      toast.error("Need at least 3 players to start");
      return;
    }
    window.location.href = "/play/room123"; // mock navigation
  };
  const handleLeave = () => navigate("/");

  const handleUsernameSaved = (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setUsername(trimmed);
    setPlayers((prev) => prev.map((p) => (p.id === currentUser.id ? { ...p, name: trimmed } : p)));
  };

  if (notFound) {
    return (
      <main className="container mx-auto min-h-screen px-4 py-16">
        <Helmet>
          <title>Room not found — AI Image Party</title>
          <meta name="description" content="The room you requested was not found." />
          <link rel="canonical" href={`${window.location.origin}/room/${code}`} />
        </Helmet>
        <Header />
        <div className="pt-16">
          <h1 className="font-display text-2xl">Room not found</h1>
          <p className="mt-2 text-muted-foreground">Please check the code or create a new room.</p>
          <div className="mt-6">
            <Button asChild variant="outline">
              <Link to="/">← Go to Homepage</Link>
            </Button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <>
      <Helmet>
        <title>Room {code} — AI Image Party</title>
        <meta
          name="description"
          content={`Room ${code} lobby. Invite friends and get ready to play AI Image Party.`}
        />
        <link rel="canonical" href={`${window.location.origin}/room/${code}`} />
      </Helmet>
      <Header />
      <main className="container mx-auto min-h-screen px-4 pt-16 pb-28">
        <h1 className="sr-only">Room Lobby {code}</h1>

        {/* Header Section */}
        <section className="flex flex-col gap-4 border-b border-border pb-6 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Room Code</p>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <span className="font-display text-3xl tracking-[0.2em] md:text-4xl">{code}</span>
              <Button variant="outline" size="sm" onClick={handleCopyCode} aria-label="Copy Code">
                <Copy size={16} /> Copy
              </Button>
              <Button variant="outline" size="sm" onClick={handleShareLink} aria-label="Share Link">
                <Share2 size={16} /> Share
              </Button>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Users className="h-4 w-4" />
            <span>
              {players.length}/{mockRoom.settings.maxPlayers} players
            </span>
          </div>
        </section>

        {isFull && (
          <div className="mt-4 rounded-none border-2 border-foreground bg-background p-3 text-sm" role="status">
            Room is full
          </div>
        )}

        {/* Players Section */}
        <section className="mt-6">
          <h2 className="font-display text-lg">Players</h2>
          {loading ? (
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Card key={i} className="p-4">
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="flex-1">
                      <Skeleton className="h-4 w-3/5" />
                      <div className="mt-2 flex gap-2">
                        <Skeleton className="h-4 w-16" />
                        <Skeleton className="h-4 w-10" />
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <>
              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                {players.map((p) => (
                  <Card key={p.id} className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <Avatar className="h-10 w-10">
                          <AvatarFallback className="bg-primary/10 text-foreground">
                            {p.name.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span
                          className={`absolute -bottom-1 -right-1 h-3 w-3 rounded-full border-2 border-background ${
                            p.isConnected ? "bg-primary" : "bg-muted-foreground"
                          }`}
                          aria-label={p.isConnected ? "connected" : "disconnected"}
                        />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="truncate">{p.name}</p>
                          {p.isHost && (
                            <Badge variant="secondary" className="inline-flex items-center gap-1">
                              <Crown className="h-3.5 w-3.5" /> Host
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {p.isConnected ? "Online" : "Reconnecting..."}
                        </p>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
              {players.length < 3 && (
                <p className="mt-3 text-sm text-muted-foreground">Waiting for players...</p>
              )}
            </>
          )}
        </section>

        {/* Settings Section */}
        <section className="mt-8">
          <h2 className="sr-only">Room Settings</h2>
          <RoomSettings className="mt-3" />
        </section>

        {/* Actions Section (desktop) */}
        <section className="mt-8 hidden md:block">
          {isHost ? (
            <div>
              <Button
                size="xl"
                onClick={handleStartGame}
                disabled={players.length < 3}
                variant="neon"
                aria-label="Start Game"
              >
                Start Game
              </Button>
              {players.length < 3 && (
                <p className="mt-2 text-sm text-muted-foreground">Need at least 3 players to start</p>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Waiting for host to start the game</span>
            </div>
          )}
          <div className="mt-6">
            <Button variant="outline" asChild aria-label="Leave Room">
              <Link to="/">Leave Room</Link>
            </Button>
          </div>
        </section>
      </main>

      {/* Mobile fixed action bar */}
      <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-background/90 backdrop-blur md:hidden">
        <div className="container mx-auto flex items-center gap-3 px-4 py-3">
          {isHost ? (
            <Button
              className="flex-1"
              size="lg"
              onClick={handleStartGame}
              disabled={players.length < 3}
              variant="neon"
              aria-label="Start Game"
            >
              Start Game
            </Button>
          ) : (
            <div className="flex flex-1 items-center justify-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Waiting for host...</span>
            </div>
          )}
          <Button variant="outline" size="lg" onClick={handleLeave} aria-label="Leave Room">
            Leave Room
          </Button>
        </div>
      </div>

      {/* Username Dialog - force open for guests without a name */}
      <UsernameDialog open={!!showUsernameDialog} onSubmit={handleUsernameSaved} />
    </>
  );
};

export default Room;
