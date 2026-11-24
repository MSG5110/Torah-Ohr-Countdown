import { motion } from "motion/react";
import { Logo } from "./Display";
import { launchTimeline, smooth01 } from "./cinema";
import { launchOptics } from "./optics";
import type { Settings } from "./engine";
export function Finale({
  s,
  elapsed,
  launchAt,
  reduced,
  onMissing,
}: {
  s: Settings;
  elapsed: number;
  launchAt: number | null;
  reduced: boolean;
  onMissing: (missing: boolean) => void;
}) {
  const timeline = launchTimeline(elapsed),
    optical = launchOptics(elapsed);
  const logo = reduced ? 1 : smooth01(timeline.logo);
  const words = s.launchText.trim().split(/\s+/);
  return (
    <section className="finale cinematic-finale">
      {!reduced && elapsed < 7 && (
        <div
          className="launch-light-bed"
          style={{ opacity: optical.handoff * 0.65 }}
        />
      )}
      <div className="launch-content" key={launchAt}>
        <motion.div
          className="launch-logo-reveal"
          initial={false}
          animate={{
            opacity: logo,
            y: (1 - logo) * 18,
            scale: 0.965 + 0.035 * logo,
          }}
          transition={{ duration: reduced ? 0 : 0.12, ease: "linear" }}
        >
          <Logo source={s.logo} onMissing={onMissing} />
        </motion.div>
        <h1
          className="launch-title"
          aria-label={s.launchText}
          style={
            {
              "--launch-scale": Math.min(
                1,
                20 / Math.max(1, s.launchText.length),
              ),
              "--title-sheen": `${160 - optical.sheen * 320}%`,
            } as React.CSSProperties
          }
        >
          {words.map((word, i) => {
            const reveal = reduced
              ? 1
              : smooth01((elapsed - 2.65 - Math.min(i * 0.09, 0.36)) / 1.45);
            return (
              <span className="launch-word-mask" key={i}>
                <motion.span
                  aria-hidden="true"
                  initial={false}
                  animate={{
                    opacity: reveal,
                    y: (1 - reveal) * 22,
                    scale: 1.035 - 0.035 * reveal,
                  }}
                  transition={{ duration: reduced ? 0 : 0.12, ease: "linear" }}
                >
                  {word}
                </motion.span>
              </span>
            );
          })}
        </h1>
      </div>
    </section>
  );
}
