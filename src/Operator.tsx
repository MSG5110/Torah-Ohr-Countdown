import { SettingsSection } from "./SettingsSection";
import { useEffect, useRef, useState } from "react";
import { DateTime } from "luxon";
import { ZONE, remaining, type Preview } from "./engine";
import { prizeClock } from "./prizeEngine";
import type { PrizeController } from "./Prizes";
import type { LivePhotoInfo } from "./photoFraming";
import { frameSummary } from "./operatorEngine";
export function useDisplayHealth() {
  const [health, setHealth] = useState({
    uptime: 0,
    fps: 0,
    p95: 0,
    slow: 0,
    heapMB: null as number | null,
    hidden: false,
    frames: 0,
  });
  useEffect(() => {
    const started = performance.now(),
      ring = new Float32Array(180);
    let cursor = 0,
      last = 0,
      frames = 0,
      raf = 0;
    const frame = (now: number) => {
      if (!document.hidden) {
        if (last) ring[cursor++ % ring.length] = now - last;
        frames++;
        last = now;
      } else last = 0;
      raf = requestAnimationFrame(frame);
    };
    const visibility = () => {
      last = 0;
    };
    document.addEventListener("visibilitychange", visibility);
    raf = requestAnimationFrame(frame);
    const timer = setInterval(() => {
      const memory = (
        performance as Performance & { memory?: { usedJSHeapSize: number } }
      ).memory;
      setHealth({
        ...frameSummary(Array.from(ring)),
        uptime: Math.floor((performance.now() - started) / 1000),
        heapMB: memory ? Math.round(memory.usedJSHeapSize / 1048576) : null,
        hidden: document.hidden,
        frames,
      });
    }, 3000);
    return () => {
      clearInterval(timer);
      cancelAnimationFrame(raf);
      document.removeEventListener("visibilitychange", visibility);
    };
  }, []);
  return health;
}
export type DisplayHealth = ReturnType<typeof useDisplayHealth>;
export function useOperatorShortcuts(actions: {
  open: () => void;
  next: () => void;
  pause: () => void;
  prize: () => void;
  hide: () => void;
}) {
  const live = useRef(actions);
  live.current = actions;
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (!e.altKey || e.ctrlKey || e.metaKey || e.repeat) return;
      const el = e.target as HTMLElement;
      if (el?.closest("input,select,textarea,[contenteditable=true]")) return;
      const map: Record<string, () => void> = {
        o: () => live.current.open(),
        ArrowRight: () => live.current.next(),
        p: () => live.current.pause(),
        r: () => live.current.prize(),
        h: () => live.current.hide(),
      };
      const action = map[e.key.length === 1 ? e.key.toLowerCase() : e.key];
      if (action) {
        e.preventDefault();
        action();
      }
    };
    addEventListener("keydown", key);
    return () => removeEventListener("keydown", key);
  }, []);
}
export type OperatorState = {
  deadline: number | null;
  preview: Preview;
  photo: LivePhotoInfo;
  paused: boolean;
  health: DisplayHealth;
  prizes: PrizeController;
  rehearsal: string | null;
  next: () => void;
  pause: () => void;
  startRehearsal: () => void;
  stopRehearsal: () => void;
  exitPreview: () => void;
};
export function OperatorDashboard({ state: o }: { state: OperatorState }) {
  const [message, setMessage] = useState("");
  const deadline =
    o.deadline === null
      ? "Not configured"
      : DateTime.fromMillis(o.deadline, { zone: ZONE }).toFormat(
          "dd LLL yyyy · HH:mm ZZZZ",
        );
  const real =
    o.deadline === null
      ? "—"
      : remaining(o.deadline, Date.now()) === 0
        ? "WE ARE LIVE!!!"
        : prizeClock(remaining(o.deadline, Date.now()));
  const report = () => {
    const blob = new Blob(
      [
        JSON.stringify(
          {
            capturedAt: new Date().toISOString(),
            deadline,
            realCountdown: real,
            preview: o.preview,
            photo: o.photo,
            paused: o.paused,
            health: o.health,
            prize: o.prizes.run,
            prepared: o.prizes.prepared,
            userAgent: navigator.userAgent,
            viewport: {
              width: innerWidth,
              height: innerHeight,
              dpr: devicePixelRatio,
            },
          },
          null,
          2,
        ),
      ],
      { type: "application/json" },
    );
    const url = URL.createObjectURL(blob),
      a = document.createElement("a");
    a.href = url;
    a.download = "torah-ore-rehearsal-report.json";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setMessage("Report downloaded.");
  };
  return (
    <>
      <h2>Control</h2>
      <div className="operator-grid">
        <article>
          <small>REAL CAMPAIGN DEADLINE</small>
          <strong>{deadline}</strong>
          <span>{real} · Asia/Jerusalem</span>
        </article>
        <article>
          <small>DISPLAY SOURCE</small>
          <strong>
            {o.rehearsal ??
              (o.preview ? "Preview clock" : "Live campaign clock")}
          </strong>
          <span>
            {o.preview ? "Saved deadline unchanged" : "Local system time"}
          </span>
        </article>
        <article>
          <small>CURRENT PHOTO</small>
          <strong>{o.photo.name}</strong>
          <span>
            {o.photo.index}/{o.photo.count} · {o.paused ? "Paused" : "Playing"}
          </span>
          <span>Next: {o.photo.nextName}</span>
        </article>
        <article>
          <small>PRIZE</small>
          <strong>
            {o.prizes.paused && "Paused · "}
            {o.prizes.run
              ? o.prizes.phase.revealed
                ? "Revealed: " + o.prizes.run.name
                : prizeClock(o.prizes.phase.remaining)
              : "No active countdown"}
          </strong>
          <span>
            Prepared:{" "}
            {o.prizes.gallery.find((p) => p.id === o.prizes.prepared?.prizeId)
              ?.name ?? "None"}
          </span>
        </article>
      </div>
      <SettingsSection title="Photos">
        <div className="settings-actions">
          <button onClick={o.next} disabled={o.photo.count < 2}>
            Next photo
          </button>
          <button onClick={o.pause}>
            {o.paused ? "Resume" : "Pause"} slideshow
          </button>
        </div>
      </SettingsSection>
      <SettingsSection title="Prize">
        <div className="settings-actions">
          <button
            disabled={!o.prizes.prepared}
            onClick={() => {
              try {
                o.prizes.startPrepared();
                setMessage("Prize started.");
              } catch (error) {
                setMessage(String(error));
              }
            }}
          >
            Start prepared prize
          </button>
          <button
            disabled={!o.prizes.run}
            onClick={() =>
              o.prizes.paused ? o.prizes.resume() : o.prizes.pause()
            }
          >
            {o.prizes.paused ? "Resume prize" : "Pause prize"}
          </button>
          <button
            disabled={!o.prizes.run || o.prizes.phase.revealed}
            onClick={() => o.prizes.revealNow()}
          >
            Reveal prize now
          </button>
          <button disabled={!o.prizes.run} onClick={() => o.prizes.stop()}>
            Hide prize
          </button>
        </div>
      </SettingsSection>
      <SettingsSection title="Rehearsal">
        <div className="settings-actions">
          {o.rehearsal ? (
            <button onClick={o.stopRehearsal}>
              Stop rehearsal / restore live
            </button>
          ) : (
            <button className="primary" onClick={o.startRehearsal}>
              Run full rehearsal
            </button>
          )}
          <span className="settings-note">
            40 seconds · returns to live automatically
          </span>
        </div>
      </SettingsSection>
      <details className="settings-advanced">
        <summary>Diagnostics</summary>
        <div className="operator-grid">
          <article>
            <small>BROWSER PERFORMANCE</small>
            <strong>
              {o.health.hidden
                ? "Tab hidden"
                : `${o.health.fps} fps · ${o.health.p95} ms p95`}
            </strong>
            <span>
              {o.health.heapMB === null
                ? "Memory reporting unavailable"
                : `${o.health.heapMB} MB JS heap`}{" "}
              · {o.health.frames.toLocaleString()} frames sampled
            </span>
          </article>
          <article>
            <small>SESSION UPTIME</small>
            <strong>{prizeClock(o.health.uptime)}</strong>
            <span>
              Frame sampling excludes hidden-tab gaps. TV output is not
              measured.
            </span>
          </article>
        </div>
        <button onClick={report}>Download health report</button>
      </details>
      <details className="settings-advanced">
        <summary>Keyboard shortcuts</summary>
        <dl className="settings-shortcuts">
          <div>
            <dt>
              <kbd>F2</kbd>
            </dt>
            <dd>Settings</dd>
          </div>
          <div>
            <dt>
              <kbd>Esc</kbd>
            </dt>
            <dd>Close settings</dd>
          </div>
          <div>
            <dt>
              <kbd>Alt + O</kbd>
            </dt>
            <dd>Control</dd>
          </div>
          <div>
            <dt>
              <kbd>Alt + →</kbd>
            </dt>
            <dd>Next photo</dd>
          </div>
          <div>
            <dt>
              <kbd>Alt + P</kbd>
            </dt>
            <dd>Pause / resume photos</dd>
          </div>
          <div>
            <dt>
              <kbd>Alt + R</kbd>
            </dt>
            <dd>Start prepared prize</dd>
          </div>
          <div>
            <dt>
              <kbd>Alt + H</kbd>
            </dt>
            <dd>Hide prize</dd>
          </div>
        </dl>
      </details>
      {message && (
        <p className="settings-note" role="status">
          {message}
        </p>
      )}
    </>
  );
}
