import { useState } from "react";
import { Id } from "../../../convex/_generated/dataModel";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { Label } from "../ui/label";
import { Input } from "../ui/input";
import { Button } from "../ui/8bit/button";
import { Switch } from "../ui/switch";
import { Slider } from "../ui/8bit/slider";

interface RoomSettingsDialogProps {
  roomId: Id<"rooms">;
  currentSettings: {
    maxPlayers: number;
    roundsPerGame: number;
    timePerRound: number;
    isPrivate: boolean;
  };
  onClose: () => void;
  onSave: (settings: {
    maxPlayers?: number;
    roundsPerGame?: number;
    timePerRound?: number;
    isPrivate?: boolean;
  }) => Promise<void>;
}

export function RoomSettingsDialog({ 
  currentSettings, 
  onClose, 
  onSave 
}: RoomSettingsDialogProps) {
  const [settings, setSettings] = useState(currentSettings);
  const [saving, setSaving] = useState(false);
  
  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(settings);
      onClose();
    } catch (error) {
      console.error("Failed to save settings:", error);
    } finally {
      setSaving(false);
    }
  };
  
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Room Settings</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Max Players */}
          <div className="space-y-3">
            <Label htmlFor="maxPlayers">Max Players (2-12)</Label>
            <Slider
              id="maxPlayers"
              value={[settings.maxPlayers]}
              min={2}
              max={12}
              step={1}
              onValueChange={(value) => setSettings({
                ...settings,
                maxPlayers: value[0]
              })}
            />
            <div className="text-sm text-muted-foreground">
              {settings.maxPlayers} players maximum
            </div>
          </div>
          
          {/* Rounds */}
          <div className="space-y-3">
            <Label htmlFor="rounds">Total Rounds (1-20)</Label>
            <Slider
              id="rounds"
              value={[settings.roundsPerGame]}
              min={1}
              max={20}
              step={1}
              onValueChange={(value) => setSettings({
                ...settings,
                roundsPerGame: value[0]
              })}
            />
            <div className="text-sm text-muted-foreground">
              {settings.roundsPerGame} rounds total
            </div>
          </div>
          
          {/* Time per Round */}
          <div className="space-y-3">
            <Label htmlFor="timePerRound">Time per Round (30-300 seconds)</Label>
            <Slider
              id="timePerRound"
              value={[settings.timePerRound]}
              min={30}
              max={300}
              step={15}
              onValueChange={(value) => setSettings({
                ...settings,
                timePerRound: value[0]
              })}
            />
            <div className="text-sm text-muted-foreground">
              {settings.timePerRound} seconds per round
            </div>
          </div>
          
          {/* Private Room */}
          <div className="flex items-center justify-between">
            <Label htmlFor="isPrivate">Private Room</Label>
            <Switch
              id="isPrivate"
              checked={settings.isPrivate}
              onCheckedChange={(checked) => setSettings({
                ...settings,
                isPrivate: checked
              })}
            />
          </div>
          
          <div className="flex gap-2 pt-4">
            <Button 
              onClick={handleSave} 
              className="flex-1"
              disabled={saving}
            >
              {saving ? "Saving..." : "Save Settings"}
            </Button>
            <Button 
              variant="outline" 
              onClick={onClose} 
              className="flex-1"
              disabled={saving}
            >
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default RoomSettingsDialog;