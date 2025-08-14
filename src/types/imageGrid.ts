export interface ImageItem {
  id: string;
  src: string;
  title: string;
  description?: string;
  tags: string[];
  aspectRatio: number;
  popularity: number;
  createdAt: Date;
  size: {
    width: number;
    height: number;
  };
}

export interface GridSettings {
  columns: {
    mobile: number;
    tablet: number;
    desktop: number;
    wide: number;
  };
  gap: number;
  aspectRatio: "auto" | "square" | "portrait" | "landscape";
  itemSize: "small" | "medium" | "large";
}

export interface FilterOptions {
  tags: string[];
  aspectRatio?: "auto" | "square" | "portrait" | "landscape";
  sizeRange?: [number, number];
}

export interface SortOption {
  key: "newest" | "oldest" | "popular" | "title" | "random";
  label: string;
  direction: "asc" | "desc";
}

// Mock data generator
export const generateMockImages = (count: number = 60): ImageItem[] => {
  const tags = [
    "nature", "portrait", "landscape", "architecture", "abstract", 
    "street", "macro", "wildlife", "travel", "food", "fashion", 
    "technology", "art", "people", "urban", "minimal", "vintage",
    "color", "black-white", "sunset", "ocean", "mountain", "city"
  ];

  const aspectRatios = [
    { ratio: 1, weight: 30 }, // square
    { ratio: 16/9, weight: 25 }, // landscape
    { ratio: 3/4, weight: 20 }, // portrait
    { ratio: 4/3, weight: 15 }, // slightly landscape
    { ratio: 9/16, weight: 10 }, // vertical
  ];

  const images: ImageItem[] = [];

  for (let i = 1; i <= count; i++) {
    // Random aspect ratio based on weights
    const randomValue = Math.random() * 100;
    let currentWeight = 0;
    let selectedRatio = aspectRatios[0];
    
    for (const ar of aspectRatios) {
      currentWeight += ar.weight;
      if (randomValue <= currentWeight) {
        selectedRatio = ar;
        break;
      }
    }

    const baseWidth = 400;
    const baseHeight = Math.round(baseWidth / selectedRatio.ratio);
    
    // Randomize size slightly
    const sizeVariation = 0.8 + Math.random() * 0.4; // 0.8 to 1.2
    const width = Math.round(baseWidth * sizeVariation);
    const height = Math.round(baseHeight * sizeVariation);

    const imageTags = tags
      .sort(() => 0.5 - Math.random())
      .slice(0, Math.floor(Math.random() * 4) + 1);

    const createdDaysAgo = Math.floor(Math.random() * 365);
    const createdAt = new Date();
    createdAt.setDate(createdAt.getDate() - createdDaysAgo);

    // Generate placeholder image with size and color
    const colors = [
      "8B5CF6", "F97316", "10B981", "EF4444", "3B82F6", 
      "F59E0B", "8B5A2B", "6B7280", "EC4899", "06B6D4",
      "84CC16", "F97316", "8B5CF6", "EF4444", "10B981"
    ];
    const color = colors[i % colors.length];
    const textColor = "FFFFFF";
    const src = `https://via.placeholder.com/${width}x${height}/${color}/${textColor}?text=Image+${i}`;

    images.push({
      id: `image-${i}`,
      src,
      title: `Image ${i}`,
      description: `This is a beautiful ${imageTags.join(", ")} image`,
      tags: imageTags,
      aspectRatio: selectedRatio.ratio,
      popularity: Math.floor(Math.random() * 1000),
      createdAt,
      size: { width, height },
    });
  }

  return images;
};