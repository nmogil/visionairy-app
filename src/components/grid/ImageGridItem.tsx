import React from "react";
import { motion } from "framer-motion";
import { Check, MoreVertical, Heart, Share, Download } from "lucide-react";
import { ImageItem } from "@/types/imageGrid";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

interface ImageGridItemProps {
  image: ImageItem;
  isSelected: boolean;
  onImageClick: (image: ImageItem) => void;
  onSelectionToggle: (image: ImageItem) => void;
  aspectRatio: string;
  isDragging?: boolean;
}

const ImageGridItem: React.FC<ImageGridItemProps> = ({
  image,
  isSelected,
  onImageClick,
  onSelectionToggle,
  aspectRatio,
  isDragging = false,
}) => {
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onImageClick(image);
  };

  const handleSelectionClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelectionToggle(image);
  };

  const getAspectRatioClass = () => {
    if (aspectRatio === "auto") return "";
    
    switch (aspectRatio) {
      case "square":
        return "aspect-square";
      case "landscape":
        return "aspect-[4/3]";
      case "portrait":
        return "aspect-[3/4]";
      default:
        return "";
    }
  };

  return (
    <motion.div
      layout
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className={cn(
        "group relative bg-card rounded-lg overflow-hidden border shadow-sm cursor-pointer",
        "transition-all duration-200",
        isSelected && "ring-2 ring-primary ring-offset-2",
        isDragging && "opacity-50 scale-95"
      )}
      onClick={handleClick}
    >
      {/* Image */}
      <div className={cn("relative overflow-hidden", getAspectRatioClass())}>
        <img
          src={image.src}
          alt={image.title}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          loading="lazy"
        />
        
        {/* Hover overlay */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-200" />
        
        {/* Selection checkbox */}
        <motion.button
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ 
            opacity: isSelected ? 1 : 0, 
            scale: isSelected ? 1 : 0.8 
          }}
          whileHover={{ opacity: 1, scale: 1 }}
          className={cn(
            "absolute top-2 left-2 w-6 h-6 rounded-full border-2 border-white",
            "flex items-center justify-center transition-colors",
            isSelected 
              ? "bg-primary border-primary" 
              : "bg-white/20 backdrop-blur-sm hover:bg-white/40"
          )}
          onClick={handleSelectionClick}
        >
          {isSelected && <Check className="w-3 h-3 text-white" />}
        </motion.button>

        {/* Action menu */}
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                size="icon"
                variant="ghost"
                className="w-6 h-6 bg-white/20 backdrop-blur-sm hover:bg-white/40 text-white"
              >
                <MoreVertical className="w-3 h-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>
                <Heart className="w-4 h-4 mr-2" />
                Like
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Share className="w-4 h-4 mr-2" />
                Share
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Download className="w-4 h-4 mr-2" />
                Download
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive">
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Popularity indicator */}
        <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <Badge variant="secondary" className="text-xs bg-black/50 text-white">
            {image.popularity} views
          </Badge>
        </div>
      </div>

      {/* Content */}
      <div className="p-3">
        <h3 className="font-medium text-sm truncate mb-1">{image.title}</h3>
        
        {/* Tags */}
        <div className="flex flex-wrap gap-1 mb-2">
          {image.tags.slice(0, 2).map((tag) => (
            <Badge
              key={tag}
              variant="outline"
              className="text-xs px-1.5 py-0.5 h-auto"
            >
              {tag}
            </Badge>
          ))}
          {image.tags.length > 2 && (
            <Badge variant="outline" className="text-xs px-1.5 py-0.5 h-auto">
              +{image.tags.length - 2}
            </Badge>
          )}
        </div>

        {/* Metadata */}
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{image.size.width} × {image.size.height}</span>
          <span>{image.createdAt.toLocaleDateString()}</span>
        </div>
      </div>

      {/* Loading state overlay */}
      {isDragging && (
        <div className="absolute inset-0 bg-background/50 flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      )}
    </motion.div>
  );
};

export default ImageGridItem;