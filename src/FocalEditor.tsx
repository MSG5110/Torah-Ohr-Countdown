import {acquirePhoto} from "./photoResources";
import { useEffect, useState } from "react";
import type { Photo } from "./storage";
import { focalPoint, type PhotoFocus } from "./photoFraming";
export function FocalEditor({
  photo,
  onSave,
}: {
  photo: Photo;
  onSave: (photo: Photo) => void;
}) {
  const [url, setURL] = useState(""),
    [portrait, setPortrait] = useState(false),
    [focus, setFocus] = useState<PhotoFocus>(photo);
  useEffect(() => {
    const lease=acquirePhoto(photo);
    setURL(lease.url);
    return lease.release;
  }, [photo.blob,photo.remoteUrl]);
  const point = focalPoint(focus, portrait);
  const change = (x: number, y: number) =>
    setFocus((old) => ({
      ...old,
      ...(portrait ? { portraitX: x, portraitY: y } : { focalX: x, focalY: y }),
    }));
  return (
    <div className="focal-editor">
      <h3>Frame this photo</h3>
      <p>
        Select the part to keep visible. TV and phone positions save separately.
      </p>
      <div className="prize-actions">
        <button onClick={() => setPortrait(false)} aria-pressed={!portrait}>
          TV / landscape
        </button>
        <button onClick={() => setPortrait(true)} aria-pressed={portrait}>
          Phone / portrait
        </button>
      </div>
      <div
        className="focal-picker"
        onClick={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          change(
            Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)),
            Math.max(0, Math.min(1, (e.clientY - r.top) / r.height)),
          );
        }}
      >
        {url && <img src={url} alt={`Select focal point for ${photo.name}`} />}
        <span
          className="focal-marker"
          style={{ left: `${point.x * 100}%`, top: `${point.y * 100}%` }}
        />
      </div>
      <div className="prize-duration">
        {(["x", "y"] as const).map((axis) => (
          <label className="field" key={axis}>
            <span>{axis === "x" ? "Horizontal" : "Vertical"} focus</span>
            <input
              type="range"
              min="0"
              max="1"
              step=".01"
              value={point[axis]}
              onChange={(e) =>
                change(
                  axis === "x" ? +e.target.value : point.x,
                  axis === "y" ? +e.target.value : point.y,
                )
              }
            />
          </label>
        ))}
      </div>
      <div className="focal-previews">
        {[false, true].map((p) => {
          const f = focalPoint(focus, p);
          return (
            <figure key={String(p)}>
              <div style={{ aspectRatio: p ? "9/16" : "16/9" }}>
                <img
                  src={url || undefined}
                  alt={`${p ? "Phone" : "TV"} crop preview`}
                  style={{ objectPosition: `${f.x * 100}% ${f.y * 100}%` }}
                />
              </div>
              <figcaption>{p ? "Phone" : "TV"}</figcaption>
            </figure>
          );
        })}
      </div>
      <div className="prize-actions">
        <button
          className="primary"
          onClick={() => onSave({ ...photo, ...focus })}
        >
          Save framing
        </button>
        <button
          onClick={() =>
            setFocus({
              focalX: 0.5,
              focalY: 0.5,
              portraitX: 0.5,
              portraitY: 0.5,
            })
          }
        >
          Center both
        </button>
      </div>
    </div>
  );
}
