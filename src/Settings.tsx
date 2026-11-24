import {sharedEnabled} from "./sharedClient";
import {SharedStatus,ImportSharedEvent} from "./SharedAdmin";
import { readExportDraft } from "./exportDraft";
import { useFullscreen } from "./useFullscreen";
import { prepareEvent } from "./eventExport";
import { ExportActions } from "./ExportActions";
import { SettingsSection } from "./SettingsSection";
import "./settings.css";
import { OperatorDashboard, type OperatorState } from "./Operator";
import { PhotoGallery } from "./PhotoGallery";
import type { GalleryController } from "./usePhotoLibrary";
import { PrizeControls, type PrizeController } from "./Prizes";
import { photoTransitions } from "./photoTransitions";
import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  X,
  CalendarDays,
  SlidersHorizontal,
  Images,
  Clapperboard,
  Play,
  Upload,
  Monitor,
  Gift,
  Check,
  RotateCcw,
  Download,
} from "lucide-react";
import { DateTime } from "luxon";
import { parseDeadline, ZONE, type Settings, type Preview } from "./engine";
import { themes, themePatch } from "./themes";
const optionNames: Record<string, string> = {
  blended: "Countdown + photos",
  cinematic: "Background only",
  photos: "Photos only",
  auto: "Automatic",
  high: "High",
  low: "Low",
  medium: "Medium",
};
const tabs = [
  ["Control", Monitor],
  ["Event", CalendarDays],
  ["Appearance", SlidersHorizontal],
  ["Photos", Images],
  ["Animation", Clapperboard],
  ["Prizes", Gift],
  ["Finale", Play],
  ["Preview", Monitor],
] as const;
export function SettingsPanel({
  s,
  photoStatus,
  prizes,
  operator,
  onTestPhotos,
  set,
  close,
  gallery,
  preview,
  onPreview,
  exitPreview,
  missing,
  error,
}: {
  s: Settings;
  photoStatus: string;
  prizes: PrizeController;
  operator: OperatorState;
  onTestPhotos: () => void;
  set: (next: Settings) => void;
  close: () => void;
  gallery: GalleryController;
  preview: Preview;
  onPreview: (n: number) => void;
  exitPreview: () => void;
  missing: boolean;
  error: string;
}) {
  const { library } = gallery;
  const fullscreen = useFullscreen(close);
  const fullscreenLabel = fullscreen.pending ? "Switching…" : fullscreen.active ? "Exit full screen" : "Enter full screen";
  const [tab, setTab] = useState<(typeof tabs)[number][0]>("Control");
  const contentRef = useRef<HTMLDivElement>(null);
  function changeTab(name: (typeof tabs)[number][0]) {
    setTab(name);
    msg("");
    contentRef.current?.scrollTo({ top: 0 });
  }
  const [local, setLocal] = useState(
    s.deadline
      ? DateTime.fromMillis(s.deadline, { zone: ZONE }).toFormat(
          "yyyy-MM-dd'T'HH:mm",
        )
      : "",
  );
  const [message, msg] = useState("");
  const [exporting, setExporting] = useState(false);
  const [exportStatus, setExportStatus] = useState("");
  const [preparedExport, setPreparedExport] = useState<Awaited<ReturnType<typeof prepareEvent>> | null>(null);
  const exportVersion = useRef(0);
  useEffect(() => {
    let cancelled = false;
    const version = exportVersion.current;
    void readExportDraft().then(draft => {
      if (draft && !cancelled && exportVersion.current === version) {
        setPreparedExport({ ...draft, html: "", recoverySaved: true });
        setExportStatus("Recovered your prepared export. Choose Share, Copy or Download below.");
      }
    }).catch(() => {});
    return () => { cancelled = true; };
  }, []);
  const patch = (p: Partial<Settings>) => {
    set({ ...s, ...p });
    msg("Saved");
  };
  const toggle = (label: string, key: keyof Settings, description?: string) => (
    <label className="toggle-row">
      <span>
        {label}
        {description && <small>{description}</small>}
      </span>
      <input
        type="checkbox"
        checked={!!s[key]}
        onChange={(e) => patch({ [key]: e.target.checked })}
      />
    </label>
  );
  const range = (
    label: string,
    key: keyof Settings,
    min: number,
    max: number,
    step = 0.1,
  ) => (
    <label className="field range">
      <span>
        {label}
        <b>{String(s[key])}</b>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={s[key] as number}
        onChange={(e) => patch({ [key]: +e.target.value })}
      />
    </label>
  );
  const select = (label: string, key: keyof Settings, choices: string[]) => (
    <label className="field">
      <span>{label}</span>
      <select
        value={s[key] as string}
        onChange={(e) => patch({ [key]: e.target.value })}
      >
        {choices.map((c) => (
          <option key={c} value={c}>
            {optionNames[c] ?? c}
          </option>
        ))}
      </select>
    </label>
  );
  let content: ReactNode;
  if (tab === "Control")
    content = (
      <>
        <div className="fullscreen-control">
          <div><Monitor size={20}/><span><strong>Browser full screen</strong><small>Fill the display and hide browser controls.</small></span></div>
          <button className="primary" disabled={fullscreen.pending} onClick={() => void fullscreen.toggle()}>{fullscreenLabel}</button>
        </div>
        {sharedEnabled()&&<><SharedStatus/><ImportSharedEvent/></>}
        <OperatorDashboard state={operator} />
        <SettingsSection title="Take your event with you">
          <p className="settings-note">
            Save settings, logo, photos and prizes in one offline HTML file.
          </p>
          <button
            className="primary"
            disabled={exporting || !prizes.ready || !gallery.ready || !!gallery.progress}
            onClick={async () => {
              exportVersion.current++;
              setExporting(true);
              setPreparedExport(null);
              setExportStatus("Preparing your event…");
              try {
                const settings = { ...s },
                  media = await library.snapshot();
                const snapshot = await prizes.snapshot();
                const result = await prepareEvent(
                  { settings, photos: media, ...snapshot },
                  setExportStatus,
                );
                setPreparedExport(result);
                setExportStatus(
                  `Ready · ${result.photos} ${result.photos === 1 ? "photo" : "photos"} · ${result.prizes} ${result.prizes === 1 ? "prize" : "prizes"} · ${(result.bytes / 1048576).toFixed(1)} MB`,
                );
              } catch (error) {
                setExportStatus(
                  error instanceof Error ? error.message : String(error),
                );
              } finally {
                setExporting(false);
              }
            }}
          >
            <Download size={16} />
            {exporting ? "Exporting…" : "Export complete HTML"}
          </button>
          {preparedExport && <ExportActions data={preparedExport} onStatus={setExportStatus}/>}
          {exportStatus && (
            <p className="settings-note" role="status">
              {exportStatus}
            </p>
          )}
        </SettingsSection>
      </>
    );
  else if (tab === "Event")
    content = (
      <>
        <h2>Event</h2>
        <SettingsSection title="Campaign deadline">
          <form
            className="settings-deadline-form"
            onSubmit={(e) => {
              e.preventDefault();
              try {
                patch({ deadline: parseDeadline(local) });
                msg("Deadline saved.");
              } catch (error) {
                msg((error as Error).message);
              }
            }}
          >
            <label className="field">
              <span>Campaign date & time</span>
              <input
                type="datetime-local"
                required
                value={local}
                onChange={(e) => setLocal(e.target.value)}
              />
              <small>Asia/Jerusalem</small>
            </label>
            <button className="primary" type="submit">
              <Check size={15} />
              Save campaign deadline
            </button>
          </form>
          <p className="settings-note">
            {s.deadline
              ? `Saved: ${DateTime.fromMillis(s.deadline, { zone: ZONE }).toFormat("dd LLL yyyy · HH:mm ZZZZ")}`
              : "No deadline set."}
          </p>
        </SettingsSection>
        <SettingsSection title="Yeshiva logo">
          <p className="settings-note">
            {missing
              ? "Original logo missing. Upload it below."
              : "Original logo loaded."}
          </p>
          <label className="button">
            <Upload size={15} /> Upload original logo
            <input
              hidden
              type="file"
              accept="image/png,image/jpeg,image/webp,image/svg+xml"
              onChange={async (e) => {
                const f = e.target.files?.[0];
                if (!f) return;
                if (f.size > 3 * 1024 * 1024) {
                  msg(
                    "Logo must be under 3 MB. Use the public assets path for larger originals.",
                  );
                  return;
                }
                const reader = new FileReader();
                reader.onload = () => patch({ logo: String(reader.result) });
                reader.onerror = () => msg("Could not read logo");
                reader.readAsDataURL(f);
              }}
            />
          </label>
        </SettingsSection>
        <details className="settings-advanced">
          <summary>Reset & time information</summary>
          <p>
            Time comes from this device’s clock. Jerusalem daylight saving is
            applied automatically.
          </p>
          <button
            className="danger subtle"
            onClick={() => {
              if (
                confirm(
                  "Reset the campaign deadline? Your photos and appearance will be kept.",
                )
              ) {
                patch({ deadline: null });
                setLocal("");
                exitPreview();
              }
            }}
          >
            <RotateCcw size={14} />
            Reset countdown configuration
          </button>
        </details>
      </>
    );
  else if (tab === "Appearance")
    content = (
      <>
        <h2>Appearance</h2>
        <div className="theme-gallery" role="group" aria-label="Display themes">
          {s.theme === "saved" && (
            <div className="saved-theme">Saved custom colors are active.</div>
          )}
          {themes.map((theme) => (
            <label
              className={`theme-card ${s.theme === theme.id ? "selected" : ""}`}
              key={theme.id}
              title={theme.description}
            >
              <input
                type="radio"
                name="display-theme"
                value={theme.id}
                checked={s.theme === theme.id}
                onChange={() => patch(themePatch(theme.id))}
              />
              <span
                className={`theme-art theme-art-${theme.scene}`}
                style={
                  {
                    "--theme-bg": theme.palette.backgroundColor,
                    "--theme-atmosphere": theme.palette.atmosphereColor,
                    "--theme-accent": theme.palette.digitColor,
                    "--theme-light": theme.palette.lightColor,
                  } as React.CSSProperties
                }
                aria-hidden="true"
              >
                <i />
                <b>
                  08<span>:</span>32
                </b>
                <em />
              </span>
              <span className="theme-name">
                {theme.name}
                <Check size={14} />
              </span>
            </label>
          ))}
        </div>

        <SettingsSection title="Display" columns={2}>
          {range("Number brightness", "gold", 0.4, 1.5)}
          {range("Countdown size", "scale", 0.7, 1.15, 0.05)}
          {select("Rendering quality", "quality", ["auto", "high", "low"])}
          {toggle("Light halo", "halo")}
        </SettingsSection>
        <details className="settings-advanced">
          <summary>Lighting & particles</summary>
          <div className="settings-grid settings-grid-two">
            {range("Particle density", "density", 0, 140, 1)}
            {range("Atmosphere motion", "speed", 0.1, 2)}
            {range("Halo intensity", "haloIntensity", 0, 1)}
            {range("Background lighting", "lighting", 0, 1.5)}
          </div>
        </details>
      </>
    );
  else if (tab === "Photos")
    content = (
      <>
        <PhotoGallery gallery={gallery} photoStatus={photoStatus} onTestPhotos={onTestPhotos}>
        <details className="settings-advanced">
          <summary>Slideshow settings</summary>
        <SettingsSection title="Slideshow" columns={2}>
          {toggle("Enable slideshow", "slideshow")}
          {select("Display mode", "mode", ["blended", "cinematic", "photos"])}
          <label className="field">
            <span>Photo order</span>
            <select
              value={s.photoOrder}
              onChange={(e) =>
                patch({ photoOrder: e.target.value as Settings["photoOrder"] })
              }
            >
              <option value="ordered">In gallery order</option>
              <option value="shuffle">Shuffle</option>
            </select>
          </label>
          <label className="field">
            <span>Photo transition</span>
            <select
              value={s.photoTransition}
              onChange={(e) =>
                patch({
                  photoTransition: e.target
                    .value as Settings["photoTransition"],
                })
              }
            >
              {photoTransitions.map((t) => (
                <option value={t.id} key={t.id}>
                  {t.label}
                </option>
              ))}
            </select>
          </label>
          {range("Photo duration (s)", "duration", 5, 90, 1)}
          {range(
            "Transition duration (s)",
            "fade",
            0.5,
            Math.min(10, s.duration / 2),
            0.5,
          )}
        </SettingsSection>
        <details className="settings-advanced">
          <summary>Photo treatment</summary>
          <div className="settings-grid settings-grid-two">
            {range("Photo visibility", "photoOpacity", 0.2, 1, 0.05)}
            {range("Darkening", "photoShade", 0, 0.8, 0.05)}
            {range("Zoom", "zoom", 0, 2)}
            {toggle("Match photo lighting", "adaptiveLight")}
          </div>
        </details>
        </details>
        </PhotoGallery>
      </>
    );
  else if (tab === "Animation")
    content = (
      <>
        <h2>Animation</h2>
        <SettingsSection title="Numbers" columns={2}>
          {toggle("Rolling digits", "rolling")}
          {range("Roll duration (ms)", "rollSpeed", 400, 650, 10)}
        </SettingsSection>
        <SettingsSection title="Motion" columns={2}>
          {toggle("Dynamic intensity", "dynamic")}
          {range("Animation intensity", "animation", 0, 1.5)}
          {toggle("Reduced motion", "reduced")}
        </SettingsSection>
        <p className="settings-note">
          System reduced-motion preferences also apply.
        </p>
      </>
    );
  else if (tab === "Prizes")
    content = <PrizeControls controller={prizes} close={close} />;
  else if (tab === "Finale")
    content = (
      <>
        <h2>Finale</h2>
        <SettingsSection title="Launch message">
          <label className="field">
            <span>Launch message</span>
            <input
              maxLength={80}
              value={s.launchText}
              onChange={(e) => patch({ launchText: e.target.value })}
            />
          </label>
        </SettingsSection>
        <SettingsSection title="Celebration" columns={2}>
          {toggle("Fireworks", "fireworks")}
          {select("Firework intensity", "fireworkIntensity", [
            "low",
            "medium",
            "high",
          ])}
          {toggle("Confetti", "confetti")}
          {select("Confetti intensity", "confettiIntensity", [
            "low",
            "medium",
            "high",
          ])}
          {toggle("Light shockwave", "shockwave")}
        </SettingsSection>
        <div className="settings-actions">
          <button
            className="primary"
            onClick={() => {
              onPreview(0);
              close();
            }}
          >
            <Play size={15} />
            Preview / replay full finale
          </button>
          <button
            onClick={() => {
              onPreview(-30);
              close();
            }}
          >
            Test settled launch screen
          </button>
        </div>
      </>
    );
  else
    content = (
      <>
        <h2>Preview</h2>
        <p className="settings-note">
          Test clock only. Your campaign deadline stays unchanged.
        </p>
        <div className="presets">
          {[
            ["10 days", 864000],
            ["24 hours", 86400],
            ["1 hour", 3600],
            ["5 minutes", 300],
            ["60 seconds", 60],
            ["10 seconds", 10],
            ["Full finale", 0],
          ].map(([name, n]) => (
            <button
              key={name}
              onClick={() => {
                onPreview(Number(n));
                close();
              }}
            >
              <Play size={15} />
              <strong>{name}</strong>
            </button>
          ))}
        </div>
      </>
    );
  return (
    <div
      className="admin-backdrop"
      onClick={(e) => {
        if (!exporting && e.target === e.currentTarget) close();
      }}
    >
      <section
        className="admin settings-clean"
        role="dialog"
        aria-modal="true"
        aria-label="Event control"
      >
        <aside>
          <div className="admin-brand">
            TORAH ORE<span>SETTINGS</span>
          </div>
          <nav
            aria-label="Settings sections"
            role="tablist"
            onKeyDown={(e) => {
              if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
              if (
                ![
                  "ArrowDown",
                  "ArrowUp",
                  "ArrowLeft",
                  "ArrowRight",
                  "Home",
                  "End",
                ].includes(e.key)
              )
                return;
              const buttons = Array.from(
                e.currentTarget.querySelectorAll<HTMLButtonElement>(
                  '[role="tab"]',
                ),
              );
              const index = buttons.indexOf(e.target as HTMLButtonElement);
              if (index < 0) return;
              e.preventDefault();
              const next =
                e.key === "Home"
                  ? 0
                  : e.key === "End"
                    ? buttons.length - 1
                    : (index +
                        (["ArrowDown", "ArrowRight"].includes(e.key) ? 1 : -1) +
                        buttons.length) %
                      buttons.length;
              changeTab(tabs[next][0]);
              buttons[next].focus();
            }}
          >
            {tabs.map(([name, Icon]) => (
              <button
                key={name}
                id={`settings-tab-${name}`}
                role="tab"
                aria-selected={tab === name}
                aria-controls="settings-panel"
                tabIndex={tab === name ? 0 : -1}
                onClick={() => changeTab(name)}
                className={tab === name ? "active" : ""}
              >
                <Icon size={17} />
                {name}
              </button>
            ))}
          </nav>
          <div className="admin-bottom">
            <span className="status-dot" /> LOCAL DISPLAY
          </div>
        </aside>
        <div className="admin-main">
          <header>
            <div className="settings-header-status">
              <span className={`status-dot ${preview ? "muted" : ""}`} />
              <span>{preview ? "Preview running" : "Live display"}</span>
              {preview && <button onClick={exitPreview}>Exit preview</button>}
            </div>
            <button aria-label="Close settings" disabled={exporting} onClick={close}>
              <X size={20} />
            </button>
          </header>
          {fullscreen.error && <div className="fullscreen-feedback" role="alert">{fullscreen.error}</div>}
          <div
            className="admin-content"
            key={tab}
            id="settings-panel"
            role="tabpanel"
            aria-labelledby={`settings-tab-${tab}`}
            ref={contentRef}
          >
            {content}
            {((message && message !== "Saved") || error) && (
              <div className="feedback" role="status">
                {error || message}
              </div>
            )}
          </div>
          <footer>
            <span className="settings-save-label" role="status">
              {error
                ? "Storage warning"
                : message === "Saved"
                  ? "Saved locally"
                  : "Saves automatically"}
            </span>
            <button disabled={fullscreen.pending} onClick={() => void fullscreen.toggle()}>
              <Monitor size={15} /> {fullscreenLabel}
            </button>
            <button className="settings-done" disabled={exporting} onClick={close}>
              Done
            </button>
          </footer>
        </div>
      </section>
    </div>
  );
}
