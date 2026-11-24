import {
  createPhotoSequence,
  reconcilePhotoSequence,
  advancePhotoSequence,
  currentPhotoId,
  nextPhotoId,
  type PhotoSequence,
} from "./photoSequence";
import { memo, useEffect, useState, useRef, useLayoutEffect } from "react";
import { AnimatePresence, motion } from "motion/react";
import { units, type Settings } from "./engine";
import type { Photo } from "./storage";
import { countdownLayout } from "./layout";
import { decodedPhotos } from "./photoDecode";
import { analyzePhoto } from "./photoAnalysis";
import type { LivePhotoInfo } from "./photoFraming";
import { photoURLs, acquirePhoto } from "./photoResources";
import { PhotoStack } from "./PhotoSlide";
import { NumberShell } from "./NumberShell";
export function Logo({
  source,
  onMissing,
}: {
  source: string | null;
  onMissing?: (v: boolean) => void;
}) {
  const standalone = document.documentElement.dataset.standalone === "true";
  const [ok, setOk] = useState(!!source || !standalone);
  useEffect(() => {
    const available = !!source || !standalone;
    setOk(available);
    if (!available) onMissing?.(true);
  }, [source, standalone, onMissing]);
  return ok ? (
    <img
      className="original-logo"
      src={source ?? "/assets/torah-ore-logo.png"}
      alt="Yeshivas Torah Ore Yerushalayim"
      onLoad={() => onMissing?.(false)}
      onError={() => {
        setOk(false);
        onMissing?.(true);
      }}
    />
  ) : (
    <div className="brand-wordmark">
      <span>YESHIVAS</span>
      <strong>TORAH ORE</strong>
      <span>YERUSHALAYIM</span>
    </div>
  );
}
function RollingDigitView({
  digit,
  s,
  reduced,
}: {
  digit: string;
  s: Settings;
  reduced: boolean;
}) {
  return (
    <span className="digit">
      <span className="digit-clip">
        <AnimatePresence initial={false} mode="popLayout">
          <motion.span
            className="rolling-glyph"
            key={digit}
            initial={{
              y: reduced || !s.rolling ? "0%" : "105%",
              rotateX: reduced || !s.rolling ? 0 : -18,
              opacity: reduced || !s.rolling ? 1 : 0,
            }}
            animate={{ y: "0%", opacity: 1, rotateX: 0 }}
            exit={{
              y: reduced || !s.rolling ? "0%" : "-98%",
              rotateX: reduced || !s.rolling ? 0 : 18,
              opacity: 0,
            }}
            transition={{
              duration: reduced || !s.rolling ? 0 : s.rollSpeed / 1000,
              ease: [0.22, 0.78, 0.18, 1],
            }}
          >
            <span className="glyph-bloom" aria-hidden="true">
              {digit}
            </span>
            <span className="digit-face">{digit}</span>
            {!reduced && s.rolling && (
              <span className="digit-glint" aria-hidden="true">
                {digit}
              </span>
            )}
          </motion.span>
        </AnimatePresence>
      </span>
    </span>
  );
}
const RollingDigit = memo(RollingDigitView);
function CountdownView({
  seconds,
  s,
  reduced,
  settled = false,
}: {
  settled?: boolean;
  seconds: number;
  s: Settings;
  reduced: boolean;
}) {
  const list = units(seconds);
  const host = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState({ width: 0, height: 0 });
  useLayoutEffect(() => {
    const el = host.current!;
    const update = () => {
      // Measure layout before the prize-reveal compositor transform. Measuring
      // the transformed rectangle would shrink the clock a second time.
      setBox({ width: el.clientWidth, height: el.clientHeight });
    };
    update();
    if (typeof ResizeObserver === "function") {
      const observer = new ResizeObserver(update);
      observer.observe(el);
      return () => observer.disconnect();
    }
    addEventListener("resize", update);
    return () => removeEventListener("resize", update);
  }, []);
  const geometry =
    box.width > 0 ? countdownLayout(list, box.width, box.height, s.scale) : [];
  // On portrait phones, travel across the two separate rows before merging
  // them; this prevents the hours and minutes from crossing through each other.
  const priorGeometry = useRef<ReturnType<typeof countdownLayout>>([]);
  const [gridFlight, setGridFlight] = useState<Map<
    string,
    ReturnType<typeof countdownLayout>[number]
  > | null>(null);
  useLayoutEffect(() => {
    const old = priorGeometry.current;
    if (
      !reduced &&
      old.length === 4 &&
      geometry.length === 3 &&
      box.width < 600 &&
      box.height > box.width * 0.85
    )
      setGridFlight(new Map(old.map((unit) => [unit.id, unit])));
    priorGeometry.current = geometry;
  });
  useEffect(() => {
    if (!gridFlight) return;
    const timer = setTimeout(() => setGridFlight(null), 1540);
    return () => clearTimeout(timer);
  }, [gridFlight]);
  const oldBox = useRef(box),
    resizeUntil = useRef(0);
  if (
    oldBox.current.width !== box.width ||
    oldBox.current.height !== box.height
  ) {
    oldBox.current = box;
    resizeUntil.current = performance.now() + 650;
  }
  const resizing = performance.now() < resizeUntil.current;
  const duration = reduced ? 0 : resizing ? 0.3 : 1.25;
  return (
    <motion.div
      ref={host}
      className="countdown-stage"
      initial={reduced || settled ? false : { opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduced ? 0 : 1.35, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="number-aureole" aria-hidden="true" />
      {!reduced && (
        <motion.div
          className="chapter-light"
          key={list.length}
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 0.18, 0] }}
          transition={{ duration: 1.8, times: [0, 0.45, 1] }}
        />
      )}
      <AnimatePresence initial={false}>
        {geometry.map((u) => (
          <motion.div
            key={u.id}
            className="positioned-unit"
            initial={false}
            animate={{
              x: gridFlight?.has(u.id)
                ? [gridFlight.get(u.id)!.x, u.x, u.x]
                : u.x,
              y: gridFlight?.has(u.id)
                ? [gridFlight.get(u.id)!.y, gridFlight.get(u.id)!.y, u.y]
                : u.y,
              fontSize: gridFlight?.has(u.id)
                ? [gridFlight.get(u.id)!.font, u.font, u.font]
                : u.font,
              opacity: 1,
            }}
            exit={{
              opacity: 0,
              y: u.y - 12,
              transition: { duration: reduced ? 0 : 0.24, ease: "easeOut" },
            }}
            transition={{
              duration,
              delay: reduced || resizing ? 0 : 0.24,
              times: gridFlight ? [0, 0.65, 1] : undefined,
              ease: [0.22, 1, 0.36, 1],
            }}
          >
            <div className="unit">
              <NumberShell seconds={seconds} s={s} reduced={reduced}>
                {String(u.value)
                  .padStart(2, "0")
                  .split("")
                  .map((d, j) => (
                    <RollingDigit key={j} digit={d} s={s} reduced={reduced} />
                  ))}
              </NumberShell>
              <div className="unit-label">{u.id}</div>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
      <AnimatePresence initial={false}>
        {geometry
          .filter((u) => u.colon)
          .map((u) => (
            <motion.span
              className="positioned-colon"
              key={"separator-" + u.id}
              aria-hidden="true"
              initial={{ opacity: 0, x: u.colonX, y: u.y, fontSize: u.font }}
              animate={{ x: u.colonX, y: u.y, fontSize: u.font, opacity: 1 }}
              exit={{
                opacity: 0,
                transition: { duration: reduced ? 0 : 0.12 },
              }}
              transition={{
                duration,
                delay: reduced || resizing ? 0 : 0.24,
                ease: [0.22, 1, 0.36, 1],
                opacity: {
                  duration: reduced ? 0 : 0.2,
                  delay: reduced ? 0 : gridFlight ? 1.2 : 0,
                },
              }}
            >
              <span>:</span>
            </motion.span>
          ))}
      </AnimatePresence>
      <span className="sr-only" role="timer">
        {list.map((u) => `${u.value} ${u.id}`).join(", ")}
      </span>
    </motion.div>
  );
}
export const Countdown = memo(CountdownView);
function SlideshowView({
  photos,
  s,
  hidden,
  reduced,
  onReady,
  onPhoto,
  paused = false,
  nextSignal = 0,
}: {
  onReady?: (ready: boolean) => void;
  onPhoto?: (info: LivePhotoInfo) => void;
  paused?: boolean;
  nextSignal?: number;
  photos: Photo[];
  s: Settings;
  hidden: boolean;
  reduced: boolean;
}) {
  const [{ urls, sequence }, setPlayback] = useState<{
    urls: { id: string; url: string }[];
    sequence: PhotoSequence;
  }>(() => ({ urls: [], sequence: createPhotoSequence([], s.photoOrder) }));
  const order = useRef(s.photoOrder);
  order.current = s.photoOrder;
  useEffect(() => {
    setPlayback((previous) => {
      const next = reconcilePhotoSequence(
        previous.sequence,
        previous.urls.map((p) => p.id),
        s.photoOrder,
      );
      return next === previous.sequence
        ? previous
        : { ...previous, sequence: next };
    });
  }, [s.photoOrder]);
  // Decode the next real image during the hold, after the current reveal.
  // Its original pixels remain in a bounded two-image cache until needed.
  useEffect(() => {
    if (hidden || reduced || urls.length < 2) return;
    const next = urls.find((p) => p.id === nextPhotoId(sequence));
    if (!next) return;
    const timer = setTimeout(
      () => {
        void decodedPhotos.get(next.url).catch(() => {});
      },
      (Math.min(s.fade, s.duration / 2) + 0.4) * 1000,
    );
    return () => clearTimeout(timer);
  }, [urls, sequence, hidden, reduced, s.fade, s.duration]);
  const index = sequence.index;
  const advanceRef = useRef(() => {}),
    seenSignal = useRef(nextSignal);
  const galleryLeases = useRef<{ url: string; release: () => void }[]>([]);
  useEffect(
    () => () => {
      galleryLeases.current.forEach((lease) => lease.release());
      galleryLeases.current = [];
      decodedPhotos.clear();
    },
    [],
  );
  useEffect(() => {
    let cancelled = false;
    const next = photos.map((p) => ({
      id: p.id,
      ...acquirePhoto(p),
    }));
    void (async () => {
      let first = 0;
      for (; first < next.length; first++) {
        if (cancelled) break;
        try {
          await decodedPhotos.get(next[first].url);
          break;
        } catch {
          /* Skip unreadable source. */
        }
      }
      if (cancelled) {
        next.forEach((lease) => lease.release());
        return;
      }
      const ready = next.slice(first),
        old = galleryLeases.current;
      galleryLeases.current = ready;
      decodedPhotos.retain(ready.map((p) => p.url));
      next.slice(0, first).forEach((lease) => lease.release());
      setPlayback((previous) => ({
        urls: ready.map(({ id, url }) => ({ id, url })),
        sequence: reconcilePhotoSequence(
          previous.sequence,
          ready.map((p) => p.id),
          order.current,
        ),
      }));
      // Visible/outgoing slide layers retain their own leases until unmounted.
      old.forEach((lease) => lease.release());
      onReady?.(ready.length > 0);
    })();
    return () => {
      cancelled = true;
      next.forEach((lease) => {
        if (!galleryLeases.current.includes(lease)) lease.release();
      });
    };
  }, [photos, onReady]);
  useEffect(() => {
    if (urls.length < 2) {
      advanceRef.current = () => {};
      return;
    }
    let cancelled = false,
      busy = false;
    const advance = async () => {
      if (busy) return;
      busy = true;
      let candidate = sequence;
      for (let offset = 1; offset <= urls.length && !cancelled; offset++) {
        candidate = advancePhotoSequence(candidate);
        const next = urls.find((p) => p.id === currentPhotoId(candidate));
        if (!next) continue;
        try {
          await decodedPhotos.get(next.url);
          if (!cancelled)
            setPlayback((previous) => ({ ...previous, sequence: candidate }));
          break;
        } catch {
          /* Try the next photograph. */
        }
      }
      busy = false;
    };
    advanceRef.current = () => {
      void advance();
    };
    const timer =
      !paused && !hidden
        ? setInterval(() => void advance(), Math.max(5, s.duration) * 1000)
        : undefined;
    return () => {
      cancelled = true;
      clearInterval(timer);
      advanceRef.current = () => {};
    };
  }, [urls, sequence, s.duration, hidden, paused]);
  useEffect(() => {
    if (seenSignal.current !== nextSignal) {
      seenSignal.current = nextSignal;
      advanceRef.current();
    }
  }, [nextSignal]);
  const current = urls.find((p) => p.id === currentPhotoId(sequence));
  const currentPhoto = photos.find((p) => p.id === current?.id);
  useEffect(() => {
    let cancelled = false;
    if (!currentPhoto) {
      onPhoto?.({
        id: null,
        name: "No photograph",
        nextName: "—",
        index: 0,
        count: 0,
      });
      return;
    }
    const photo = currentPhoto;
    void (
      photo.analysis
        ? Promise.resolve(photo.analysis)
        : photo.blob.size ? analyzePhoto(photo.blob) : Promise.resolve({brightness:0.4,highlights:0})
    ).then((analysis) => {
      if (!cancelled)
        onPhoto?.({
          id: photo.id,
          name: photo.name,
          nextName:
            photos.find((p) => p.id === nextPhotoId(sequence))?.name ??
            photo.name,
          index: index + 1,
          count: urls.length,
          analysis,
        });
    });
    return () => {
      cancelled = true;
    };
  }, [currentPhoto, index, sequence, urls, photos, onPhoto]);
  return (
    <div
      className={`slideshow ${hidden ? "faded" : ""}`}
      style={
        {
          "--photo-opacity": s.mode === "photos" ? 1 : s.photoOpacity,
        } as React.CSSProperties
      }
    >
      <div className="photo-surface">
        <PhotoStack
          url={current?.url}
          focus={currentPhoto}
          seed={
            index +
            (current?.id ?? "")
              .split("")
              .reduce((a, c) => a + c.charCodeAt(0), 0)
          }
          s={s}
          reduced={reduced}
          preload={!hidden}
        />
      </div>
    </div>
  );
}

export const Slideshow = memo(SlideshowView);
