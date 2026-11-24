import {sharedEnabled,initializeShared,sharedSubscribe,sharedState} from "./sharedClient";
import {SharedAdminGate} from "./SharedAdmin";
import { appStorage, initializePackage } from "./packageContext";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { motion, MotionConfig } from "motion/react";
import { ArrowUpRight, Settings2, Play, MoveRight } from "lucide-react";
import "@fontsource/barlow-condensed/latin-800.css";
import "@fontsource/manrope/latin-400.css";
import "@fontsource/manrope/latin-500.css";
import "@fontsource/manrope/latin-600.css";
import "./style.css";
import "./cinematic.css";
import {
  activeTarget,
  loadSettings,
  remaining,
  startPreview,
  type Settings,
  type Preview,
} from "./engine";
import { usePhotoLibrary } from "./usePhotoLibrary";
import { Countdown, Logo, Slideshow } from "./Display";
import { SettingsPanel } from "./Settings";
import { Effects } from "./Effects";
import { Atmosphere } from "./Atmosphere";
import {
  useDisplayHealth,
  useOperatorShortcuts,
  type OperatorState,
} from "./Operator";
import { rehearsalFrame } from "./operatorEngine";
import { adaptiveLighting, type LivePhotoInfo } from "./photoFraming";
import { usePrizes, PrizeDisplay } from "./Prizes";
import { Finale } from "./Finale";
import {
  countdownIntensity,
  launchTimeline,
  zeroOpacity,
  photosHidden,
} from "./cinema";
import { rgb, mix, rgba } from "./colors";
import {
  compatibilityMode,
  displaySettings,
  watchReducedMotion,
  reducedMotionPreference,
  startupFailure,
  showPhotosOnly,
} from "./compatibility";
import { captureStandaloneShell } from "./eventExport";
captureStandaloneShell();
let loaded: ReturnType<typeof loadSettings>;
const safeMode = compatibilityMode();
document.documentElement.classList.toggle("compatibility", safeMode);
function App() {
  const prizes = usePrizes();
  const health = useDisplayHealth();
  const [photoInfo, setPhotoInfo] = useState<LivePhotoInfo>({
    id: null,
    name: "No photograph",
    nextName: "—",
    index: 0,
    count: 0,
  });
  const [paused, setPaused] = useState(false),
    [nextSignal, setNextSignal] = useState(0);
  const [rehearsalStarted, setRehearsalStarted] = useState<number | null>(null),
    [rehearsalLabel, setRehearsalLabel] = useState<string | null>(null);
  const rehearsalWasPaused = useRef(false);
  const [savedSettings, setS] = useState(loaded.settings);
  const [photoTest, setPhotoTest] = useState(false);
  const [photoTestRun, setPhotoTestRun] = useState(0);
  const s: Settings = useMemo(() => {
    const base = displaySettings(savedSettings, safeMode);
    return photoTest
      ? {
          ...base,
          mode: "photos",
          slideshow: true,
          photoOpacity: 1,
          photoShade: 0,
        }
      : base;
  }, [savedSettings, photoTest]);
  const [error, setError] = useState(loaded.error);
  const [admin, setAdmin] = useState(location.hash === "#settings" || location.pathname === "/admin");
  const [preview, setPreview] = useState<Preview>(null);
  const [now, setNow] = useState(Date.now());
  const gallery = usePhotoLibrary(() => save({
    ...savedSettings,
    slideshow: true,
    mode: savedSettings.mode === "cinematic" ? "blended" : savedSettings.mode,
  }));
  const photos = gallery.photos;
  const [photosReady, setPhotosReady] = useState(false);
  const [missing, setMissing] = useState(false);
  const [idle, setIdle] = useState(false);
  const [osReduced, setOsReduced] = useState(reducedMotionPreference);
  const [launchAt, setLaunchAt] = useState<number | null>(null);
  const previousTarget = useRef<number | null>(null);
  const target = activeTarget(s.deadline, preview);
  const secs = target === null ? null : remaining(target, now);
  const launched = secs === 0;
  const reduced = s.reduced || osReduced || s.animation === 0;
  const visualSeconds =
    target === null ? null : Math.max(0, (target - now) / 1000);
  const elapsed = launched
    ? Math.max(0, (now - (launchAt ?? target ?? now)) / 1000)
    : 0;
  const adaptive = adaptiveLighting(
    photoInfo.analysis,
    s.adaptiveLight && photosReady && !photosHidden(s.mode, s.slideshow, secs),
  );
  const intensity =
    s.dynamic && visualSeconds !== null
      ? countdownIntensity(visualSeconds) *
        s.animation *
        (launched ? 1 - 0.75 * launchTimeline(elapsed).settle : 1)
      : 0;
  useEffect(() => {
    // The clock needs at most ten updates per second for finale timing;
    // ordinary countdown rendering updates only when the displayed second changes.
    const timer = setInterval(
      () =>
        setNow((previous) => {
          const time = Date.now();
          return (target === null
            ? Math.floor(previous / 1000) !== Math.floor(time / 1000)
            : remaining(target, previous) !== remaining(target, time)) ||
            (target !== null && target - time <= 120000 && target > time) ||
            (launchAt !== null && time - launchAt < 16000)
            ? time
            : previous;
        }),
      100,
    );
    const wake = () => setNow(Date.now());
    document.addEventListener("visibilitychange", wake);
    addEventListener("focus", wake);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", wake);
      removeEventListener("focus", wake);
    };
  }, [launchAt, target]);
  useEffect(() => watchReducedMotion(setOsReduced), []);
  useEffect(()=>{
    if(!sharedEnabled())return;
    return sharedSubscribe(()=>{
      const next=loadSettings().settings;
      setS(old=>JSON.stringify(old)===JSON.stringify(next)?old:next);
    });
  },[]);
  useEffect(() => {
    document.documentElement.dataset.appReady = "true";
    const panel = document.getElementById("startup-status");
    if (panel) panel.style.display = "none";
  }, []);
  useEffect(() => {
    if (target !== previousTarget.current) {
      previousTarget.current = target;
      setLaunchAt(target !== null && target <= Date.now() ? target : null);
    } else if (launched && launchAt === null) setLaunchAt(target);
  }, [target, launched, launchAt]);
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const move = () => {
      setIdle(false);
      clearTimeout(timer);
      timer = setTimeout(() => setIdle(true), 3000);
    };
    const key = (e: KeyboardEvent) => {
      if (
        (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === "s") ||
        e.key === "F2"
      ) {
        e.preventDefault();
        setAdmin((v) => !v);
      }
      if (e.key === "Escape") setAdmin(false);
    };
    const hash = () => {
      if (location.hash === "#settings") setAdmin(true);
    };
    addEventListener("mousemove", move);
    addEventListener("keydown", key);
    addEventListener("hashchange", hash);
    move();
    return () => {
      clearTimeout(timer);
      removeEventListener("mousemove", move);
      removeEventListener("keydown", key);
      removeEventListener("hashchange", hash);
    };
  }, []);
  useEffect(() => {
    if (!admin) return;
    const el = document.querySelector<HTMLElement>(".admin button");
    el?.focus();
    const trap = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;
      const controls = Array.from(
        document.querySelectorAll<HTMLElement>(
          ".admin button:not(:disabled),.admin input:not([hidden]),.admin select",
        ),
      ).filter((x) => x.offsetParent !== null);
      const first = controls[0],
        last = controls[controls.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last?.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first?.focus();
      }
    };
    addEventListener("keydown", trap);
    return () => removeEventListener("keydown", trap);
  }, [admin]);
  function save(next: Settings) {
    setS(next);
    try {
      appStorage.setItem("torah-ore-settings-v1", JSON.stringify(next));
      setError("");
    } catch {
      setError(
        "Could not persist settings. Browser storage is unavailable or full. Keep this page open and enable storage.",
      );
    }
  }
  const runPreview = (n: number) => {
    if (rehearsalStarted !== null) setPaused(rehearsalWasPaused.current);
    setRehearsalStarted(null);
    setRehearsalLabel(null);
    setPhotoTest(false);
    setPreview(startPreview(n));
    setLaunchAt(n <= 0 ? Date.now() + n * 1000 : null);
    setNow(Date.now());
  };
  function exitPreview() {
    if (rehearsalStarted !== null) setPaused(rehearsalWasPaused.current);
    setRehearsalStarted(null);
    setRehearsalLabel(null);
    setPhotoTest(false);
    setPreview(null);
    setLaunchAt(null);
    setNow(Date.now());
  }
  useEffect(() => {
    if (rehearsalStarted === null) return;
    let index = -1;
    const tick = () => {
      const time = Date.now(),
        f = rehearsalFrame(rehearsalStarted, time);
      if (f.done) {
        setPaused(rehearsalWasPaused.current);
        setRehearsalStarted(null);
        setRehearsalLabel(null);
        setPreview(null);
        setLaunchAt(null);
        setNow(time);
        return;
      }
      if (f.index !== index) {
        index = f.index;
        setPhotoTest(false);
        setPreview(f.preview);
        setLaunchAt(null);
        setRehearsalLabel(f.label);
      }
      setNow(time);
    };
    tick();
    const timer = setInterval(tick, 100);
    return () => clearInterval(timer);
  }, [rehearsalStarted]);
  const operator: OperatorState = {
    deadline: savedSettings.deadline,
    preview,
    photo: photoInfo,
    paused,
    health,
    prizes,
    rehearsal: rehearsalLabel,
    next: () => setNextSignal((n) => n + 1),
    pause: () => setPaused((p) => !p),
    startRehearsal: () => {
      rehearsalWasPaused.current = paused;
      setPaused(false);
      setRehearsalStarted(Date.now());
      setAdmin(false);
    },
    stopRehearsal: exitPreview,
    exitPreview,
  };
  useOperatorShortcuts({
    open: () => setAdmin((v) => !v),
    next: operator.next,
    pause: operator.pause,
    prize: () => {
      try {
        prizes.startPrepared();
      } catch (e) {
        setError(String(e));
        setAdmin(true);
      }
    },
    hide: prizes.stop,
  });
  return (
    <MotionConfig reducedMotion={reduced ? "always" : "never"}>
      <main
        className={`display cinema ${prizes.phase.visible ? "has-prize" : ""} phase-${launched ? "launched" : secs === null ? "setup" : secs < 60 ? "seconds" : secs < 3600 ? "minutes" : secs < 86400 ? "hours" : "days"} palette-${s.preset} ${idle && !admin ? "hide-cursor" : ""} ${reduced ? "reduced" : ""} ${launched ? "launched" : ""}`}
        style={
          {
            "--gold-brightness": s.gold,
            "--photo-treatment-opacity":
              photos.length > 0 && !photosHidden(s.mode, s.slideshow, secs)
                ? 1
                : 0,
            "--background-color": s.backgroundColor,
            "--atmosphere-color": s.atmosphereColor,
            "--digit-color": s.digitColor,
            "--digit-highlight": mix(s.digitColor, "#ffffff", 0.4),
            "--digit-shadow": mix(s.digitColor, "#000000", 0.22),
            "--label-color": s.labelColor,
            "--light-color": s.lightColor,
            "--light-rgb": rgb(s.lightColor).join(","),
            "--halo-color": s.haloColor,
            "--halo-rgb": rgb(s.haloColor).join(","),
            "--launch-color": s.launchColor,
            "--launch-shadow": mix(s.launchColor, "#000000", 0.22),
            "--launch-highlight": mix(s.launchColor, "#ffffff", 0.45),
            "--shockwave-color": s.shockwaveColor,
            "--photo-shade":
              s.mode === "photos"
                ? 0
                : Math.min(0.8, s.photoShade + adaptive.shade),
            "--photo-tint": rgba(
              s.photoTintColor,
              s.mode === "photos" ? 0.03 : 0.16,
            ),
            "--lighting": s.lighting,
            "--intensity": intensity,
            "--tension": Math.min(1, intensity / 4.5),
            "--halo-opacity": s.haloIntensity * (0.35 + intensity * 0.12),
          } as React.CSSProperties
        }
      >
        <div className="atmosphere" />
        {!safeMode && (
          <Atmosphere s={s} reduced={reduced} intensity={intensity} />
        )}
        <Slideshow
          key={photoTestRun}
          photos={photos}
          onReady={setPhotosReady}
          onPhoto={setPhotoInfo}
          paused={paused}
          nextSignal={nextSignal}
          s={s}
          reduced={reduced}
          hidden={photosHidden(s.mode, s.slideshow, secs)}
        />
        <div className="photo-treatment" />
        {!safeMode && (
          <Effects
            s={s}
            reduced={reduced}
            intensity={intensity}
            deadline={target}
            photoFlare={adaptive.flare}
            photoActive={
              photosReady && !photosHidden(s.mode, s.slideshow, secs)
            }
            launchAt={launched ? launchAt : null}
          />
        )}
        <div className="vignette" />
        {!admin && (
          <button
            className="touch-settings"
            aria-label="Open event settings"
            onClick={() => setAdmin(true)}
          >
            <Settings2 size={20} />
          </button>
        )}
        {(!launched || elapsed < 2.65) &&
          !showPhotosOnly(s.mode, s.slideshow, photosReady, secs) && (
            <motion.div
              className="public-composition"
              initial={false}
              animate={{ opacity: launched ? zeroOpacity(elapsed) : 1 }}
              transition={{ duration: reduced ? 0 : 0.1, ease: "linear" }}
            >
              <header className="display-header">
                <Logo source={s.logo} onMissing={setMissing} />
              </header>
              {secs === null ? (
                <section className="setup">
                  <div className="setup-card">
                    <span className="status-dot muted" />
                    <span>COUNTDOWN NOT CONFIGURED</span>
                  </div>
                  <div className="setup-actions">
                    <button className="primary" onClick={() => setAdmin(true)}>
                      <Settings2 size={16} /> Configure event{" "}
                      <ArrowUpRight size={16} />
                    </button>
                    <button
                      className="demo-button"
                      onClick={() => runPreview(864000)}
                    >
                      <Play size={14} /> Experience the countdown
                    </button>
                  </div>
                </section>
              ) : (
                <section className="clock-section">
                  <Countdown
                    seconds={secs}
                    s={s}
                    reduced={reduced}
                    settled={launched}
                  />
                </section>
              )}
            </motion.div>
          )}
        {launched &&
          !showPhotosOnly(s.mode, s.slideshow, photosReady, secs) && (
            <Finale
              s={s}
              elapsed={elapsed}
              launchAt={launchAt ?? target}
              reduced={reduced}
              onMissing={setMissing}
            />
          )}
        <PrizeDisplay controller={prizes} reduced={reduced} />
        {admin && (
          <SharedAdminGateWrapper close={()=>setAdmin(false)}><SettingsPanel
            s={savedSettings}
            prizes={prizes}
            operator={operator}
            photoStatus={
              photos.length === 0
                ? "No photos uploaded."
                : !photosReady
                  ? "Photos are loading or could not be decoded."
                  : !s.slideshow
                    ? "Hidden: slideshow is switched off."
                    : s.mode === "cinematic"
                      ? "Hidden: cinematic-only display mode."
                      : s.mode !== "photos" && launched
                        ? "Hidden: the campaign has launched."
                        : s.mode !== "photos" && secs !== null && secs <= 10
                          ? "Hidden: final ten seconds."
                          : `Slideshow active · ${photos.length} photo${photos.length === 1 ? "" : "s"}.`
            }
            onTestPhotos={() => {
              runPreview(864000);
              setPhotoTestRun((n) => n + 1);
              setPhotoTest(true);
              setAdmin(false);
            }}
            set={save}
            close={() => setAdmin(false)}
            gallery={gallery}
            preview={preview}
            onPreview={runPreview}
            exitPreview={exitPreview}
            missing={missing}
            error={
              safeMode
                ? "Compatibility mode is active: extra effects are disabled for this HTML viewer. Your saved appearance settings are retained. For full effects, open the regular HTML in Chrome or Edge."
                : error
            }
          /></SharedAdminGateWrapper>
        )}
      </main>
    </MotionConfig>
  );
}
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { error: boolean }
> {
  state = { error: false };
  componentDidCatch(error: Error) {
    startupFailure(
      "The display stopped: " +
        error.message +
        ". Try compatibility mode below, or open this file in Chrome or Edge.",
    );
  }
  static getDerivedStateFromError() {
    return { error: true };
  }
  render() {
    return this.state.error ? (
      <div className="recovery">
        <h1>Let’s restore the display.</h1>
        <p>
          Your saved settings and photos are retained. Reload to resume the live
          clock.
        </p>
        <button onClick={() => location.reload()}>
          Reload display <MoveRight size={16} />
        </button>
      </div>
    ) : (
      this.props.children
    );
  }
}
function SharedAdminGateWrapper({children,close}:{children:React.ReactNode;close:()=>void}){return sharedEnabled()?<SharedAdminGate close={close}>{children}</SharedAdminGate>:children;}
async function start() {
  try {
    await initializePackage();
    await initializeShared();
    loaded = loadSettings();
    createRoot(document.getElementById("root")!).render(
      <ErrorBoundary>
        <App />
      </ErrorBoundary>,
    );
  } catch (error) {
    startupFailure(
      `Could not open this event file: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}
void start();

if (
  "serviceWorker" in navigator &&
  import.meta.env.PROD &&
  location.protocol !== "file:" &&
  document.documentElement.dataset.standalone !== "true"
)
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  });
