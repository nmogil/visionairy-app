'use client'

import type React from "react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/8bit/card";
import { Label } from "@/components/ui/8bit/label";
import { Slider } from "@/components/ui/8bit/slider";
import { Button } from "@/components/ui/8bit/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { 
  Clock, 
  Users, 
  Repeat, 
  Zap, 
  ChevronDown, 
  Lock, 
  Unlock,
  RotateCcw,
  Save,
  Info,
  Sparkles,
  Settings
} from "lucide-react";

interface RoomSettings {
  timer: number;
  rounds: number;
  maxPlayers: number;
  aiModel: string;
  contentFilter: boolean;
  profanityFilter: boolean;
  votingTime: number;
  regenerationLimit: number;
}

interface Preset {
  name: string;
  settings: RoomSettings;
  description: string;
}

const presets: Preset[] = [
  {
    name: "Quick Game",
    description: "Fast-paced fun for busy gamers",
    settings: {
      timer: 30,
      rounds: 5,
      maxPlayers: 6,
      aiModel: "flux.schnell",
      contentFilter: true,
      profanityFilter: true,
      votingTime: 15,
      regenerationLimit: 1
    }
  },
  {
    name: "Standard",
    description: "Classic balanced gameplay",
    settings: {
      timer: 45,
      rounds: 10,
      maxPlayers: 8,
      aiModel: "flux.dev",
      contentFilter: true,
      profanityFilter: true,
      votingTime: 20,
      regenerationLimit: 2
    }
  },
  {
    name: "Marathon",
    description: "Extended epic gaming session",
    settings: {
      timer: 60,
      rounds: 20,
      maxPlayers: 12,
      aiModel: "flux.dev",
      contentFilter: false,
      profanityFilter: false,
      votingTime: 30,
      regenerationLimit: 3
    }
  }
];

const defaultSettings: RoomSettings = {
  timer: 45,
  rounds: 10,
  maxPlayers: 8,
  aiModel: "flux.dev",
  contentFilter: true,
  profanityFilter: true,
  votingTime: 20,
  regenerationLimit: 2
};

