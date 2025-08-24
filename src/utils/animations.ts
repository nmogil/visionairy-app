import { Variants } from "framer-motion";

// Lazy load framer-motion only when animations are needed
let motionImport: Promise<typeof import("framer-motion")> | null = null;

export async function loadMotion() {
  if (!motionImport) {
    motionImport = import("framer-motion");
  }
  return motionImport;
}

// Optimized animation variants (lighter than importing all of framer-motion)
export const fadeInUp: Variants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 }
};

export const slideIn: Variants = {
  initial: { x: 100, opacity: 0 },
  animate: { x: 0, opacity: 1 },
  exit: { x: -100, opacity: 0 }
};

export const scaleIn: Variants = {
  initial: { scale: 0.8, opacity: 0 },
  animate: { scale: 1, opacity: 1 },
  exit: { scale: 0.8, opacity: 0 }
};

// Dynamic motion component loader
export async function createMotionDiv() {
  const { motion } = await loadMotion();
  return motion.div;
}

export async function createMotionSpan() {
  const { motion } = await loadMotion();
  return motion.span;
}