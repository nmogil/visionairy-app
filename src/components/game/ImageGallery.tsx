'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { 
  X, 
  ChevronLeft, 
  ChevronRight, 
  Maximize, 
  Minimize, 
  RotateCcw,
  Heart,
  HeartOff,
  User,
  Clock,
  Eye,
  EyeOff,
  Download,
  Share2,
  Columns2,
  ZoomIn,
  ZoomOut
} from 'lucide-react';

export interface ImageData {
  id: string;
  url: string;
  thumbnailUrl?: string;
  player: string;
  prompt: string;
  timestamp: Date;
  isFavorite?: boolean;
  isNSFW?: boolean;
  metadata?: {
    width?: number;
    height?: number;
    fileSize?: string;
  };
}

interface ImageGalleryProps {
  images: ImageData[];
  className?: string;
  onImageClick?: (image: ImageData, index: number) => void;
  onFavoriteToggle?: (imageId: string, isFavorite: boolean) => void;
  showNSFW?: boolean;
  enableComparison?: boolean;
  autoLayout?: boolean;
}

// Mock placeholder images for demo
const generateMockImages = (): ImageData[] => {
  const prompts = [
    "A cat wearing a wizard hat in a mystical forest",
    "Cyberpunk cityscape with neon lights reflecting on wet streets",
    "A majestic dragon perched on a crystal mountain peak",
    "Underwater coral reef with bioluminescent creatures",
    "Steampunk airship floating above Victorian London",
    "Ancient library filled with floating magical books",
    "Robot chef cooking in a futuristic kitchen",
    "Enchanted garden with glowing flowers and fairy lights",
    "Space station orbiting a purple nebula",
    "Medieval knight battling a mechanical demon"
  ];

  const players = ["Alice", "Bob", "Charlie", "Diana", "Eve", "Frank"];
  
  return Array.from({ length: 20 }, (_, i) => ({
    id: `img-${i}`,
    url: `https://picsum.photos/${400 + (i % 3) * 100}/${300 + (i % 4) * 100}?random=${i}`,
    thumbnailUrl: `https://picsum.photos/${200}/${150}?random=${i}`,
    player: players[i % players.length],
    prompt: prompts[i % prompts.length],
    timestamp: new Date(Date.now() - Math.random() * 86400000 * 7), // Random time within last week
    isFavorite: Math.random() > 0.7,
    isNSFW: Math.random() > 0.8,
    metadata: {
      width: 400 + (i % 3) * 100,
      height: 300 + (i % 4) * 100,
      fileSize: `${(Math.random() * 2 + 0.5).toFixed(1)}MB`
    }
  }));
};

const ImageSkeleton: React.FC<{ className?: string }> = ({ className }) => (
  <div className={cn("animate-pulse bg-muted rounded-lg", className)}>
    <div className="aspect-[4/3] bg-muted-foreground/20 rounded-lg" />
  </div>
);

const LazyImage: React.FC<{
  src: string;
  thumbnailSrc?: string;
  alt: string;
  className?: string;
  onLoad?: () => void;
  onError?: () => void;
  blurred?: boolean;
}> = ({ src, thumbnailSrc, alt, className, onLoad, onError, blurred }) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => observer.disconnect();
  }, []);

  const handleLoad = () => {
    setIsLoaded(true);
    onLoad?.();
  };

  const handleError = () => {
    setHasError(true);
    onError?.();
  };

  const handleRetry = () => {
    setHasError(false);
    setIsLoaded(false);
  };

  return (
    <div ref={imgRef} className={cn("relative overflow-hidden", className)}>
      {!isInView && <ImageSkeleton className="absolute inset-0" />}
      
      {isInView && (
        <>
          {thumbnailSrc && !isLoaded && (
            <motion.img
              src={thumbnailSrc}
              alt={alt}
              className="absolute inset-0 w-full h-full object-cover blur-md"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            />
          )}
          
          {hasError ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-muted text-muted-foreground">
              <div className="text-center space-y-2">
                <p className="text-sm">Failed to load image</p>
                <Button variant="outline" size="sm" onClick={handleRetry}>
                  <RotateCcw className="w-3 h-3 mr-1" />
                  Retry
                </Button>
              </div>
            </div>
          ) : (
            <motion.img
              src={src}
              alt={alt}
              className={cn(
                "w-full h-full object-cover transition-all duration-300",
                blurred && "blur-md",
                isLoaded ? "opacity-100" : "opacity-0"
              )}
              onLoad={handleLoad}
              onError={handleError}
              animate={{ 
                opacity: isLoaded ? 1 : 0,
                filter: blurred ? "blur(8px)" : "blur(0px)"
              }}
              transition={{ duration: 0.3 }}
            />
          )}
        </>
      )}
    </div>
  );
};