export default function RoomSettings({ 
  className, 
  isGameStarted = false,
  onSettingsChange,
  ...props 
}: React.ComponentProps<"div"> & {
  isGameStarted?: boolean;
  onSettingsChange?: (settings: RoomSettings) => void;
}) {
  const [settings, setSettings] = useState<RoomSettings>(defaultSettings);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [savedPresets, setSavedPresets] = useState<Preset[]>([]);

  const updateSetting = <K extends keyof RoomSettings>(key: K, value: RoomSettings[K]) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    onSettingsChange?.(newSettings);
  };

  const applyPreset = (preset: Preset) => {
    setSettings(preset.settings);
    onSettingsChange?.(preset.settings);
  };

  const resetToDefaults = () => {
    setSettings(defaultSettings);
    onSettingsChange?.(defaultSettings);
  };

  const saveCurrentPreset = () => {
    const name = prompt("Enter preset name:");
    if (name) {
      const newPreset: Preset = {
        name,
        description: "Custom preset",
        settings: { ...settings }
      };
      setSavedPresets([...savedPresets, newPreset]);
    }
  };


  const calculateEstimatedDuration = (): string => {
    const roundTime = settings.timer + settings.votingTime + 15; // +15s for results/transitions
    const totalMinutes = Math.ceil((settings.rounds * roundTime) / 60);
    
    if (totalMinutes < 60) {
      return `${totalMinutes} min`;
    } else {
      const hours = Math.floor(totalMinutes / 60);
      const minutes = totalMinutes % 60;
      return `${hours}h ${minutes}m`;
    }
  };

  return (
    <TooltipProvider>
      <div className={cn("flex flex-col gap-6", className)} {...props}>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <CardTitle className="text-sm font-medium">Room Settings</CardTitle>
              {isGameStarted && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="flex items-center gap-1"
                >
                  <Lock className="w-3 h-3 text-muted-foreground" />
                  <Badge variant="secondary" className="text-xs">Locked</Badge>
                </motion.div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">
                Est. {calculateEstimatedDuration()}
              </Badge>
            </div>
          </CardHeader>
          
          <CardContent className="space-y-6">
            {/* Preset Buttons */}
            <div className="space-y-3">
              <Label className="text-xs">Quick Presets</Label>
              <div className="grid grid-cols-3 gap-2">
                {presets.map((preset) => (
                  <Tooltip key={preset.name}>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => applyPreset(preset)}
                        disabled={isGameStarted}
                        className="h-auto p-2 flex flex-col gap-1"
                      >
                        <span className="text-xs font-medium">{preset.name}</span>
                        <span className="text-[10px] text-muted-foreground opacity-70">
                          {preset.settings.rounds}r • {preset.settings.timer}s
                        </span>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <div className="text-xs">
                        <div className="font-medium">{preset.name}</div>
                        <div className="text-muted-foreground">{preset.description}</div>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                ))}
              </div>
            </div>

            {/* Basic Settings */}
            <div className="space-y-4">
              {/* Timer Setting */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-primary" />
                  <Label htmlFor="timer" className="text-xs">
                    Round Timer
                  </Label>
                  <Tooltip>
                    <TooltipTrigger>
                      <Info className="w-3 h-3 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="text-xs">Time players have to write prompts</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <Slider
                  id="timer"
                  value={[settings.timer]}
                  min={15}
                  max={120}
                  step={15}
                  className="w-full"
                  onValueChange={(value) => updateSetting('timer', value[0])}
                  disabled={isGameStarted}
                />
                <motion.div 
                  key={settings.timer}
                  initial={{ scale: 1.1, color: "hsl(var(--primary))" }}
                  animate={{ scale: 1, color: "hsl(var(--muted-foreground))" }}
                  className="text-xs font-medium"
                >
                  {settings.timer}s per round
                </motion.div>
              </div>

              {/* Rounds Setting */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Repeat className="w-4 h-4 text-primary" />
                  <Label htmlFor="rounds" className="text-xs">
                    Total Rounds
                  </Label>
                  <Tooltip>
                    <TooltipTrigger>
                      <Info className="w-3 h-3 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="text-xs">Number of rounds in the game</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <Slider
                  id="rounds"
                  value={[settings.rounds]}
                  min={1}
                  max={30}
                  step={1}
                  className="w-full"
                  onValueChange={(value) => updateSetting('rounds', value[0])}
                  disabled={isGameStarted}
                />
                <motion.div 
                  key={settings.rounds}
                  initial={{ scale: 1.1, color: "hsl(var(--primary))" }}
                  animate={{ scale: 1, color: "hsl(var(--muted-foreground))" }}
                  className="text-xs font-medium"
                >
                  {settings.rounds} rounds
                </motion.div>
              </div>

              {/* Max Players Setting */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-primary" />
                  <Label htmlFor="maxPlayers" className="text-xs">
                    Max Players
                  </Label>
                  <Tooltip>
                    <TooltipTrigger>
                      <Info className="w-3 h-3 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="text-xs">Maximum number of players allowed</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <Slider
                  id="maxPlayers"
                  value={[settings.maxPlayers]}
                  min={2}
                  max={16}
                  step={1}
                  className="w-full"
                  onValueChange={(value) => updateSetting('maxPlayers', value[0])}
                  disabled={isGameStarted}
                />
                <motion.div 
                  key={settings.maxPlayers}
                  initial={{ scale: 1.1, color: "hsl(var(--primary))" }}
                  animate={{ scale: 1, color: "hsl(var(--muted-foreground))" }}
                  className="text-xs font-medium"
                >
                  {settings.maxPlayers} players max
                </motion.div>
              </div>
            </div>

            {/* Advanced Settings */}
            <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="w-full justify-between">
                  <div className="flex items-center gap-2">
                    <Settings className="w-4 h-4" />
                    <span className="text-xs">Advanced Settings</span>
                  </div>
                  <motion.div
                    animate={{ rotate: showAdvanced ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <ChevronDown className="w-4 h-4" />
                  </motion.div>
                </Button>
              </CollapsibleTrigger>
              
              <CollapsibleContent className="space-y-4 pt-4">
                {/* AI Model Selection */}
                <div className="space-y-2">
                  <Label className="text-xs">AI Image Model</Label>
                  <Select
                    value={settings.aiModel}
                    onValueChange={(value) => updateSetting('aiModel', value)}
                    disabled={isGameStarted}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="flux.schnell">
                        <div className="flex items-center gap-2">
                          <Zap className="w-3 h-3" />
                          <span>Flux Schnell (Fast)</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="flux.dev">
                        <div className="flex items-center gap-2">
                          <Sparkles className="w-3 h-3" />
                          <span>Flux Dev (Quality)</span>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Voting Time */}
                <div className="space-y-2">
                  <Label className="text-xs">Voting Time Limit</Label>
                  <Slider
                    value={[settings.votingTime]}
                    min={10}
                    max={60}
                    step={5}
                    onValueChange={(value) => updateSetting('votingTime', value[0])}
                    disabled={isGameStarted}
                  />
                  <div className="text-xs text-muted-foreground">
                    {settings.votingTime}s to vote
                  </div>
                </div>

                {/* Regeneration Limit */}
                <div className="space-y-2">
                  <Label className="text-xs">Image Regeneration Limit</Label>
                  <Slider
                    value={[settings.regenerationLimit]}
                    min={0}
                    max={5}
                    step={1}
                    onValueChange={(value) => updateSetting('regenerationLimit', value[0])}
                    disabled={isGameStarted}
                  />
                  <div className="text-xs text-muted-foreground">
                    {settings.regenerationLimit} regens per round
                  </div>
                </div>

                {/* Content Filters */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs">Content Filter</Label>
                    <Switch
                      checked={settings.contentFilter}
                      onCheckedChange={(checked) => updateSetting('contentFilter', checked)}
                      disabled={isGameStarted}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label className="text-xs">Profanity Filter</Label>
                    <Switch
                      checked={settings.profanityFilter}
                      onCheckedChange={(checked) => updateSetting('profanityFilter', checked)}
                      disabled={isGameStarted}
                    />
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-2 pt-2 border-t border-border">
              <Button
                variant="outline"
                size="sm"
                onClick={resetToDefaults}
                disabled={isGameStarted}
                className="flex items-center gap-1"
              >
                <RotateCcw className="w-3 h-3" />
                <span className="text-xs">Reset</span>
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={saveCurrentPreset}
                disabled={isGameStarted}
                className="flex items-center gap-1"
              >
                <Save className="w-3 h-3" />
                <span className="text-xs">Save Preset</span>
              </Button>
              
            </div>

            {/* Saved Presets */}
            <AnimatePresence>
              {savedPresets.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-2"
                >
                  <Label className="text-xs">Custom Presets</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {savedPresets.map((preset, index) => (
                      <Button
                        key={index}
                        variant="outline"
                        size="sm"
                        onClick={() => applyPreset(preset)}
                        disabled={isGameStarted}
                        className="h-auto p-2 text-xs"
                      >
                        {preset.name}
                      </Button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </CardContent>
        </Card>
      </div>
    </TooltipProvider>
  );
}
