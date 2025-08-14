import React, { useState, useRef, useEffect } from "react";
import { motion, PanInfo, AnimatePresence } from "framer-motion";
import { X, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  onSubmit?: (value: string) => void;
  content?: React.ReactNode;
  maxHeight?: string;
  className?: string;
}

const BottomSheet: React.FC<BottomSheetProps> = ({
  isOpen,
  onClose,
  title,
  onSubmit,
  content,
  maxHeight = "80vh",
  className,
}) => {
  const [prompt, setPrompt] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const sheetRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-focus textarea when opened
  useEffect(() => {
    if (isOpen && textareaRef.current) {
      setTimeout(() => {
        textareaRef.current?.focus();
      }, 300);
    }
  }, [isOpen]);

  const handleDragEnd = (event: any, info: PanInfo) => {
    const { offset, velocity } = info;
    const threshold = 100;
    const velocityThreshold = 500;

    if (offset.y > threshold || velocity.y > velocityThreshold) {
      onClose();
    }
  };

  const handleSubmit = () => {
    if (prompt.trim() && onSubmit) {
      onSubmit(prompt.trim());
      setPrompt("");
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-40"
            onClick={onClose}
          />

          {/* Bottom Sheet */}
          <motion.div
            ref={sheetRef}
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={0.1}
            onDragStart={() => setIsDragging(true)}
            onDragEnd={(e, info) => {
              setIsDragging(false);
              handleDragEnd(e, info);
            }}
            className={cn(
              "fixed bottom-0 left-0 right-0 z-50",
              "bg-background border-t border-border rounded-t-2xl",
              "shadow-2xl",
              className
            )}
            style={{ maxHeight }}
          >
            {/* Drag handle */}
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-12 h-1.5 bg-muted rounded-full" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h2 className="text-lg font-semibold">{title}</h2>
              <Button variant="ghost" size="icon" onClick={onClose}>
                <X className="h-5 w-5" />
              </Button>
            </div>

            {/* Content */}
            <div className="px-6 py-4 overflow-y-auto" style={{ maxHeight: "calc(80vh - 160px)" }}>
              {content ? (
                content
              ) : (
                <div className="space-y-4">
                  <Textarea
                    ref={textareaRef}
                    placeholder="Enter your creative prompt here..."
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    onKeyDown={handleKeyPress}
                    className="min-h-[120px] resize-none"
                    maxLength={500}
                  />
                  
                  {/* Character count */}
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Press Ctrl+Enter to submit</span>
                    <span>{prompt.length}/500</span>
                  </div>

                  {/* Quick suggestions */}
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Quick suggestions:</p>
                    <div className="flex flex-wrap gap-2">
                      {[
                        "A cat wearing a superhero cape",
                        "A robot making coffee",
                        "A dragon reading a book",
                        "A unicorn in a business suit",
                      ].map((suggestion) => (
                        <Button
                          key={suggestion}
                          variant="outline"
                          size="sm"
                          className="text-xs h-8"
                          onClick={() => setPrompt(suggestion)}
                        >
                          {suggestion}
                        </Button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Submit button (only for prompt input) */}
            {!content && (
              <div className="px-6 py-4 border-t border-border">
                <Button
                  onClick={handleSubmit}
                  disabled={!prompt.trim()}
                  className="w-full"
                  size="lg"
                >
                  <Send className="h-4 w-4 mr-2" />
                  Submit Prompt
                </Button>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default BottomSheet;