const ImageCard: React.FC<{
  image: ImageData;
  index: number;
  onClick: () => void;
  onFavoriteToggle: () => void;
  showNSFW: boolean;
}> = ({ image, index, onClick, onFavoriteToggle, showNSFW }) => {
  const isBlurred = image.isNSFW && !showNSFW;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="group relative break-inside-avoid mb-4"
    >
      <Card className="overflow-hidden cursor-pointer hover:shadow-lg transition-all duration-300">
        <div className="relative aspect-[4/3]" onClick={onClick}>
          <LazyImage
            src={image.url}
            thumbnailSrc={image.thumbnailUrl}
            alt={image.prompt}
            className="w-full h-full"
            blurred={isBlurred}
          />
          
          {/* Overlay */}
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <div className="absolute bottom-0 left-0 right-0 p-3 text-white">
              <p className="text-xs line-clamp-2">{image.prompt}</p>
            </div>
          </div>

          {/* Badges */}
          <div className="absolute top-2 left-2 flex gap-1">
            {image.isNSFW && (
              <Badge variant="destructive" className="text-xs">
                NSFW
              </Badge>
            )}
          </div>

          {/* Blur overlay for NSFW */}
          {isBlurred && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/30">
              <div className="text-center text-white">
                <EyeOff className="w-6 h-6 mx-auto mb-1" />
                <p className="text-xs">Content Hidden</p>
              </div>
            </div>
          )}
        </div>

        {/* Card Footer */}
        <div className="p-3 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <User className="w-3 h-3" />
              <span>{image.player}</span>
            </div>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onFavoriteToggle();
              }}
              className="p-1 h-auto"
            >
              {image.isFavorite ? (
                <Heart className="w-4 h-4 fill-red-500 text-red-500" />
              ) : (
                <HeartOff className="w-4 h-4" />
              )}
            </Button>
          </div>
          
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="w-3 h-3" />
            <span>{image.timestamp.toLocaleDateString()}</span>
          </div>
        </div>
      </Card>
    </motion.div>
  );
};

