import { useEffect, useRef, type ReactNode } from "react";
import { motion, useAnimationControls } from "motion/react";
import type { Settings } from "./engine";
import { pulseStrength, crossedHour } from "./cinema";
export function NumberShell({
  seconds,
  s,
  reduced,
  children,
}: {
  seconds: number;
  s: Settings;
  reduced: boolean;
  children: ReactNode;
}) {
  const body = useAnimationControls();
  const previous = useRef(seconds);
  useEffect(() => {
    const hourly = crossedHour(previous.current, seconds);
    previous.current = seconds;
    const strength =
      !reduced && s.dynamic
        ? Math.max(pulseStrength(seconds), hourly ? 1.2 : 0) *
          Math.min(1.5, s.animation)
        : 0;
    if (strength > 0) {
      void body.start({
        scale: [1, 1 + 0.025 * strength, 1],
        "--glyph-glow": [0.25, 0.25 + 0.55 * strength, 0.25],
        transition: {
          duration: seconds > 0 && seconds <= 10 ? .9 - .018 * (10-seconds) : .88,
          times: [0, 0.32, 1],
          ease: [0.22, 0.7, 0.2, 1],
        },
      });
    } else body.set({ scale: 1, "--glyph-glow": 0.25 });
    return () => body.stop();
  }, [seconds, reduced, s.dynamic, s.animation, body]);
  return (
    <motion.div
      className="number-shell"
      animate={body}
      initial={{ scale: 1, "--glyph-glow": 0.25 }}
    >
      <div className="number" aria-hidden="true">
        {children}
      </div>
    </motion.div>
  );
}
