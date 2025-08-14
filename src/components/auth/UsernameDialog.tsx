import { useMemo, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/8bit/button";

interface Props {
  open: boolean;
  onSubmit: (username: string) => void;
}

const pattern = /^(?=.{3,20}$)[A-Za-z0-9 _-]+$/;

export default function UsernameDialog({ open, onSubmit }: Props) {
  const [name, setName] = useState("");
  const [touched, setTouched] = useState(false);

  const isValid = useMemo(() => pattern.test(name.trim()), [name]);
  const error = !isValid && touched ? "3–20 chars. Letters, numbers, spaces, - or _." : "";

  const handleSave = () => {
    setTouched(true);
    if (!isValid) return;
    onSubmit(name.trim());
  };

  return (
    <Dialog open={open} onOpenChange={() => { /* enforce open until saved */ }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Choose a display name</DialogTitle>
          <DialogDescription>Pick a name other players will see.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <Input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={() => setTouched(true)}
            placeholder="e.g. PixelHero"
            aria-label="Display name"
          />
          {error ? <p className="text-xs text-muted-foreground">{error}</p> : null}
          <div className="flex justify-end">
            <Button size="lg" onClick={handleSave} disabled={!isValid} aria-label="Save display name">
              Save
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
