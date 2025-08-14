import React from "react";
import { motion } from "framer-motion";
import { 
  Grid3X3, 
  List, 
  Settings, 
  Filter, 
  SortAsc, 
  Search,
  CheckSquare,
  Square,
  Trash2,
  Download,
  Share,
  X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { GridSettings, FilterOptions, SortOption } from "@/types/imageGrid";
import { cn } from "@/lib/utils";

interface ImageGridControlsProps {
  viewMode: "grid" | "list";
  onViewModeChange: (mode: "grid" | "list") => void;
  gridSettings: GridSettings;
  onGridSettingsChange: (settings: GridSettings) => void;
  filterOptions: FilterOptions;
  onFilterOptionsChange: (options: FilterOptions) => void;
  sortOption: SortOption;
  onSortOptionChange: (option: SortOption) => void;
  selectionMode: boolean;
  onSelectionModeChange: (enabled: boolean) => void;
  selectedCount: number;
  totalCount: number;
  onSelectAll: () => void;
  searchQuery: string;
  onSearchQueryChange: (query: string) => void;
  availableTags: string[];
}

const sortOptions: SortOption[] = [
  { key: "newest", label: "Newest First", direction: "desc" },
  { key: "oldest", label: "Oldest First", direction: "asc" },
  { key: "popular", label: "Most Popular", direction: "desc" },
  { key: "title", label: "Title A-Z", direction: "asc" },
  { key: "random", label: "Random", direction: "asc" },
];

const ImageGridControls: React.FC<ImageGridControlsProps> = ({
  viewMode,
  onViewModeChange,
  gridSettings,
  onGridSettingsChange,
  filterOptions,
  onFilterOptionsChange,
  sortOption,
  onSortOptionChange,
  selectionMode,
  onSelectionModeChange,
  selectedCount,
  totalCount,
  onSelectAll,
  searchQuery,
  onSearchQueryChange,
  availableTags,
}) => {
  const handleTagToggle = (tag: string) => {
    const newTags = filterOptions.tags.includes(tag)
      ? filterOptions.tags.filter(t => t !== tag)
      : [...filterOptions.tags, tag];
    
    onFilterOptionsChange({
      ...filterOptions,
      tags: newTags,
    });
  };

  const clearFilters = () => {
    onFilterOptionsChange({
      tags: [],
      aspectRatio: "auto",
    });
    onSearchQueryChange("");
  };

  const hasActiveFilters = 
    filterOptions.tags.length > 0 || 
    filterOptions.aspectRatio !== "auto" || 
    searchQuery.length > 0;

  return (
    <div className="space-y-4">
      {/* Top row - Search and main controls */}
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Search images..."
            value={searchQuery}
            onChange={(e) => onSearchQueryChange(e.target.value)}
            className="pl-10"
          />
          {searchQuery && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 transform -translate-y-1/2 h-7 w-7"
              onClick={() => onSearchQueryChange("")}
            >
              <X className="w-3 h-3" />
            </Button>
          )}
        </div>

        {/* View mode toggle */}
        <div className="flex rounded-lg border p-1">
          <Button
            variant={viewMode === "grid" ? "default" : "ghost"}
            size="sm"
            onClick={() => onViewModeChange("grid")}
            className="rounded-md"
          >
            <Grid3X3 className="w-4 h-4 mr-2" />
            Grid
          </Button>
          <Button
            variant={viewMode === "list" ? "default" : "ghost"}
            size="sm"
            onClick={() => onViewModeChange("list")}
            className="rounded-md"
          >
            <List className="w-4 h-4 mr-2" />
            List
          </Button>
        </div>

        {/* Sort */}
        <Select 
          value={sortOption.key} 
          onValueChange={(value) => {
            const option = sortOptions.find(opt => opt.key === value);
            if (option) onSortOptionChange(option);
          }}
        >
          <SelectTrigger className="w-[180px]">
            <SortAsc className="w-4 h-4 mr-2" />
            <SelectValue placeholder="Sort by..." />
          </SelectTrigger>
          <SelectContent>
            {sortOptions.map((option) => (
              <SelectItem key={option.key} value={option.key}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Filters */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="relative">
              <Filter className="w-4 h-4 mr-2" />
              Filters
              {hasActiveFilters && (
                <Badge className="absolute -top-2 -right-2 h-5 w-5 p-0 text-xs">
                  {filterOptions.tags.length + (filterOptions.aspectRatio !== "auto" ? 1 : 0)}
                </Badge>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56">
            <DropdownMenuLabel>Aspect Ratio</DropdownMenuLabel>
            <DropdownMenuCheckboxItem
              checked={filterOptions.aspectRatio === "auto"}
              onCheckedChange={() => onFilterOptionsChange({
                ...filterOptions,
                aspectRatio: "auto"
              })}
            >
              All Ratios
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={filterOptions.aspectRatio === "square"}
              onCheckedChange={() => onFilterOptionsChange({
                ...filterOptions,
                aspectRatio: filterOptions.aspectRatio === "square" ? "auto" : "square"
              })}
            >
              Square (1:1)
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={filterOptions.aspectRatio === "landscape"}
              onCheckedChange={() => onFilterOptionsChange({
                ...filterOptions,
                aspectRatio: filterOptions.aspectRatio === "landscape" ? "auto" : "landscape"
              })}
            >
              Landscape (16:9)
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={filterOptions.aspectRatio === "portrait"}
              onCheckedChange={() => onFilterOptionsChange({
                ...filterOptions,
                aspectRatio: filterOptions.aspectRatio === "portrait" ? "auto" : "portrait"
              })}
            >
              Portrait (3:4)
            </DropdownMenuCheckboxItem>
            
            <DropdownMenuSeparator />
            <DropdownMenuLabel>Tags</DropdownMenuLabel>
            {availableTags.slice(0, 8).map((tag) => (
              <DropdownMenuCheckboxItem
                key={tag}
                checked={filterOptions.tags.includes(tag)}
                onCheckedChange={() => handleTagToggle(tag)}
              >
                {tag}
              </DropdownMenuCheckboxItem>
            ))}
            
            {hasActiveFilters && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={clearFilters}>
                  <X className="w-4 h-4 mr-2" />
                  Clear Filters
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Grid Settings */}
        {viewMode === "grid" && (
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline">
                <Settings className="w-4 h-4 mr-2" />
                Settings
              </Button>
            </SheetTrigger>
            <SheetContent>
              <SheetHeader>
                <SheetTitle>Grid Settings</SheetTitle>
                <SheetDescription>
                  Customize the appearance of your image grid
                </SheetDescription>
              </SheetHeader>
              
              <div className="space-y-6 mt-6">
                {/* Gap */}
                <div className="space-y-2">
                  <Label>Gap: {gridSettings.gap}px</Label>
                  <Slider
                    value={[gridSettings.gap]}
                    onValueChange={(value) => onGridSettingsChange({
                      ...gridSettings,
                      gap: value[0]
                    })}
                    max={32}
                    min={4}
                    step={4}
                  />
                </div>

                {/* Size */}
                <div className="space-y-2">
                  <Label>Item Size</Label>
                  <Select
                    value={gridSettings.itemSize}
                    onValueChange={(value: "small" | "medium" | "large") => 
                      onGridSettingsChange({
                        ...gridSettings,
                        itemSize: value
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="small">Small</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="large">Large</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Aspect Ratio */}
                <div className="space-y-2">
                  <Label>Force Aspect Ratio</Label>
                  <Select
                    value={gridSettings.aspectRatio}
                    onValueChange={(value: "auto" | "square" | "portrait" | "landscape") => 
                      onGridSettingsChange({
                        ...gridSettings,
                        aspectRatio: value
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="auto">Auto</SelectItem>
                      <SelectItem value="square">Square</SelectItem>
                      <SelectItem value="landscape">Landscape</SelectItem>
                      <SelectItem value="portrait">Portrait</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Columns */}
                <div className="space-y-4">
                  <Label>Columns per Screen Size</Label>
                  
                  <div className="space-y-3">
                    <div>
                      <Label className="text-sm text-muted-foreground">Mobile: {gridSettings.columns.mobile}</Label>
                      <Slider
                        value={[gridSettings.columns.mobile]}
                        onValueChange={(value) => onGridSettingsChange({
                          ...gridSettings,
                          columns: { ...gridSettings.columns, mobile: value[0] }
                        })}
                        max={3}
                        min={1}
                        step={1}
                      />
                    </div>
                    
                    <div>
                      <Label className="text-sm text-muted-foreground">Tablet: {gridSettings.columns.tablet}</Label>
                      <Slider
                        value={[gridSettings.columns.tablet]}
                        onValueChange={(value) => onGridSettingsChange({
                          ...gridSettings,
                          columns: { ...gridSettings.columns, tablet: value[0] }
                        })}
                        max={4}
                        min={1}
                        step={1}
                      />
                    </div>
                    
                    <div>
                      <Label className="text-sm text-muted-foreground">Desktop: {gridSettings.columns.desktop}</Label>
                      <Slider
                        value={[gridSettings.columns.desktop]}
                        onValueChange={(value) => onGridSettingsChange({
                          ...gridSettings,
                          columns: { ...gridSettings.columns, desktop: value[0] }
                        })}
                        max={6}
                        min={2}
                        step={1}
                      />
                    </div>
                    
                    <div>
                      <Label className="text-sm text-muted-foreground">Wide: {gridSettings.columns.wide}</Label>
                      <Slider
                        value={[gridSettings.columns.wide]}
                        onValueChange={(value) => onGridSettingsChange({
                          ...gridSettings,
                          columns: { ...gridSettings.columns, wide: value[0] }
                        })}
                        max={8}
                        min={3}
                        step={1}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        )}

        {/* Selection mode toggle */}
        <Button
          variant={selectionMode ? "default" : "outline"}
          onClick={() => onSelectionModeChange(!selectionMode)}
        >
          {selectionMode ? <CheckSquare className="w-4 h-4 mr-2" /> : <Square className="w-4 h-4 mr-2" />}
          Select
        </Button>
      </div>

      {/* Active filters display */}
      {hasActiveFilters && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-muted-foreground">Active filters:</span>
          
          {searchQuery && (
            <Badge variant="secondary" className="gap-1">
              Search: {searchQuery}
              <Button
                variant="ghost"
                size="icon"
                className="h-4 w-4 hover:bg-transparent"
                onClick={() => onSearchQueryChange("")}
              >
                <X className="w-3 h-3" />
              </Button>
            </Badge>
          )}
          
          {filterOptions.aspectRatio !== "auto" && (
            <Badge variant="secondary" className="gap-1">
              {filterOptions.aspectRatio}
              <Button
                variant="ghost"
                size="icon"
                className="h-4 w-4 hover:bg-transparent"
                onClick={() => onFilterOptionsChange({
                  ...filterOptions,
                  aspectRatio: "auto"
                })}
              >
                <X className="w-3 h-3" />
              </Button>
            </Badge>
          )}
          
          {filterOptions.tags.map((tag) => (
            <Badge key={tag} variant="secondary" className="gap-1">
              {tag}
              <Button
                variant="ghost"
                size="icon"
                className="h-4 w-4 hover:bg-transparent"
                onClick={() => handleTagToggle(tag)}
              >
                <X className="w-3 h-3" />
              </Button>
            </Badge>
          ))}
          
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="h-7 text-xs"
          >
            Clear all
          </Button>
        </div>
      )}

      {/* Selection toolbar */}
      {selectionMode && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between p-3 bg-muted rounded-lg"
        >
          <div className="flex items-center space-x-4">
            <Button
              variant="outline"
              size="sm"
              onClick={onSelectAll}
            >
              {selectedCount === totalCount ? "Deselect All" : "Select All"}
            </Button>
            <span className="text-sm text-muted-foreground">
              {selectedCount} of {totalCount} selected
            </span>
          </div>
          
          {selectedCount > 0 && (
            <div className="flex items-center space-x-2">
              <Button variant="outline" size="sm">
                <Download className="w-4 h-4 mr-2" />
                Download ({selectedCount})
              </Button>
              <Button variant="outline" size="sm">
                <Share className="w-4 h-4 mr-2" />
                Share
              </Button>
              <Button variant="destructive" size="sm">
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </Button>
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
};

export default ImageGridControls;