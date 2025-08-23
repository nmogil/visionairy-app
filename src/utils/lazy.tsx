import React, { lazy, ComponentType, ReactElement } from "react";
import { Loader2 } from "lucide-react";

// Enhanced lazy loading with better error handling and loading states
export function createLazyComponent<T extends ComponentType<any>>(
  importFunction: () => Promise<{ default: T }>,
  fallback: ReactElement = <div className="flex items-center justify-center p-4">
    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
  </div>
) {
  const LazyComponent = lazy(importFunction);
  
  return (props: React.ComponentProps<T>) => (
    <React.Suspense fallback={fallback}>
      <LazyComponent {...props} />
    </React.Suspense>
  );
}

// Specific lazy components for bundle optimization
export const LazyRoomSettings = createLazyComponent(
  () => import("../components/room/RoomSettings"),
  <div className="flex items-center justify-center p-6">
    <Loader2 className="h-6 w-6 animate-spin text-primary" />
    <span className="ml-2 text-sm text-muted-foreground">Loading settings...</span>
  </div>
);

export const LazyRoomSettingsDialog = createLazyComponent(
  () => import("../components/room/RoomSettingsDialog"),
  <div className="flex items-center justify-center p-4">
    <Loader2 className="h-4 w-4 animate-spin text-primary" />
  </div>
);

// Icon lazy loader to replace direct lucide-react imports for better bundle splitting
export async function loadIcon(iconName: string) {
  try {
    const iconModule = await import("lucide-react");
    return iconModule[iconName as keyof typeof iconModule];
  } catch (error) {
    console.warn(`Failed to load icon: ${iconName}`);
    return null;
  }
}

// Utility to create lazy loaded routes
export function createLazyRoute<T extends ComponentType<any>>(
  importFunction: () => Promise<{ default: T }>,
  routeName: string = "page"
) {
  return createLazyComponent(
    importFunction,
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">Loading {routeName}...</p>
      </div>
    </div>
  );
}