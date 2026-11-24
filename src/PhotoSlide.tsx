import { chooseInkSeed, inkProfile } from "./inkSpread";
import { memo, useEffect, useRef, useState } from "react";
import { decodeImage } from "./compatibility";
import {
  beginPhoto,
  completePhoto,
  emptyHandoff,
  failPhoto,
  type PhotoHandoff,
} from "./photoHandoff";
import { focalPoint, type PhotoFocus } from "./photoFraming";
import {
  chooseTransition,
  entryPose,
  filmEase,
  hasField,
  photoZoom,
  randomAt,
  revealSeed,
  type TransitionStyle,
  type FieldStyle,
} from "./photoTransitions";
import { matteDimensions } from "./matteModel";
import { photoURLs } from "./photoResources";
import { prepareMatte, warmMatte } from "./mattePreparation";
import { createPhotoGPU, canUsePhotoGPU, type PhotoGPU } from "./photoGPU";
import type { Settings } from "./engine";
let lastPlayedInk: number | undefined;
type Playing = {
  token: number;
  style: TransitionStyle;
  started: number;
  duration: number;
  framed: boolean;
};
export function PhotoSlide({
  url,
  s,
  reduced,
  seed,
  style,
  focus,
  onStarted,
  onRevealed,
  onFailed,
  departure,
}: {
  url: string;
  s: Settings;
  reduced: boolean;
  seed: number;
  style: TransitionStyle;
  focus?: PhotoFocus;
  onStarted: (started: Omit<Playing, "token">) => void;
  onRevealed: () => void;
  onFailed: () => void;
  departure: Playing | null;
}) {
  useEffect(() => photoURLs.retain(url), [url]);
  const [settings] = useState(() => ({
    duration: Math.max(0.3, Math.min(s.fade, s.duration / 2)),
    quality: s.quality,
    zoom: s.zoom,
    lifetime: s.duration + s.fade,
    light: s.lighting,
    gpu: hasField(style) && !reduced && canUsePhotoGPU(s.quality),
  }));
  const [ready, setReady] = useState(false),
    [prepared, setPrepared] = useState(false),
    [gpu, setGPU] = useState(false),
    [revealed, setRevealed] = useState(false),
    [started, setStarted] = useState<number | null>(null);
  const host = useRef<HTMLDivElement>(null),
    entry = useRef<HTMLDivElement>(null),
    exit = useRef<HTMLDivElement>(null),
    camera = useRef<HTMLDivElement>(null),
    image = useRef<HTMLImageElement>(null),
    surface = useRef<HTMLCanvasElement>(null),
    light = useRef<HTMLDivElement>(null);
  const renderer = useRef<PhotoGPU | null>(null),
    progress = useRef(0),
    finished = useRef(false);
  const callbacks = useRef({ onStarted, onRevealed, onFailed });
  callbacks.current = { onStarted, onRevealed, onFailed };
  useEffect(() => {
    if (!ready) return;
    let active = true,
      warmFrame = 0;
    const prewarm = () => {
      if (!active) return;
      // Give the compositor two frames to upload/raster the decoded image
      // before the handoff starts. The outgoing photograph stays opaque.
      if (host.current) {
        host.current.style.opacity = ".001";
        host.current.style.willChange = "opacity";
      }
      warmFrame = requestAnimationFrame(() => {
        warmFrame = requestAnimationFrame(() => {
          if (active) setPrepared(true);
        });
      });
    };
    if (!settings.gpu) {
      prewarm();
      return () => {
        active = false;
        cancelAnimationFrame(warmFrame);
      };
    }
    const controller = new AbortController(),
      leases: { revoke: () => void }[] = [];
    const texture = async (kind: FieldStyle | "wash-frame") => {
      const lease = await prepareMatte(
        {
          kind,
          seed,
          ...matteDimensions(
            innerWidth,
            innerHeight,
            settings.quality,
            kind === "wash-frame",
          ),
        },
        controller.signal,
      );
      leases.push(lease);
      const img = new Image();
      img.src = lease.url;
      await decodeImage(img);
      return img;
    };
    void (async () => {
      try {
        const [field, frame] = await Promise.all([
          texture(style as FieldStyle),
          style === "wash" ? texture("wash-frame") : Promise.resolve(null),
        ]);
        if (!active) return;
        renderer.current = createPhotoGPU(
          surface.current!,
          image.current!,
          field,
          frame,
          {
            style,
            seed,
            zoom: settings.zoom,
            lifetime: settings.lifetime,
            quality: settings.quality,
            focus,
            onLost: () => {
              renderer.current?.dispose();
              renderer.current = null;
              setGPU(false);
            },
          },
        );
        setGPU(true);
      } catch {
        if (active) setGPU(false);
      } finally {
        leases.forEach((l) => l.revoke());
        prewarm();
      }
    })();
    return () => {
      active = false;
      cancelAnimationFrame(warmFrame);
      controller.abort();
      leases.forEach((l) => l.revoke());
      renderer.current?.dispose();
      renderer.current = null;
    };
    // One preparation per appearance, never during settings or focal-point edits.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, settings, seed, style]);
  useEffect(() => {
    renderer.current?.focus(focus);
  }, [focus, gpu]);
  useEffect(() => {
    renderer.current?.reduced(reduced);
  }, [reduced, gpu]);
  useEffect(() => {
    renderer.current?.departure(departure);
  }, [departure, gpu]);
  useEffect(() => {
    if (ready && prepared && started === null) setStarted(performance.now());
  }, [ready, prepared, started]);
  // Native blends use compositor animations. Procedural reveals keep the same
  // full-resolution GPU photo for their entire lifetime; no end-of-reveal swap.
  useEffect(() => {
    const el = camera.current;
    if (!el || started === null || reduced || settings.zoom === 0 || gpu)
      return;
    const remaining = Math.max(
        2000,
        settings.lifetime * 1000 - (performance.now() - started),
      ),
      end = photoZoom(settings.lifetime, settings.zoom, settings.lifetime),
      sx = (randomAt(seed, 12) - 0.5) * 1.1,
      sy = (randomAt(seed, 13) - 0.5) * 0.7;
    const to = `translate(${sx}%,${sy}%) scale(${end})`;
    let animation: Animation | undefined,
      raf = 0;
    if (typeof el.animate === "function") {
      animation = el.animate(
        [{ transform: getComputedStyle(el).transform }, { transform: to }],
        { duration: remaining, easing: "linear", fill: "forwards" },
      );
      el.style.willChange = "transform";
      animation.onfinish = () => {
        el.style.transform = to;
        animation?.cancel();
        el.style.willChange = "auto";
      };
    } else {
      const begin = performance.now();
      const draw = (now: number) => {
        const p = Math.min(1, (now - begin) / remaining);
        el.style.transform = `translate(${sx * p}%,${sy * p}%) scale(${photoZoom(p * settings.lifetime, settings.zoom, settings.lifetime)})`;
        if (p < 1) raf = requestAnimationFrame(draw);
      };
      raf = requestAnimationFrame(draw);
    }
    return () => {
      if (animation) {
        const pose = getComputedStyle(el).transform;
        animation.onfinish = null;
        animation.cancel();
        el.style.transform = pose;
      }
      cancelAnimationFrame(raf);
      el.style.willChange = "auto";
    };
  }, [started, reduced, settings.zoom, settings.lifetime, seed, gpu]);
  useEffect(() => {
    if (started === null || revealed) return;
    const el = host.current!,
      plane = entry.current!,
      duration = (reduced ? 0.18 : settings.duration) * 1000,
      start = performance.now(),
      pose = entryPose(style, seed),
      from = progress.current;
    let raf = 0,
      alpha: Animation | undefined,
      motion: Animation | undefined;
    const gl = renderer.current;
    callbacks.current.onStarted({
      style,
      started: start,
      duration,
      framed: !!gl && style === "wash",
    });
    if (gl) {
      el.style.opacity = "1";
      gl.start(started, settings.duration * 1000);
    } else {
      if (!reduced && typeof plane.animate === "function") {
        motion = plane.animate(
          [{ transform: pose.from }, { transform: pose.to }],
          { duration, easing: "cubic-bezier(.22,.7,.2,1)", fill: "forwards" },
        );
        plane.style.willChange = "transform";
      } else plane.style.transform = pose.to;
      if (typeof el.animate === "function")
        alpha = el.animate(
          Array.from({ length: 25 }, (_, i) => ({
            opacity: from + (1 - from) * filmEase(i / 24),
            offset: i / 24,
          })),
          { duration, easing: "linear", fill: "forwards" },
        );
    }
    const draw = (now: number) => {
      const linear = Math.min(1, (now - start) / duration),
        p = from + (1 - from) * filmEase(linear);
      progress.current = p;
      if (gl) gl.progress(p);
      else if (!alpha) el.style.opacity = String(p);
      if (light.current)
        light.current.style.opacity = String(
          reduced
            ? 0
            : Math.sin(Math.PI * linear) ** 2 * Math.min(1, settings.light),
        );
      if (linear < 1) raf = requestAnimationFrame(draw);
      else {
        el.style.opacity = "1";
        el.style.willChange = "auto";
        plane.style.transform = gl ? "none" : pose.to;
        plane.style.willChange = "auto";
        motion?.cancel();
        alpha?.cancel();
        if (!finished.current) {
          finished.current = true;
          setRevealed(true);
          callbacks.current.onRevealed();
        }
      }
    };
    raf = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(raf);
      alpha?.cancel();
      motion?.cancel();
      plane.style.willChange = "auto";
    };
  }, [
    started,
    revealed,
    reduced,
    style,
    seed,
    settings.duration,
    settings.light,
    gpu,
  ]);
  useEffect(() => {
    const plane = exit.current,
      el = host.current;
    if (
      !departure ||
      !revealed ||
      !plane ||
      !el ||
      reduced ||
      typeof plane.animate !== "function"
    )
      return;
    const elapsed = performance.now() - departure.started,
      pose = entryPose(departure.style, seed);
    const drift = !gpu
      ? plane.animate(
          [
            { transform: getComputedStyle(plane).transform },
            { transform: pose.exit },
          ],
          {
            duration: departure.duration,
            easing: "cubic-bezier(.2,.4,.25,1)",
            fill: "forwards",
          },
        )
      : undefined;
    if (drift) drift.currentTime = elapsed;
    const fade = departure.framed
      ? el.animate(
          [
            { opacity: 1, offset: 0 },
            { opacity: 1, offset: 0.78 },
            { opacity: 0, offset: 1 },
          ],
          { duration: departure.duration, easing: "linear", fill: "forwards" },
        )
      : undefined;
    if (fade) fade.currentTime = elapsed;
    return () => {
      if (drift) {
        const frozen = getComputedStyle(plane).transform;
        drift.cancel();
        plane.style.transform = frozen;
      }
      fade?.cancel();
    };
  }, [departure, revealed, reduced, seed, gpu]);
  return (
    <div
      ref={host}
      className={`photo-slide photo-transition-${style}`}
      data-photo-renderer={gpu ? "gpu-image" : "native-image"}
      data-transition={style}
      data-ink-family={style === "ink" ? inkProfile(seed).family : undefined}
      data-reveal-state={
        revealed ? "settled" : started === null ? "preparing" : "revealing"
      }
      style={
        {
          opacity: revealed ? 1 : 0,
          "--photo-x": `${focalPoint(focus, false).x * 100}%`,
          "--photo-y": `${focalPoint(focus, false).y * 100}%`,
          "--portrait-photo-x": `${focalPoint(focus, true).x * 100}%`,
          "--portrait-photo-y": `${focalPoint(focus, true).y * 100}%`,
        } as React.CSSProperties
      }
    >
      <div className="photo-frame">
        <div className="photo-exit-plane" ref={exit}>
          <div className="photo-entry-plane" ref={entry}>
            <div
              className="photo-camera"
              ref={camera}
              style={{ transform: "scale(1.025)" }}
            >
              <img
                ref={image}
                className="photo-native-image"
        crossOrigin="anonymous"
                src={url}
                decoding="async"
                alt=""
                style={{ visibility: gpu ? "hidden" : "visible" }}
                onLoad={(e) => {
                  void decodeImage(e.currentTarget)
                    .then(() => setReady(true))
                    .catch(() => callbacks.current.onFailed());
                }}
                onError={() => callbacks.current.onFailed()}
              />
            </div>
          </div>
        </div>
        <canvas
          ref={surface}
          className="photo-gpu-surface"
          aria-hidden="true"
          style={{ visibility: gpu ? "visible" : "hidden" }}
        />
        {style === "lumen" && (
          <div
            ref={light}
            className="photo-transition-light"
            aria-hidden="true"
          />
        )}
      </div>
    </div>
  );
}
function PhotoStackView({
  url,
  seed,
  s,
  reduced,
  focus,
  preload = true,
}: {
  url?: string;
  seed: number;
  s: Settings;
  reduced: boolean;
  focus?: PhotoFocus;
  preload?: boolean;
}) {
  const [state, setState] = useState<PhotoHandoff>(emptyHandoff),
    [playing, setPlaying] = useState<Playing | null>(null);
  const serial = useRef(0),
    session = useRef(Math.floor(Math.random() * 0x7fffffff)),
    lastInk = useRef<number | undefined>(lastPlayedInk),
    inkPlan = useRef<{ token: number; seed: number; previous: number } | null>(
      null,
    );
  useEffect(
    () => (state.pending ? photoURLs.retain(state.pending.url) : undefined),
    [state.pending?.url],
  );
  useEffect(() => {
    if (!url) {
      setState(emptyHandoff());
      setPlaying(null);
      return;
    }
    const token = ++serial.current,
      visit = revealSeed(seed, token, session.current);
    setState((old) => {
      const previous = old.incoming ?? old.shown;
      const style = chooseTransition(s.photoTransition, visit, previous?.style);
      const previousInk =
        previous?.style === "ink" ? previous.seed : lastInk.current;
      const inkSeed =
        style === "ink"
          ? inkPlan.current?.token === token &&
            inkPlan.current.previous === previousInk
            ? inkPlan.current.seed
            : chooseInkSeed(revealSeed(0, token, session.current), previousInk)
          : visit;
      return beginPhoto(old, {
        url,
        focus,
        token,
        seed: inkSeed,
        style,
      });
    });
  }, [url, seed, focus, s.photoTransition]);
  useEffect(() => {
    if (
      !preload ||
      state.incoming ||
      state.shown?.style !== "ink" ||
      s.photoTransition !== "ink" ||
      reduced ||
      !canUsePhotoGPU(s.quality)
    )
      return;
    const previous = state.shown.seed,
      token = serial.current + 1;
    const next = chooseInkSeed(revealSeed(0, token, session.current), previous);
    inkPlan.current = { token, seed: next, previous };
    // Prepare near the next handoff, even with very long photo holds.
    const delay = Math.max(
      450,
      (s.duration - Math.min(s.fade, s.duration / 2) - 8) * 1000,
    );
    const timer = setTimeout(() => {
      if (canUsePhotoGPU(s.quality))
        warmMatte({
          kind: "ink",
          seed: next,
          ...matteDimensions(innerWidth, innerHeight, s.quality),
        });
    }, delay);
    return () => clearTimeout(timer);
  }, [
    state.incoming,
    state.shown,
    s.photoTransition,
    s.quality,
    s.duration,
    s.fade,
    reduced,
    preload,
  ]);
  return (
    <>
      {[state.shown, state.incoming].map(
        (item) =>
          item && (
            <PhotoSlide
              key={item.token}
              url={item.url}
              seed={item.seed}
              style={item.style}
              focus={item.focus}
              s={s}
              reduced={reduced}
              departure={
                item === state.shown &&
                state.incoming &&
                playing?.token === state.incoming.token
                  ? playing
                  : null
              }
              onStarted={(event) => {
                if (item.style === "ink")
                  lastInk.current = lastPlayedInk = item.seed;
                setPlaying({ token: item.token, ...event });
              }}
              onRevealed={() => {
                setState((old) => completePhoto(old, item.token));
                setPlaying((old) => (old?.token === item.token ? null : old));
              }}
              onFailed={() => {
                setState((old) => failPhoto(old, item.token));
                setPlaying((old) => (old?.token === item.token ? null : old));
              }}
            />
          ),
      )}
    </>
  );
}

export const PhotoStack = memo(PhotoStackView);
