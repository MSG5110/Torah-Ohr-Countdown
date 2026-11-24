import { useEffect, useRef, useState } from "react";
import {
  Play,
  Pause,
  Square,
  Eye,
  Pencil,
  Trash2,
  Upload,
  Gift,
  Check,
} from "lucide-react";
import type { PrizeController } from "./Prizes";
import type { PrizePhoto } from "./prizeStore";
import { PrizeThumb } from "./PrizeImages";
import { preparePhoto } from "./storage";
import {
  savedPrizeOptions,
  validatePrizeOptions,
  prizeRevealTimes,
  prizeDuration,
  prizeRevealDuration,
  prizeClock,
  type PrizeOptions,
} from "./prizeEngine";
function holdLabel(seconds: number) {
  return (
    prizeRevealTimes.find((p) => p.seconds === seconds)?.label ??
    prizeClock(seconds)
  );
}
function splitTime(seconds: number) {
  return {
    hours: String(Math.floor(seconds / 3600)),
    minutes: String(Math.floor(seconds / 60) % 60),
    seconds: String(seconds % 60),
  };
}
function prizeId() {
  return typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `prize-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
export function PrizeLibrary({
  controller: c,
  close,
}: {
  controller: PrizeController;
  close: () => void;
}) {
  const [selected, setSelected] = useState(
      c.run?.prizeId ?? c.gallery[0]?.id ?? "",
    ),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  const choice = c.gallery.find((p) => p.id === selected) ?? c.gallery[0];
  const editor = useRef<HTMLDivElement>(null);
  function edit(id: string) {
    setSelected(id);
    editor.current?.scrollIntoView({ block: "start" });
  }
  function action(work: () => unknown, success: string) {
    try {
      work();
      setMessage(success);
    } catch (error) {
      setMessage(String(error));
    }
  }
  async function upload(files: FileList | null) {
    if (!files?.length) return;
    setBusy(true);
    const added: PrizePhoto[] = [],
      errors: string[] = [];
    for (const file of Array.from(files)) {
      try {
        const { blob, thumbnail } = await preparePhoto(file);
        added.push({
          id: prizeId(),
          name: (file.name.replace(/\.[^.]+$/, "").trim() || "New prize").slice(
            0,
            120,
          ),
          blob,
          thumbnail,
          order: 0,
          ...savedPrizeOptions({}),
        });
      } catch (error) {
        errors.push(`${file.name}: ${String(error)}`);
      }
    }
    if (added.length) {
      const saved = await c.add(added);
      setSelected(added[0].id);
      setMessage(
        `${added.length} prize${added.length === 1 ? "" : "s"} added${saved ? " and saved" : " for this session"}. Set each prize’s timings below.`,
      );
    }
    if (errors.length) setMessage(errors.join(" "));
    setBusy(false);
  }
  return (
    <>
      <h2>Prizes</h2>
      <p className="settings-note">
        Each prize has its own saved settings. One prize is shown at a time.
      </p>
      <section
        className={`prize-live-console ${c.run ? "is-active" : ""}`}
        aria-label="On-screen prize"
      >
        <div>
          <span className="section-eyebrow">ON SCREEN</span>
          <strong>{c.run?.name ?? "No active prize"}</strong>
          <p>
            {c.run
              ? `${c.paused ? "Paused · " : ""}${c.phase.revealed ? `Prize revealed${c.holdRemaining === null ? " · until hidden" : ` · ${prizeClock(c.holdRemaining)} left`}` : `Reveals in ${prizeClock(c.phase.remaining)}`}`
              : "Choose a prize below."}
          </p>
        </div>
        {c.run && (
          <div className="prize-card-actions">
            <button
              onClick={() =>
                action(
                  c.paused ? c.resume : c.pause,
                  c.paused
                    ? "Prize resumed."
                    : "Prize paused. Its remaining time is held.",
                )
              }
            >
              {c.paused ? <Play size={14} /> : <Pause size={14} />}
              {c.paused ? "Resume prize" : "Pause prize"}
            </button>
            {!c.phase.revealed && (
              <button
                onClick={() =>
                  action(() => c.revealNow(), "Prize revealed now.")
                }
              >
                <Eye size={14} />
                Reveal now
              </button>
            )}
            <button
              className="prize-stop"
              onClick={() =>
                action(() => c.stop(), "Prize stopped and hidden.")
              }
            >
              <Square size={14} />
              Stop / hide prize
            </button>
          </div>
        )}
      </section>
      {c.prepared && (
        <div className="preview-notice prize-prepared">
          Prepared next:{" "}
          {c.gallery.find((p) => p.id === c.prepared?.prizeId)?.name ??
            "Picture missing"}{" "}
          · {prizeClock(c.prepared.seconds)}
          <button
            onClick={() => action(c.startPrepared, "Prepared prize started.")}
          >
            Start prepared prize
          </button>
          <button onClick={c.clearPrepared}>Clear prepared prize</button>
        </div>
      )}
      {c.error && (
        <p className="prize-feedback error" role="alert">
          {c.error}
        </p>
      )}
      {message && (
        <p className="prize-feedback" role="status">
          {message}
        </p>
      )}
      <label className="upload-zone prize-add">
        <Upload size={20} />
        <strong>{busy ? "Adding prizes…" : "Add prizes"}</strong>

        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          hidden
          disabled={busy || !c.ready}
          onChange={(e) => {
            void upload(e.target.files);
            e.target.value = "";
          }}
        />
      </label>
      {!c.gallery.length && (
        <div className="prize-empty">
          <Gift size={30} />
          <h3>No prizes yet.</h3>
          <p>Add pictures to begin.</p>
        </div>
      )}
      <div className="prize-gallery" aria-label="Saved prizes">
        {c.gallery.map((prize) => {
          const options = savedPrizeOptions(prize),
            active = c.run?.prizeId === prize.id;
          return (
            <article
              className={`prize-choice ${choice?.id === prize.id ? "selected" : ""} ${active ? "is-active" : ""}`}
              key={prize.id}
              data-prize-id={prize.id}
            >
              <button
                className="prize-select"
                aria-pressed={choice?.id === prize.id}
                onClick={() => edit(prize.id)}
              >
                <div className="prize-thumbnail">
                  <PrizeThumb prize={prize} />
                </div>
                <span className="prize-card-title">{prize.name}</span>
              </button>
              <span className={`prize-status ${active ? "on-air" : ""}`}>
                {active
                  ? c.paused
                    ? "Paused on screen"
                    : c.phase.revealed
                      ? "Revealed on screen"
                      : "Counting down"
                  : c.prepared?.prizeId === prize.id
                    ? "Prepared next"
                    : "Ready"}
              </span>
              <dl className="prize-card-timings">
                <div>
                  <dt>Countdown</dt>
                  <dd>{prizeClock(options.countdownSeconds)}</dd>
                </div>
                <div>
                  <dt>Reveal</dt>
                  <dd>{holdLabel(options.revealSeconds)}</dd>
                </div>
              </dl>
              <div className="prize-card-actions">
                <button
                  className="primary"
                  disabled={busy}
                  onClick={() =>
                    action(
                      () => c.startSaved(prize.id),
                      `${prize.name} countdown ${active ? "restarted" : "started"}.`,
                    )
                  }
                >
                  <Play size={13} />
                  {active ? "Restart" : "Start"}
                </button>
                <button
                  disabled={busy}
                  onClick={() =>
                    action(
                      () =>
                        active ? c.revealNow(prize.id) : c.showSaved(prize.id),
                      `${prize.name} is on screen.`,
                    )
                  }
                >
                  <Eye size={13} />
                  Show now
                </button>
                <button
                  disabled={!active}
                  className="prize-stop"
                  onClick={() =>
                    action(() => c.stop(prize.id), `${prize.name} stopped.`)
                  }
                >
                  <Square size={13} />
                  Stop
                </button>
                <button
                  onClick={() => edit(prize.id)}
                  aria-label={`Edit ${prize.name}`}
                >
                  <Pencil size={13} />
                  Edit
                </button>
              </div>
              <button
                className="prize-remove"
                disabled={busy || active}
                title={
                  active
                    ? "Stop this prize before removing it"
                    : "Remove this saved prize"
                }
                onClick={() => {
                  void Promise.resolve()
                    .then(() => c.remove(prize.id))
                    .then(() => setMessage("Prize removed from the library."))
                    .catch((error) => setMessage(String(error)));
                }}
              >
                <Trash2 size={12} />
                Remove
              </button>
            </article>
          );
        })}
      </div>
      <div ref={editor} className="prize-editor-anchor">
        {choice && (
          <PrizeEditor
            key={choice.id}
            prize={choice}
            controller={c}
            close={close}
          />
        )}
      </div>
    </>
  );
}

type TimeFields = ReturnType<typeof splitTime>;
type PrizeDraft = {
  name: string;
  countdown: TimeFields;
  hold: string;
  customHold: TimeFields;
  revealText: string;
};
function readDraft(draft: PrizeDraft): PrizeOptions & { name: string } {
  const name = draft.name.trim();
  if (!name || name.length > 120)
    throw new Error("Give the prize a name of 1–120 characters.");
  return {
    name,
    ...validatePrizeOptions({
      countdownSeconds: prizeDuration(
        +draft.countdown.hours,
        +draft.countdown.minutes,
        +draft.countdown.seconds,
      ),
      revealSeconds:
        draft.hold === "custom"
          ? prizeRevealDuration(
              +draft.customHold.hours,
              +draft.customHold.minutes,
              +draft.customHold.seconds,
            )
          : Number(draft.hold),
      revealText: draft.revealText,
    }),
  };
}
function TimeInputs({
  value,
  onChange,
  onBlur,
  prefix = "",
}: {
  value: TimeFields;
  onChange: (next: TimeFields) => void;
  onBlur: () => void;
  prefix?: string;
}) {
  return (
    <div className="prize-duration">
      {(["hours", "minutes", "seconds"] as const).map((unit) => (
        <label className="field" key={unit}>
          <span>
            {prefix
              ? `${prefix} ${unit}`
              : unit[0].toUpperCase() + unit.slice(1)}
          </span>
          <input
            type="number"
            min="0"
            step="1"
            max={unit === "hours" ? undefined : 59}
            value={value[unit]}
            onChange={(e) => onChange({ ...value, [unit]: e.target.value })}
            onBlur={onBlur}
          />
        </label>
      ))}
    </div>
  );
}
function PrizeEditor({
  prize,
  controller: c,
  close,
}: {
  prize: PrizePhoto;
  controller: PrizeController;
  close: () => void;
}) {
  const options = savedPrizeOptions(prize);
  const [draft, setDraft] = useState<PrizeDraft>(() => ({
    name: prize.name.slice(0, 120),
    countdown: splitTime(options.countdownSeconds),
    hold: prizeRevealTimes.some((p) => p.seconds === options.revealSeconds)
      ? String(options.revealSeconds)
      : "custom",
    customHold: splitTime(options.revealSeconds),
    revealText: options.revealText,
  }));
  const [status, setStatus] = useState("Saved"),
    [validation, setValidation] = useState(""),
    [replacing, setReplacing] = useState(false);
  const lastSaved = useRef<string | null>(null),
    live = useRef({ draft, c });
  if (lastSaved.current === null)
    lastSaved.current = JSON.stringify(readDraft(draft));
  live.current = { draft, c };
  const mounted = useRef(true);
  function patch(next: Partial<PrizeDraft>) {
    setDraft((old) => ({ ...old, ...next }));
    setStatus("Unsaved changes");
    setValidation("");
  }
  async function save(force = false) {
    let settings: ReturnType<typeof readDraft>;
    try {
      settings = readDraft(live.current.draft);
    } catch (error) {
      if (mounted.current) setValidation(String(error).replace(/^Error: /, ""));
      throw error;
    }
    const token = JSON.stringify(settings);
    if (!force && token === lastSaved.current) return settings;
    lastSaved.current = token;
    if (mounted.current) {
      setStatus("Saving…");
      setValidation("");
    }
    const saved = await live.current.c.updatePrize(prize.id, settings);
    if (mounted.current) {
      try {
        if (token === JSON.stringify(readDraft(live.current.draft)))
          setStatus(saved ? "Saved" : "Session only");
      } catch {
        /* Keep newer incomplete input visible while the prior valid edit saves. */
      }
    }
    return settings;
  }
  const saveRef = useRef(save);
  saveRef.current = save;
  useEffect(() => {
    const timer = setTimeout(() => {
      void saveRef.current().catch(() => {});
    }, 500);
    return () => clearTimeout(timer);
  }, [draft]);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      // Flush a valid final keystroke when switching prizes, tabs or closing F2.
      try {
        const settings = readDraft(live.current.draft),
          token = JSON.stringify(settings);
        if (token !== lastSaved.current) {
          lastSaved.current = token;
          void live.current.c.updatePrize(prize.id, settings).catch(() => {});
        }
      } catch {
        /* Invalid partial edits never overwrite the last valid settings. */
      }
    };
  }, [prize.id]);
  function blur() {
    void saveRef.current().catch(() => {});
  }
  function run(mode: "start" | "test" | "prepare" | "show" | "apply") {
    try {
      const settings = readDraft(draft);
      void saveRef.current().catch((error) => {
        if (mounted.current) setValidation(String(error));
      });
      if (mode === "prepare") {
        c.prepare(
          prize.id,
          settings.countdownSeconds,
          settings.revealSeconds,
          settings.revealText,
        );
        setStatus("Prepared for later.");
      } else if (mode === "apply") {
        c.updateReveal(settings.revealSeconds, settings.revealText);
        setStatus("Active prize updated.");
      } else if (mode === "show") {
        c.showSaved(prize.id);
        setStatus("Prize revealed now.");
      } else {
        c.start(
          prize.id,
          mode === "test" ? 10 : settings.countdownSeconds,
          settings.revealSeconds,
          settings.revealText,
        );
        setStatus("Prize countdown started.");
        if (mode === "test") close();
      }
    } catch (error) {
      setValidation(String(error).replace(/^Error: /, ""));
    }
  }
  async function replace(file?: File) {
    if (!file) return;
    setReplacing(true);
    try {
      const { blob, thumbnail } = await preparePhoto(file);
      const saved = await c.updatePrize(prize.id, { blob, thumbnail });
      setStatus(
        saved
          ? "Prize picture replaced and saved"
          : "Picture replaced for this session",
      );
    } catch (error) {
      setValidation(String(error));
    } finally {
      setReplacing(false);
    }
  }
  return (
    <section
      className="prize-editor"
      aria-label="Selected prize settings"
      data-editor-prize={prize.id}
    >
      <div className="prize-editor-heading">
        <div>
          <h3>{prize.name}</h3>
        </div>
        <div className="prize-editor-preview">
          <PrizeThumb prize={prize} />
        </div>
      </div>
      <label className="field">
        <span>Prize name</span>
        <input
          value={draft.name}
          maxLength={120}
          onChange={(e) => patch({ name: e.target.value })}
          onBlur={blur}
        />
      </label>
      <label className="prize-replace">
        <Upload size={14} />
        {replacing ? "Replacing picture…" : "Replace image"}
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          hidden
          disabled={replacing}
          onChange={(e) => {
            void replace(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
      </label>
      <h4>Countdown duration</h4>
      <TimeInputs
        value={draft.countdown}
        onChange={(countdown) => patch({ countdown })}
        onBlur={blur}
      />
      <label className="field">
        <span>Show revealed prize for</span>
        <select
          value={draft.hold}
          onChange={(e) => patch({ hold: e.target.value })}
          onBlur={blur}
        >
          {prizeRevealTimes.map((option) => (
            <option key={option.seconds} value={option.seconds}>
              {option.label}
            </option>
          ))}
          <option value="custom">Custom duration…</option>
        </select>
        <small>Begins after the countdown ends.</small>
      </label>
      {draft.hold === "custom" && (
        <TimeInputs
          value={draft.customHold}
          prefix="Reveal"
          onChange={(customHold) => patch({ customHold })}
          onBlur={blur}
        />
      )}
      <label className="field">
        <span>Text with revealed prize</span>
        <textarea
          rows={3}
          maxLength={160}
          dir="auto"
          value={draft.revealText}
          onChange={(e) => patch({ revealText: e.target.value })}
          onBlur={blur}
          placeholder="e.g. Win a weekend in Jerusalem"
        />
        <small>Optional · {draft.revealText.length}/160 · up to 3 lines.</small>
      </label>
      <div className="prize-save-status" role="status">
        <Check size={13} />
        {status}
      </div>
      {validation && (
        <p className="prize-feedback error" role="alert">
          {validation}
        </p>
      )}
      <div className="prize-actions prize-editor-actions">
        <button
          onClick={() => {
            void save(true).catch(() => {});
          }}
        >
          <Check size={14} />
          Save prize
        </button>
        <button
          className="primary"
          disabled={replacing}
          onClick={() => run("start")}
        >
          <Play size={14} />
          {c.run?.prizeId === prize.id
            ? "Restart prize countdown"
            : "Start prize countdown"}
        </button>
        {c.run?.prizeId === prize.id && (
          <button onClick={() => run("apply")}>Apply to current prize</button>
        )}
      </div>
      <details className="settings-advanced">
        <summary>More actions</summary>
        <div className="settings-actions">
          {" "}
          <button onClick={() => run("show")}>
            <Eye size={14} />
            Show this prize now
          </button>
          <button onClick={() => run("prepare")}>Prepare as next prize</button>
          <button onClick={() => run("test")}>Test in 10 seconds</button>
        </div>
      </details>
    </section>
  );
}