const Lightbox: React.FC<{
  images: ImageData[];
  currentIndex: number;
  isOpen: boolean;
  onClose: () => void;
  onNext: () => void;
  onPrevious: () => void;
  showNSFW: boolean;
  comparisonMode?: boolean;
  onComparisonToggle?: () => void;
}> = ({ 
  images, 
  currentIndex, 
  isOpen, 
  onClose, 
  onNext, 
  onPrevious, 
  showNSFW,
  comparisonMode = false,
  onComparisonToggle
}) => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [comparisonIndex, setComparisonIndex] = useState(currentIndex + 1);

  const currentImage = images[currentIndex];
  const comparisonImage = images[comparisonIndex] || images[0];

  const resetZoom = () => {
    setZoom(1);
    setPosition({ x: 0, y: 0 });
  };

  const handleDrag = (event: any, info: PanInfo) => {
    if (zoom > 1) {
      setPosition({
        x: position.x + info.delta.x,
        y: position.y + info.delta.y
      });
    }
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    const newZoom = Math.max(0.5, Math.min(3, zoom * delta));
    setZoom(newZoom);
    
    if (newZoom === 1) {
      setPosition({ x: 0, y: 0 });
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      
      switch (e.key) {
        case 'Escape':
          onClose();
          break;
        case 'ArrowLeft':
          onPrevious();
          break;
        case 'ArrowRight':
          onNext();
          break;
        case 'f':
        case 'F':
          setIsFullscreen(!isFullscreen);
          break;
        case '+':
        case '=':
          setZoom(Math.min(3, zoom * 1.2));
          break;
        case '-':
          setZoom(Math.max(0.5, zoom / 1.2));
          break;
        case '0':
          resetZoom();
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, onNext, onPrevious, isFullscreen, zoom]);

  useEffect(() => {
    resetZoom();
  }, [currentIndex]);

  const toggleFullscreen = () => {
    if (!isFullscreen) {
      document.documentElement.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
    setIsFullscreen(!isFullscreen);
  };

  if (!isOpen || !currentImage) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center"
        onClick={onClose}
      >
        {/* Controls */}
        <div className="absolute top-4 right-4 flex gap-2 z-10">
          <Button variant="secondary" size="sm" onClick={() => setZoom(Math.max(0.5, zoom / 1.2))}>
            <ZoomOut className="w-4 h-4" />
          </Button>
          <Button variant="secondary" size="sm" onClick={() => setZoom(Math.min(3, zoom * 1.2))}>
            <ZoomIn className="w-4 h-4" />
          </Button>
          <Button variant="secondary" size="sm" onClick={resetZoom}>
            {zoom.toFixed(1)}x
          </Button>
          {onComparisonToggle && (
            <Button variant="secondary" size="sm" onClick={onComparisonToggle}>
              <Columns2 className="w-4 h-4" />
            </Button>
          )}
          <Button variant="secondary" size="sm" onClick={toggleFullscreen}>
            {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
          </Button>
          <Button variant="secondary" size="sm" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Navigation */}
        <Button
          variant="secondary"
          size="sm"
          className="absolute left-4 top-1/2 -translate-y-1/2 z-10"
          onClick={(e) => {
            e.stopPropagation();
            onPrevious();
          }}
        >
          <ChevronLeft className="w-4 h-4" />
        </Button>

        <Button
          variant="secondary"
          size="sm"
          className="absolute right-4 top-1/2 -translate-y-1/2 z-10"
          onClick={(e) => {
            e.stopPropagation();
            onNext();
          }}
        >
          <ChevronRight className="w-4 h-4" />
        </Button>

        {/* Image Container */}
        <div 
          className="relative w-full h-full flex items-center justify-center"
          onClick={(e) => e.stopPropagation()}
          onWheel={handleWheel}
        >
          {comparisonMode ? (
            <div className="flex gap-4 max-w-[90vw] max-h-[90vh]">
              <motion.div
                drag={zoom > 1}
                dragConstraints={{ left: -100, right: 100, top: -100, bottom: 100 }}
                onDrag={handleDrag}
                className="relative"
                style={{
                  scale: zoom,
                  x: position.x,
                  y: position.y,
                }}
              >
                <img
                  src={currentImage.url}
                  alt={currentImage.prompt}
                  className="max-w-full max-h-full object-contain"
                />
                <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-white p-2">
                  <p className="text-sm">{currentImage.player}: {currentImage.prompt}</p>
                </div>
              </motion.div>
              
              <motion.div
                drag={zoom > 1}
                dragConstraints={{ left: -100, right: 100, top: -100, bottom: 100 }}
                onDrag={handleDrag}
                className="relative"
                style={{
                  scale: zoom,
                  x: position.x,
                  y: position.y,
                }}
              >
                <img
                  src={comparisonImage.url}
                  alt={comparisonImage.prompt}
                  className="max-w-full max-h-full object-contain"
                />
                <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-white p-2">
                  <p className="text-sm">{comparisonImage.player}: {comparisonImage.prompt}</p>
                </div>
              </motion.div>
            </div>
          ) : (
            <motion.div
              drag={zoom > 1}
              dragConstraints={{ left: -200, right: 200, top: -200, bottom: 200 }}
              onDrag={handleDrag}
              className="relative max-w-[90vw] max-h-[90vh]"
              style={{
                scale: zoom,
                x: position.x,
                y: position.y,
              }}
            >
              <LazyImage
                src={currentImage.url}
                alt={currentImage.prompt}
                className="max-w-full max-h-full object-contain"
                blurred={currentImage.isNSFW && !showNSFW}
              />
            </motion.div>
          )}
        </div>

        {/* Metadata */}
        <div className="absolute bottom-4 left-4 right-4 bg-black/70 text-white p-4 rounded-lg">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <p className="font-medium">{currentImage.prompt}</p>
              <div className="flex items-center gap-4 text-sm text-gray-300">
                <span>By {currentImage.player}</span>
                <span>{currentImage.timestamp.toLocaleString()}</span>
                {currentImage.metadata && (
                  <span>{currentImage.metadata.width}×{currentImage.metadata.height}</span>
                )}
              </div>
            </div>
            
            <div className="flex gap-2">
              <Button variant="secondary" size="sm">
                <Download className="w-4 h-4" />
              </Button>
              <Button variant="secondary" size="sm">
                <Share2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Image Counter */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-black/70 text-white px-3 py-1 rounded-full text-sm">
          {currentIndex + 1} / {images.length}
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export const ImageGallery: React.FC<ImageGalleryProps> = ({
  images: propImages,
  className,
  onImageClick,
  onFavoriteToggle,
  showNSFW = false,
  enableComparison = true,
  autoLayout = true
}) => {
  const [images, setImages] = useState<ImageData[]>(propImages.length > 0 ? propImages : generateMockImages());
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [showNSFWContent, setShowNSFWContent] = useState(showNSFW);
  const [comparisonMode, setComparisonMode] = useState(false);

  const handleImageClick = (image: ImageData, index: number) => {
    setLightboxIndex(index);
    onImageClick?.(image, index);
  };

  const handleFavoriteToggle = (imageId: string) => {
    setImages(prev => prev.map(img => 
      img.id === imageId 
        ? { ...img, isFavorite: !img.isFavorite }
        : img
    ));
    
    const image = images.find(img => img.id === imageId);
    if (image) {
      onFavoriteToggle?.(imageId, !image.isFavorite);
    }
  };

  const closeLightbox = () => setLightboxIndex(null);
  
  const nextImage = () => {
    if (lightboxIndex !== null) {
      setLightboxIndex((lightboxIndex + 1) % images.length);
    }
  };
  
  const previousImage = () => {
    if (lightboxIndex !== null) {
      setLightboxIndex(lightboxIndex === 0 ? images.length - 1 : lightboxIndex - 1);
    }
  };

  return (
    <div className={cn("w-full", className)}>
      {/* Controls */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowNSFWContent(!showNSFWContent)}
            className="flex items-center gap-1"
          >
            {showNSFWContent ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
            <span className="text-xs">
              {showNSFWContent ? 'Hide' : 'Show'} NSFW
            </span>
          </Button>
        </div>
        
        <Badge variant="secondary" className="text-xs">
          {images.length} images
        </Badge>
      </div>

      {/* Masonry Grid */}
      <div 
        className={cn(
          "columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-4",
          autoLayout && "auto-cols-max"
        )}
      >
        {images.map((image, index) => (
          <ImageCard
            key={image.id}
            image={image}
            index={index}
            onClick={() => handleImageClick(image, index)}
            onFavoriteToggle={() => handleFavoriteToggle(image.id)}
            showNSFW={showNSFWContent}
          />
        ))}
      </div>

      {/* Lightbox */}
      <Lightbox
        images={images}
        currentIndex={lightboxIndex || 0}
        isOpen={lightboxIndex !== null}
        onClose={closeLightbox}
        onNext={nextImage}
        onPrevious={previousImage}
        showNSFW={showNSFWContent}
        comparisonMode={comparisonMode}
        onComparisonToggle={enableComparison ? () => setComparisonMode(!comparisonMode) : undefined}
      />
    </div>
  );
};

export default ImageGallery;