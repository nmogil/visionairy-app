import { ConvexAuthProvider } from "@convex-dev/auth/react";
import React from "react";
import ReactDOM from "react-dom/client";
import { ConvexReactClient } from "convex/react";
import App from "./App.tsx";
import "./index.css";

const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL as string);

// Custom storage implementation to ensure persistence
const createPersistentStorage = () => {
  if (typeof window === "undefined") {
    return undefined;
  }
  
  return {
    getItem: (key: string) => {
      try {
        const value = localStorage.getItem(key);
        // Only log JWT token retrieval for debugging
        if (key.includes("JWT")) {
          console.log(`[Storage] JWT token ${value ? "found" : "not found"}`);
        }
        return value;
      } catch (error) {
        console.error(`[Storage] Error getting ${key}:`, error);
        return null;
      }
    },
    setItem: (key: string, value: string) => {
      try {
        localStorage.setItem(key, value);
        // Minimal logging
      } catch (error) {
        console.error(`[Storage] Error setting ${key}:`, error);
      }
    },
    removeItem: (key: string) => {
      try {
        localStorage.removeItem(key);
        // Minimal logging
      } catch (error) {
        console.error(`[Storage] Error removing ${key}:`, error);
      }
    }
  };
};

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ConvexAuthProvider 
      client={convex}
      storage={createPersistentStorage()}
      storageNamespace="visionairy-auth"
    >
      <App />
    </ConvexAuthProvider>
  </React.StrictMode>,
);
