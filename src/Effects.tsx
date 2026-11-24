import { TrailBuffer, removeUnordered, insertDepth } from "./effectResources";
import { effectsCanvasSize } from "./renderBudget";
import { finalTenCue } from "./operatorEngine";
import { useEffect, useRef } from "react";
import type { Settings } from "./engine";
import {
  bloomTexture,
  finalTenLights,
  flareTexture,
  glintTexture,
  glintEnvelope,
  launchOptics,
} from "./optics";
import { mix, rgba } from "./colors";
import { clamp01, launchTimeline, shells } from "./cinema";
type Spark = {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  life: number;
  max: number;
  size: number;
  trail: TrailBuffer;
  phase: number;
  kind: number;
};
type Rocket = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  fuse: number;
  trail: TrailBuffer;
  depth: number;
  kind: number;
};
type Ribbon = {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  size: number;
  angle: number;
  spin: number;
  phase: number;
  life: number;
  shape: number;
};
function glow(color: string) {
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const g = c.getContext("2d");
  if (!g) return c;
  const gradient = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  gradient.addColorStop(0, mix(color, "#ffffff", 0.6));
  gradient.addColorStop(0.12, rgba(color, 0.8));
  gradient.addColorStop(0.35, rgba(color, 0.15));
  gradient.addColorStop(1, rgba(color, 0));
  g.fillStyle = gradient;
  g.fillRect(0, 0, 64, 64);
  return c;
}
export function Effects({
  s,
  intensity,
  photoActive = false,
  photoFlare = 1,
  deadline = null,
  launchAt,
  reduced,
}: {
  s: Settings;
  intensity: number;
  photoActive?: boolean;
  photoFlare?: number;
  deadline?: number | null;
  launchAt: number | null;
  reduced: boolean;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const liveLaunch = useRef(launchAt);
  liveLaunch.current = launchAt;
  const photo = useRef(photoActive);
  photo.current = photoActive;
  const liveLight = useRef({ photoFlare, deadline });
  liveLight.current = { photoFlare, deadline };
  const level = useRef(intensity);
  level.current = intensity;
  useEffect(() => {
    const canvas = ref.current!,
      ctx = canvas.getContext("2d");
    if (!ctx) return;
    let w = 0,
      h = 0,
      raf = 0,
      last = 0,
      budget = 1,
      targetBudget = 1,
      slow = 0,
      serial = 0,
      released = false,
      curtain = false,
      energy = level.current,
      adaptive = liveLight.current.photoFlare;
    let tenLights: ReturnType<typeof finalTenLights> = [];
    let previousLaunch: number | null = null;
    let zeroRect: DOMRect | null = null;
    const sparks: Spark[] = [],
      rockets: Rocket[] = [],
      confetti: Ribbon[] = [],
      flashes: { x: number; y: number; life: number; size: number }[] = [];
    const particleGlow = glow(s.particleColor),
      fireGlow = glow(s.fireworkColor),
      digitGlow = glow(s.digitColor),
      sparkleGlow = glintTexture(s.particleColor, 0),
      alternateGlint = glintTexture(s.particleColor, 1),
      lensFlare = flareTexture(s.lightColor),
      lightGlow = bloomTexture(s.lightColor);
    const foilFront = Array.from({ length: 256 }, (_, i) =>
        mix(s.confettiColor, "#ffffff", (i / 255) * 0.65),
      ),
      foilBack = mix(s.confettiColor, "#000000", 0.3),
      foilShine = Array.from({ length: 256 }, (_, i) =>
        rgba("#ffffff", (i / 255) * 0.4),
      );
    const fireTrail = rgba(s.fireworkColor, 0.42),
      digitTrail = rgba(s.digitColor, 0.3);
    const dust = Array.from(
      { length: Math.round(s.density * 3.4 * (s.quality === "low" ? 0.5 : 1)) },
      () => ({
        x: (Math.random() - 0.5) * 3,
        y: (Math.random() - 0.5) * 2.4,
        z: 0.55 + Math.random() * 2.7,
        phase: Math.random() * 6.28,
        size: 0.5 + Math.random() * 1.5,
      }),
    );
    const resize = () => {
      w = innerWidth;
      h = innerHeight;
      tenLights = finalTenLights(w, h);
      const size = effectsCanvasSize(
        w,
        h,
        devicePixelRatio || 1,
        s.quality,
        targetBudget,
      );
      canvas.width = size.width;
      canvas.height = size.height;
      ctx.setTransform(size.scale, 0, 0, size.scale, 0, 0);
    };
    resize();
    addEventListener("resize", resize);
    const burst = (r: Rocket) => {
      const scale = (Math.min(w, h) / 760) * r.depth;
      const n = Math.min(
        1400 - sparks.length,
        Math.round(
          ({ low: 90, medium: 155, high: 235 }[s.fireworkIntensity] ?? 155) *
            budget,
        ),
      );
      const max = r.kind === 1 ? 3.8 : 2.7;
      for (let i = 0; i < n; i++) {
        // Evenly distributed directions on a sphere, rather than a flat circle.
        const u = 1 - (2 * (i + 0.5)) / n,
          a = i * 2.399963229728653 + Math.random() * 0.12,
          rad = Math.sqrt(1 - u * u),
          speed = (100 + Math.random() * 85) * scale;
        sparks.push({
          x: r.x,
          y: r.y,
          z: 0,
          vx: Math.cos(a) * rad * speed,
          vy: u * speed,
          vz: Math.sin(a) * rad * speed,
          life: max * (0.7 + Math.random() * 0.3),
          max,
          size: (0.8 + Math.random() * 0.8) * scale,
          trail: new TrailBuffer(r.kind === 1 ? 10 : 6),
          phase: Math.random() * 6.28,
          kind: r.kind,
        });
      }
      flashes.push({ x: r.x, y: r.y, life: 0.45, size: 170 * scale });
    };
    const release = () => {
      const origin = zeroRect ?? {
        left: w * 0.3,
        top: h * 0.25,
        width: w * 0.4,
        height: h * 0.5,
      };
      const mask = document.createElement("canvas");
      mask.width = 480;
      mask.height = Math.max(
        100,
        Math.round((480 * origin.height) / Math.max(1, origin.width)),
      );
      const g = mask.getContext("2d");
      if (!g) return;
      const fontSize = mask.width / 1.04;
      g.font = `800 ${fontSize}px "Barlow Condensed"`;
      g.textAlign = "center";
      g.textBaseline = "alphabetic";
      g.fillStyle = "#fff";
      const metrics = g.measureText("0"),
        ascent = Number.isFinite(metrics.fontBoundingBoxAscent)
          ? metrics.fontBoundingBoxAscent
          : fontSize * 0.96,
        descent = Number.isFinite(metrics.fontBoundingBoxDescent)
          ? metrics.fontBoundingBoxDescent
          : fontSize * 0.2;
      const baseline = (mask.height - ascent - descent) / 2 + ascent;
      g.fillText("0", mask.width * 0.25, baseline);
      g.fillText("0", mask.width * 0.75, baseline);
      const pixels = g.getImageData(0, 0, mask.width, mask.height).data,
        points: { x: number; y: number }[] = [],
        step = Math.max(5, Math.round(mask.height / 60));
      for (let y = 0; y < mask.height; y += step)
        for (let x = 0; x < mask.width; x += step)
          if (pixels[(y * mask.width + x) * 4 + 3] >= 100)
            points.push({ x, y });
      const stride = Math.max(1, Math.ceil(points.length / 320));
      for (let i = 0; i < points.length; i += stride) {
        const { x, y } = points[i],
          life = 1.2 + Math.random() * 1.1;
        sparks.push({
          x: origin.left + (x / mask.width) * origin.width,
          y: origin.top + (y / mask.height) * origin.height,
          z: 0,
          vx: (x - mask.width / 2) * 0.12 + (Math.random() - 0.5) * 35,
          vy: -15 - Math.random() * 40,
          vz: (Math.random() - 0.5) * 45,
          life,
          max: life,
          size: 0.55 + Math.random(),
          trail: new TrailBuffer(6),
          phase: Math.random() * 6.28,
          kind: 2,
        });
      }
    };
    const foilsCapacity = () => confetti.length < 520;
    const frame = (time: number) => {
      if (document.hidden) {
        last = time;
        raf = requestAnimationFrame(frame);
        return;
      }
      const delta = last ? time - last : 16,
        dt = Math.min(delta / 1000, 0.04),
        clock = reduced ? 0 : time * 0.001;
      last = time;
      slow = delta > 28 ? slow + 1 : Math.max(0, slow - 1);
      if (s.quality === "auto" && slow > 80 && targetBudget > 0.55) {
        targetBudget = 0.55;
        resize();
      }
      budget += (targetBudget - budget) * (1 - Math.exp(-dt * 0.65));
      energy += (level.current - energy) * Math.min(1, dt * 0.6);
      adaptive +=
        (liveLight.current.photoFlare - adaptive) * (1 - Math.exp(-dt * 0.7));
      const cue = finalTenCue(
        liveLight.current.deadline === null
          ? Infinity
          : (liveLight.current.deadline - Date.now()) / 1000,
      );
      ctx.clearRect(0, 0, w, h);
      const activeLaunch = liveLaunch.current;
      if (activeLaunch !== previousLaunch) {
        previousLaunch = activeLaunch;
        serial = 0;
        released = false;
        curtain = false;
        zeroRect = null;
        sparks.length = 0;
        rockets.length = 0;
        confetti.length = 0;
        flashes.length = 0;
      }
      const elapsed =
        activeLaunch === null ? -1 : (Date.now() - activeLaunch) / 1000;
      const timeline = launchTimeline(elapsed);
      if (activeLaunch !== null && elapsed >= 0 && !zeroRect)
        zeroRect =
          document
            .querySelector(".countdown-stage .number")
            ?.getBoundingClientRect() ?? null;
      const scale = Math.max(0.4, Math.min(w, h) / 760);
      if (
        !reduced &&
        activeLaunch !== null &&
        elapsed >= 0.78 &&
        elapsed < 2.1 &&
        !released
      ) {
        try {
          release();
        } catch {
          /* A restricted canvas may deny pixel sampling; the reveal still runs. */
        }
        released = true;
      }
      if (!reduced && s.shockwave && elapsed >= 0 && elapsed < 2.4) {
        ctx.globalCompositeOperation = "screen";
        for (let i = 0; i < 2; i++) {
          const t = clamp01((elapsed - i * 0.12) / 2.1);
          if (t === 0) continue;
          ctx.strokeStyle = rgba(
            s.shockwaveColor,
            Math.pow(1 - t, 3) * (i ? 0.12 : 0.4),
          );
          ctx.lineWidth = (1 + i * 3) * scale;
          ctx.beginPath();
          ctx.ellipse(
            zeroRect ? zeroRect.left + zeroRect.width / 2 : w / 2,
            zeroRect ? zeroRect.top + zeroRect.height / 2 : h * 0.5,
            Math.max(1, t * w * 0.9),
            Math.max(1, t * h * 0.9),
            0,
            0,
            6.283,
          );
          ctx.stroke();
        }
      }
      ctx.globalCompositeOperation = "screen";
      const optical = launchOptics(elapsed);
      if (!reduced && elapsed >= 0 && elapsed < 5.8 && s.lighting > 0) {
        const x = zeroRect ? zeroRect.left + zeroRect.width / 2 : w / 2;
        const y = zeroRect ? zeroRect.top + zeroRect.height / 2 : h / 2;
        const radius = w * (0.3 + optical.release * 0.65);
        ctx.globalAlpha =
          (0.13 * optical.gather + 0.48 * optical.release) * s.lighting;
        ctx.drawImage(
          lightGlow,
          x - radius / 2,
          y - radius / 2,
          radius,
          radius,
        );
        // Keep a continuous light bed from the vanishing zero into the title.
        ctx.globalAlpha = optical.handoff * 0.3 * s.lighting;
        ctx.drawImage(lightGlow, w * 0.05, h * 0.05, w * 0.9, h * 0.9);
        ctx.globalAlpha = 1;
      }
      // Broad moving lens illumination sits above photographs, below the type.
      const anticipation = Math.min(1, energy / 4.5);
      for (let i = 0; i < 3; i++) {
        const x =
          w * (i % 2 ? 0.94 : 0.06) + Math.sin(clock * 0.12 + i * 2) * w * 0.07;
        const y = h * (0.16 + i * 0.34) + Math.sin(clock * 0.17 + i) * h * 0.09;
        const size = w * (0.5 + anticipation * 0.15);
        ctx.globalAlpha =
          (0.035 + anticipation * anticipation * 0.13) *
          s.lighting *
          (photo.current ? 1.5 : 1) *
          adaptive *
          (1 + cue.beat * 0.18);
        ctx.drawImage(lightGlow, x - size / 2, y - size / 2, size, size);
      }
      if (!reduced && s.lighting > 0) {
        for (let i = 0; i < 2; i++) {
          const phase = i * 2.37 + 0.19;
          const catchLight = glintEnvelope(clock * 0.38, phase, anticipation);
          const x =
            w * (i ? 0.9 : 0.1) + Math.sin(clock * 0.07 + phase) * w * 0.04;
          const y =
            h * (i ? 0.72 : 0.23) + Math.sin(clock * 0.09 + phase) * h * 0.05;
          const length = w * (0.28 + anticipation * 0.2);
          ctx.globalAlpha = clamp01(
            catchLight *
              (0.22 + anticipation * 0.3) *
              s.lighting *
              (photo.current ? 1.2 : 1) *
              adaptive,
          );
          ctx.drawImage(
            lensFlare,
            x - length / 2,
            y - h * 0.025,
            length,
            h * 0.05,
          );
          const radius = Math.min(w, h) * 0.13;
          ctx.drawImage(
            lightGlow,
            x - radius / 2,
            y - radius / 2,
            radius,
            radius,
          );
        }
      }
      ctx.globalAlpha = 1;
      if (!reduced && cue.build > 0 && s.lighting > 0) {
        const spread = 0.84 + cue.build * 0.16;
        ctx.globalAlpha =
          (cue.build * 0.04 + cue.beat * 0.085) *
          s.lighting *
          (1 - timeline.settle * 0.9);
        for (const light of tenLights) {
          const width = light.width * spread,
            height = light.height * spread;
          ctx.drawImage(
            lightGlow,
            light.x - width / 2,
            light.y - height / 2,
            width,
            height,
          );
        }
        ctx.globalAlpha = 1;
      }
      const visibleDust =
        s.density *
        1.55 *
        (s.quality === "low" ? 0.5 : 1) *
        (1 + Math.min(4.5, energy) * 0.4) *
        budget;
      dust.forEach((p, index) => {
        if (!reduced) {
          p.y -= dt * 0.014 * s.speed * (1 + energy * 0.12);
          p.x +=
            (Math.sin(clock * 0.16 + p.phase) * 0.004 +
              Math.sin(clock * 0.075 + p.y * 2) * 0.003) *
            dt;
          if (p.y < -1.3) {
            p.y = 1.3;
            p.x = (Math.random() - 0.5) * 3;
          }
        }
        const depth =
          p.z + (reduced ? 0 : Math.sin(clock * 0.065 + p.phase) * 0.055);
        const x =
            w / 2 +
            ((p.x + Math.sin(clock * 0.05 + p.phase) * 0.035) * w) / depth,
          y = h / 2 + (p.y * h) / depth;
        if (
          index > visibleDust + 1 ||
          x < -40 ||
          x > w + 40 ||
          y < -40 ||
          y > h + 40
        )
          return;
        const size = p.size * (2.2 / depth) * scale,
          central =
            Math.abs(x - w / 2) < w * 0.28 && Math.abs(y - h * 0.53) < h * 0.18
              ? 0.35
              : 1;
        ctx.globalAlpha = clamp01(
          (0.18 + 0.2 * (1 + Math.sin(clock * 0.7 + p.phase))) *
            s.gold *
            (1 + energy * 0.1) *
            (photo.current ? 1.35 : 1) *
            clamp01((visibleDust - index) / 10) *
            central,
        );
        if (!reduced && index % 5 === 0) {
          const catchLight = glintEnvelope(clock, p.phase, anticipation);
          if (catchLight > 0.02) {
            const alpha = ctx.globalAlpha,
              radius = (22 + size * 10) * (1 + anticipation * 0.55);
            ctx.globalAlpha = Math.min(
              0.85,
              alpha * catchLight * (1.4 + anticipation),
            );
            ctx.save();
            ctx.translate(x, y);
            ctx.rotate(Math.sin(p.phase) * 0.25 + clock * 0.025);
            ctx.drawImage(
              index % 2 ? sparkleGlow : alternateGlint,
              -radius / 2,
              -radius / 2,
              radius,
              radius,
            );
            ctx.restore();
            ctx.globalAlpha = alpha;
          }
        }
        if (p.z < 1.15) {
          const bokeh = size * 12;
          ctx.drawImage(
            particleGlow,
            x - bokeh / 2,
            y - bokeh / 2,
            bokeh,
            bokeh,
          );
        } else {
          ctx.fillStyle = s.particleColor;
          ctx.beginPath();
          ctx.arc(x, y, Math.max(0.35, size), 0, Math.PI * 2);
          ctx.fill();
        }
      });
      ctx.globalAlpha = 1;
      if (!reduced && s.fireworks && timeline.fireworks) {
        while (serial < shells.length && shells[serial] <= elapsed) {
          const i = serial++;
          if (s.fireworkIntensity === "low" && i % 2) continue;
          const depth = 0.65 + (i % 3) * 0.23,
            x = w * ((i % 2 ? 0.84 : 0.16) + ((i % 3) - 1) * 0.035),
            fuse = 0.64 + (i % 3) * 0.12,
            target = h * (0.16 + (i % 3) * 0.105);
          rockets.push({
            x,
            y: h + 20,
            vx: (i % 2 ? -1 : 1) * 24 * scale,
            vy: (target - h - 20) / fuse,
            fuse,
            trail: new TrailBuffer(18),
            depth,
            kind: i % 3 === 1 ? 1 : 0,
          });
        }
      }
      for (let i = rockets.length - 1; i >= 0; i--) {
        const r = rockets[i];
        r.fuse -= dt;
        r.x += r.vx * dt;
        r.y += r.vy * dt;
        r.trail.push(r.x, r.y);
        for (let j = 1; j < r.trail.length; j++) {
          ctx.strokeStyle = rgba(
            s.fireworkColor,
            (1 - j / r.trail.length) * 0.65,
          );
          ctx.lineWidth = (1 - j / r.trail.length) * 2 * scale;
          ctx.beginPath();
          ctx.moveTo(r.trail.x(j - 1), r.trail.y(j - 1));
          ctx.lineTo(r.trail.x(j), r.trail.y(j));
          ctx.stroke();
        }
        ctx.drawImage(
          fireGlow,
          r.x - 9 * scale,
          r.y - 9 * scale,
          18 * scale,
          18 * scale,
        );
        if (r.fuse <= 0) {
          if (elapsed < 11) burst(r);
          removeUnordered(rockets, i);
        }
      }
      for (let i = sparks.length - 1; i >= 0; i--) {
        const p = sparks[i];
        p.life -= dt;
        if (p.life <= 0) {
          removeUnordered(sparks, i);
          continue;
        }
        p.vx *= Math.pow(0.79, dt);
        p.vy += (p.kind === 2 ? 8 : p.kind === 1 ? 48 : 30) * scale * dt;
        p.vz *= Math.pow(0.79, dt);
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.z += p.vz * dt;
        const perspective = 800 / (800 + p.z),
          x = w / 2 + (p.x - w / 2) * perspective,
          y = h / 2 + (p.y - h / 2) * perspective;
        p.trail.push(x, y);
        const fade =
          Math.min(1, p.life / 0.8) *
          (1 - 0.16 * Math.sin(p.phase + p.life * 14));
        ctx.globalAlpha = fade;
        ctx.lineWidth = Math.max(0.35, p.size * perspective * 0.72);
        ctx.strokeStyle = p.kind === 2 ? digitTrail : fireTrail;
        ctx.beginPath();
        for (let j = 0; j < p.trail.length; j++) {
          if (j) ctx.lineTo(p.trail.x(j), p.trail.y(j));
          else ctx.moveTo(p.trail.x(j), p.trail.y(j));
        }
        ctx.stroke();
        ctx.globalAlpha = fade;
        const size = Math.max(5, p.size * perspective * 10);
        ctx.drawImage(
          p.kind === 2 ? digitGlow : fireGlow,
          x - size / 2,
          y - size / 2,
          size,
          size,
        );
        ctx.globalAlpha = 1;
      }
      for (let i = flashes.length - 1; i >= 0; i--) {
        const f = flashes[i];
        f.life -= dt;
        if (f.life <= 0) {
          removeUnordered(flashes, i);
          continue;
        }
        ctx.globalAlpha = f.life * 0.6;
        ctx.drawImage(
          fireGlow,
          f.x - f.size / 2,
          f.y - f.size / 2,
          f.size,
          f.size,
        );
        ctx.globalAlpha = 1;
      }
      ctx.globalCompositeOperation = "source-over";
      if (!reduced && s.confetti && timeline.confetti) {
        const rate =
          ({ low: 35, medium: 75, high: 115 }[s.confettiIntensity] ?? 48) *
          budget *
          (1 - clamp01((elapsed - 9) / 2.5));
        const count = rate * dt + (curtain ? 0 : Math.round(65 * budget));
        curtain = true;
        let n = Math.floor(count) + (Math.random() < count % 1 ? 1 : 0);
        while (n-- && foilsCapacity()) {
          const z = 0.65 + Math.random() * 1.6;
          insertDepth(confetti, {
            x: (Math.random() - 0.5) * w * z,
            y: (-h * 0.5 - 10 - Math.random() * h * 0.05) * z,
            z,
            vx: (Math.random() - 0.5) * 50 * scale,
            vy: (25 + Math.random() * 30) * scale,
            size: (5 + Math.random() * 7) * scale,
            angle: Math.random() * 6.28,
            spin: (Math.random() - 0.5) * 4,
            phase: Math.random() * 6.28,
            life: 10 + Math.random() * 2,
            shape: Math.random() > 0.8 ? 1 : 0,
          });
        }
      }
      // Back-to-front projection and facet shading give the ribbons real depth cues.
      for (let i = confetti.length - 1; i >= 0; i--) {
        const p = confetti[i];
        p.life -= dt;
        p.vy = Math.min(p.vy + 45 * scale * dt, 145 * scale);
        p.x += (p.vx + Math.sin(clock * 1.3 + p.phase) * 20 * scale) * dt;
        p.y += p.vy * dt;
        p.angle += p.spin * dt;
        const projection = 1 / p.z,
          x = w / 2 + p.x * projection,
          y = h / 2 + p.y * projection;
        if (p.life <= 0 || y > h + 70) {
          confetti.splice(i, 1);
          continue;
        }
        if (y < -30) continue;
        const yaw = Math.sin(clock * 1.8 + p.phase),
          pitch = Math.cos(clock * 1.25 + p.phase),
          sx = Math.max(0.06, Math.abs(yaw)),
          sy = 0.55 + Math.abs(pitch) * 0.45,
          size = p.size * projection;
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(p.angle);
        ctx.scale(sx, sy);
        ctx.globalAlpha =
          Math.min(1, p.life / 2) *
          (1 - timeline.settle) *
          Math.min(1, 1.4 / p.z);
        ctx.fillStyle =
          yaw > 0
            ? foilFront[Math.round(Math.pow(Math.abs(pitch), 8) * 255)]
            : foilBack;
        if (p.shape) {
          ctx.beginPath();
          ctx.moveTo(-size / 2, -size);
          ctx.quadraticCurveTo(size, -size * 0.2, size / 2, size);
          ctx.lineTo(-size / 2, size);
          ctx.quadraticCurveTo(0, 0, -size / 2, -size);
          ctx.fill();
        } else {
          ctx.fillRect(-size / 2, -size * 0.8, size, size * 1.6);
          ctx.fillStyle =
            foilShine[Math.round(Math.pow(Math.abs(pitch), 10) * 255)];
          ctx.fillRect(-size / 2, -size * 0.8, size * 0.18, size * 1.6);
        }
        ctx.restore();
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      removeEventListener("resize", resize);
    };
  }, [
    s.density,
    s.speed,
    s.gold,
    s.lighting,
    s.lightColor,
    s.quality,
    s.shockwave,
    s.shockwaveColor,
    s.digitColor,
    s.particleColor,
    s.fireworkColor,
    s.confettiColor,
    s.fireworks,
    s.confetti,
    s.fireworkIntensity,
    s.confettiIntensity,
    reduced,
  ]);
  return <canvas className="effects" ref={ref} aria-hidden="true" />;
}
