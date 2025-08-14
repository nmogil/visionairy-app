import React, { useEffect, useRef, useState } from "react";
import { useInView, useReducedMotion } from "framer-motion";

interface CountUpProps {
  end: number;
  duration?: number; // seconds
  delay?: number; // seconds
  className?: string;
}

const CountUp: React.FC<CountUpProps> = ({ end, duration = 1.1, delay = 0, className }) => {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true, margin: "0px 0px -10% 0px" });
  const [value, setValue] = useState<number>(reduce ? end : 0);
  const started = useRef(false);

  useEffect(() => {
    if (reduce) return; // Render final value immediately for reduced motion
    if (!isInView || started.current) return;

    started.current = true;
    const startTime = performance.now() + delay * 1000;

    const step = (now: number) => {
      if (now < startTime) {
        requestAnimationFrame(step);
        return;
      }
      const elapsed = now - startTime;
      const t = Math.min(1, elapsed / (duration * 1000));
      const eased = 1 - Math.pow(1 - t, 3); // easeOutCubic
      const next = Math.round(eased * end);
      setValue(next);
      if (t < 1) requestAnimationFrame(step);
    };

    const raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [delay, duration, end, isInView, reduce]);

  return (
    <span ref={ref} className={className} aria-label={end.toLocaleString()}>
      {value.toLocaleString()}
    </span>
  );
};

export default CountUp;
