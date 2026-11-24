import {sharedEnabled,sharedSubscribe,sharedState,cloudPrizes,adminAuthenticated} from "./sharedClient";
import { appStorage } from "./packageContext";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { decodeImage } from "./compatibility";
import { readPrizes, writePrizes, type PrizePhoto } from "./prizeStore";
import { usePrizeURL } from "./PrizeImages";
import {
  newPrizeRun,
  updatePrizeReveal,
  parsePrizeRun,
  prizePhase,
  prizeClock,
  prizeHoldRemaining,
  pausePrizeRun,
  resumePrizeRun,
  revealPrizeRun,
  savedPrizeOptions,
  validatePrizeOptions,
  PRIZE_RUN_KEY,
  PREPARED_PRIZE_KEY,
  parsePreparedPrize,
  type PreparedPrize,
  type PrizeRun,
} from "./prizeEngine";
export { PrizeLibrary as PrizeControls } from "./PrizeLibrary";
function loadRun() {
  try {
    return parsePrizeRun(appStorage.getItem(PRIZE_RUN_KEY));
  } catch {
    return null;
  }
}
function loadPrepared() {
  try {
    return parsePreparedPrize(appStorage.getItem(PREPARED_PRIZE_KEY));
  } catch {
    return null;
  }
}
export function usePrizes() {
  const [gallery, setGallery] = useState<PrizePhoto[]>([]),
    [ready, setReady] = useState(false),
    [run, setRun] = useState<PrizeRun | null>(loadRun),
    [now, setNow] = useState(Date.now()),
    [error, setError] = useState("");
  const [prepared, setPrepared] = useState<PreparedPrize | null>(loadPrepared);
  const galleryRef = useRef(gallery),
    runRef = useRef(run),
    preparedRef = useRef(prepared);
  const writes = useRef<Promise<unknown>>(Promise.resolve());
  useEffect(() => {
    let cancelled = false;
    void readPrizes()
      .then((p) => {
        if (!cancelled) {
          galleryRef.current = p;
          setGallery(p);
        }
      })
      .catch(() => {
        if (!cancelled)
          setError(
            "Prize storage is unavailable. Uploaded prizes can still be used for this session.",
          );
      })
      .finally(() => {
        if (!cancelled) setReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);
  useEffect(()=>{
    if(!sharedEnabled())return;
    const update=()=>{
      const data=sharedState(),photos=cloudPrizes();
      if(photos.length!==galleryRef.current.length||photos.some((p,i)=>galleryRef.current[i]!==p)){galleryRef.current=photos;setGallery(photos);}
      const next=data.run&&prizePhase(data.run,Date.now()).visible?data.run:null;
      if(JSON.stringify(next)!==JSON.stringify(runRef.current)){runRef.current=next;setRun(next);setNow(Date.now());}
      if(JSON.stringify(data.prepared)!==JSON.stringify(preparedRef.current)){preparedRef.current=data.prepared;setPrepared(data.prepared);}
      setReady(true);
    };update();return sharedSubscribe(update);
  },[]);
  function persist(next: PrizeRun | null) {
    runRef.current = next;
    setRun(next);
    setNow(Date.now());
    try {
      if (next) appStorage.setItem(PRIZE_RUN_KEY, JSON.stringify(next));
      else appStorage.removeItem(PRIZE_RUN_KEY);
    } catch {
      setError(
        "The prize works this session, but its current state could not be saved for reopening.",
      );
    }
  }
  async function save(next: PrizePhoto[]) {
    galleryRef.current = next;
    setGallery(next);
    // Serialize immutable snapshots so a slower earlier save cannot overwrite a
    // later edit, upload or removal. Image blobs and object URLs remain shared.
    const write = writes.current.catch(() => {}).then(() => writePrizes(next));
    writes.current = write;
    try {
      await write;
      setError("");
      return true;
    } catch {
      setError(
        "Prize changes are available this session, but could not be saved. Keep the original images.",
      );
      return false;
    }
  }
  function clearPrepared() {
    preparedRef.current = null;
    setPrepared(null);
    try {
      appStorage.removeItem(PREPARED_PRIZE_KEY);
    } catch {
      setError("Prepared prize cleared for this session only.");
    }
  }
  function find(id: string) {
    const prize = galleryRef.current.find((p) => p.id === id);
    if (!prize) throw new Error("Upload and select a prize first.");
    return prize;
  }
  function start(
    id: string,
    seconds: number,
    revealSeconds: number,
    revealText = "",
  ) {
    const prize = find(id);
    persist(
      newPrizeRun(
        id,
        prize.name,
        seconds,
        revealSeconds,
        Date.now(),
        revealText,
      ),
    );
  }
  useEffect(() => {
    if (!run) return;
    const update = () =>
      setNow((old) => {
        const n = Date.now(),
          a = prizePhase(run, old),
          b = prizePhase(run, n);
        return a.remaining !== b.remaining ||
          a.visible !== b.visible ||
          a.revealed !== b.revealed ||
          prizeHoldRemaining(run, old) !== prizeHoldRemaining(run, n)
          ? n
          : old;
      });
    const timer = setInterval(update, 100);
    addEventListener("focus", update);
    document.addEventListener("visibilitychange", update);
    update();
    return () => {
      clearInterval(timer);
      removeEventListener("focus", update);
      document.removeEventListener("visibilitychange", update);
    };
  }, [run]);
  const phase = prizePhase(run, now);
  useEffect(() => {
    if (run && !phase.visible && runRef.current === run) {
      if(sharedEnabled()&&!adminAuthenticated()){runRef.current=null;setRun(null);}else persist(null);
    }
  }, [run, phase.visible]);
  return {
    gallery,
    async snapshot() {
      await writes.current.catch(() => {});
      return {
        prizes: galleryRef.current,
        run: runRef.current,
        prepared: preparedRef.current,
      };
    },
    ready,
    run,
    phase,
    prepared,
    error,
    paused: run?.pausedAt !== undefined,
    holdRemaining: prizeHoldRemaining(run, now),
    save,
    clearPrepared,
    start,
    add(prizes: PrizePhoto[]) {
      const next = [
        ...galleryRef.current,
        ...prizes.map((p, i) => ({
          ...p,
          ...savedPrizeOptions(p),
          order: galleryRef.current.length + i,
        })),
      ];
      return save(next);
    },
    updatePrize(id: string, patch: Partial<Omit<PrizePhoto, "id" | "order">>) {
      const old = find(id),
        name = (patch.name ?? old.name).trim();
      if (!name || name.length > 120)
        throw new Error("Give the prize a name of 1–120 characters.");
      const options = validatePrizeOptions({
        ...savedPrizeOptions(old),
        ...patch,
      });
      return save(
        galleryRef.current.map((p) =>
          p.id === id ? { ...p, ...patch, ...options, name } : p,
        ),
      );
    },
    remove(id: string) {
      if (runRef.current?.prizeId === id)
        throw new Error("Stop this prize before removing it.");
      if (preparedRef.current?.prizeId === id) clearPrepared();
      return save(
        galleryRef.current
          .filter((p) => p.id !== id)
          .map((p, order) => ({ ...p, order })),
      );
    },
    startSaved(id: string) {
      const options = savedPrizeOptions(find(id));
      start(
        id,
        options.countdownSeconds,
        options.revealSeconds,
        options.revealText,
      );
    },
    showSaved(id: string) {
      const prize = find(id),
        options = savedPrizeOptions(prize),
        n = Date.now();
      persist(
        newPrizeRun(
          id,
          prize.name,
          1,
          options.revealSeconds,
          n - 1000,
          options.revealText,
        ),
      );
    },
    prepare(
      prizeId: string,
      seconds: number,
      revealSeconds: number,
      revealText = "",
    ) {
      find(prizeId);
      const validated = newPrizeRun(
        prizeId,
        "prepared",
        seconds,
        revealSeconds,
        Date.now(),
        revealText,
      );
      const next = {
        prizeId,
        seconds,
        revealSeconds,
        revealText: validated.revealText,
      };
      preparedRef.current = next;
      setPrepared(next);
      try {
        appStorage.setItem(PREPARED_PRIZE_KEY, JSON.stringify(next));
      } catch {
        setError("Next prize prepared for this session; could not save it.");
      }
    },
    startPrepared() {
      const next = preparedRef.current;
      if (!next) throw new Error("Prepare the next prize in Prizes first.");
      start(next.prizeId, next.seconds, next.revealSeconds, next.revealText);
    },
    updateReveal(revealSeconds: number, revealText: string) {
      const active = runRef.current;
      if (active)
        persist({
          ...updatePrizeReveal(active, revealSeconds, revealText),
          name: find(active.prizeId).name,
        });
    },
    pause() {
      const active = runRef.current;
      if (active) persist(pausePrizeRun(active));
    },
    resume() {
      const active = runRef.current;
      if (active) persist(resumePrizeRun(active));
    },
    revealNow(id?: string) {
      const active = runRef.current;
      if (active && (!id || active.prizeId === id))
        persist(revealPrizeRun(active));
    },
    stop(id?: string) {
      if (!id || runRef.current?.prizeId === id) persist(null);
    },
  };
}
export type PrizeController = ReturnType<typeof usePrizes>;
export function PrizeDisplay({
  controller: c,
  reduced,
}: {
  controller: PrizeController;
  reduced: boolean;
}) {
  const prize = c.gallery.find((p) => p.id === c.run?.prizeId),
    url = usePrizeURL(prize);
  useEffect(() => {
    if (!url) return;
    const image = new Image();
    image.src = url;
    void decodeImage(image).catch(() => {});
    return () => {
      image.src = "";
    };
  }, [url]);
  const [broken, setBroken] = useState(false);
  useEffect(() => setBroken(false), [url]);
  return (
    <AnimatePresence mode="wait">
      {c.phase.visible && c.run && (
        <motion.aside
          key={`${c.run.prizeId}:${c.run.startedAt}`}
          className={`prize-display ${c.phase.revealed ? "revealed" : ""} ${!reduced && !c.paused && c.phase.remaining > 0 && c.phase.remaining <= 3 ? "prize-anticipation" : ""}`}
          aria-label={
            c.phase.revealed
              ? `Prize revealed: ${c.run.name}`
              : "Prize countdown"
          }
          initial={{ opacity: 0, y: reduced ? 0 : 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: reduced ? 0 : 10 }}
          transition={{ duration: reduced ? 0.15 : 0.65 }}
        >
          {!reduced && c.phase.revealed && Date.now() - c.run.endAt < 3000 && (
            <div className="prize-reveal-light" />
          )}
          <AnimatePresence mode="wait" initial={false}>
            {!c.phase.revealed ? (
              <motion.div
                className="prize-counting"
                key="clock"
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25 }}
              >
                <span className="prize-kicker">PRIZE REVEAL IN</span>
                <strong className="prize-clock" role="timer" aria-live="off">
                  {prizeClock(c.phase.remaining)}
                </strong>
              </motion.div>
            ) : (
              <motion.div
                className="prize-unveiled"
                key="reveal"
                initial={{
                  opacity: 0,
                  scale: reduced ? 1 : 0.94,
                  y: reduced ? 0 : 18,
                }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{
                  duration: reduced ? 0.15 : 1.1,
                  ease: [0.22, 1, 0.36, 1],
                }}
              >
                {url && !broken ? (
                  <div className="prize-picture-window">
                    <img
                      src={url}
                      onError={() => setBroken(true)}
                      alt={c.run.name}
                    />
                  </div>
                ) : (
                  <span className="prize-image-missing">
                    {c.ready ? "Prize image unavailable" : "Loading prize…"}
                  </span>
                )}
                {c.run.revealText && (
                  <p className="prize-caption" dir="auto">
                    {c.run.revealText}
                  </p>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
