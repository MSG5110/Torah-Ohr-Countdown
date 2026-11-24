import {
  entryPose,
  featherFor,
  filmEase,
  photoZoom,
  randomAt,
  type TransitionStyle,
} from "./photoTransitions";
import type { PhotoFocus } from "./photoFraming";
import { focalPoint } from "./photoFraming";
export function photoBufferSize(
  w: number,
  h: number,
  dpr: number,
  maxTexture = 8192,
) {
  const scale = Math.min(
    Math.max(1, dpr || 1),
    2,
    Math.sqrt(8388608 / Math.max(1, w * h)),
    maxTexture / Math.max(w, h),
  );
  return {
    width: Math.max(1, Math.round(w * scale)),
    height: Math.max(1, Math.round(h * scale)),
  };
}
export function coverUV(
  w: number,
  h: number,
  iw: number,
  ih: number,
  x: number,
  y: number,
) {
  const cover = Math.max(w / iw, h / ih),
    rw = iw * cover,
    rh = ih * cover;
  return {
    scale: [w / rw, h / rh],
    offset: [(1 - w / rw) * x, (1 - h / rh) * y],
  };
}
let automaticBlockedUntil = 0;
export function canUsePhotoGPU(quality: string) {
  return (
    typeof WebGLRenderingContext !== "undefined" &&
    quality !== "low" &&
    (quality === "high" || Date.now() >= automaticBlockedUntil)
  );
}
const vertex = `attribute vec2 aPosition; varying vec2 vUV; void main(){gl_Position=vec4(aPosition,0.,1.);vUV=vec2((aPosition.x+1.)*.5,(1.-aPosition.y)*.5);}`;
const fragment = `precision highp float;
varying vec2 vUV;
uniform sampler2D uPhoto,uField,uFrame;
uniform vec2 uCover,uCrop,uShift;
uniform float uScale,uProgress,uFeather,uFramed;
void main(){
 vec2 uv=((vUV-vec2(.5)-uShift)/uScale+vec2(.5))*uCover+uCrop;
 vec4 color=texture2D(uPhoto,clamp(uv,vec2(0.),vec2(1.)));
 float alpha=1.;
 if(uProgress<1.){
  vec4 field=texture2D(uField,vUV);
  float arrival=1.-(field.r*256.+field.g)/257.;
  alpha=clamp((uProgress-arrival)/uFeather+.5,0.,1.);
 }
 if(uProgress<=0.)alpha=0.;
 if(uFramed>.5)alpha*=texture2D(uFrame,vUV).a;
 gl_FragColor=vec4(color.rgb*color.a*alpha,color.a*alpha);
}`;
function transformParts(value: string) {
  const m = value.match(
    /translate\(([-.\d]+)%,\s*([-.\d]+)%\) scale\(([-.\d]+)\)/,
  );
  return m
    ? { x: +m[1] / 100, y: +m[2] / 100, scale: +m[3] }
    : { x: 0, y: 0, scale: 1 };
}
export type PhotoGPU = ReturnType<typeof createPhotoGPU>;
export function createPhotoGPU(
  canvas: HTMLCanvasElement,
  photo: HTMLImageElement,
  field: HTMLImageElement,
  frame: HTMLImageElement | null,
  options: {
    style: TransitionStyle;
    seed: number;
    zoom: number;
    lifetime: number;
    quality: string;
    focus?: PhotoFocus;
    onLost: () => void;
  },
) {
  const gl = canvas.getContext("webgl", {
    alpha: true,
    antialias: false,
    depth: false,
    stencil: false,
    premultipliedAlpha: true,
    preserveDrawingBuffer: false,
    powerPreference: "high-performance",
  });
  if (!gl) throw new Error("GPU photo rendering unavailable");
  const shaders: WebGLShader[] = [],
    textures: WebGLTexture[] = [];
  let program: WebGLProgram | null = null,
    buffer: WebGLBuffer | null = null;
  const compile = (type: number, source: string) => {
    const shader = gl.createShader(type);
    if (!shader) throw new Error("Photo shader unavailable");
    shaders.push(shader);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS))
      throw new Error("Photo shader unsupported");
    return shader;
  };
  let suspended = false;
  let raf = 0,
    disposed = false,
    started: number | null = null,
    duration = 1,
    progress = 0,
    focus = options.focus;
  let pausedAt: number | null = null,
    pausedFor = 0,
    frozen: { scale: number; x: number; y: number } | null = null;
  let departure: {
    started: number;
    duration: number;
    style: TransitionStyle;
  } | null = null;
  const panX = (randomAt(options.seed, 12) - 0.5) * 0.011,
    panY = (randomAt(options.seed, 13) - 0.5) * 0.007;
  let departurePose = { x: 0, y: 0, scale: 1 };
  const pose = entryPose(options.style, options.seed),
    entrance = transformParts(pose.from),
    settled = transformParts(pose.to);
  const uniforms: Record<string, WebGLUniformLocation | null> = {};
  function cleanup() {
    cancelAnimationFrame(raf);
    textures.forEach((t) => gl!.deleteTexture(t));
    shaders.forEach((s) => gl!.deleteShader(s));
    if (buffer) gl!.deleteBuffer(buffer);
    if (program) gl!.deleteProgram(program);
  }
  try {
    const info = gl.getExtension("WEBGL_debug_renderer_info");
    const device = info
      ? String(gl.getParameter(info.UNMASKED_RENDERER_WEBGL))
      : "";
    if (
      options.quality !== "high" &&
      /swiftshader|llvmpipe|softpipe|software/i.test(device)
    ) {
      automaticBlockedUntil = Infinity;
      throw new Error(
        "Use compositor blends without hardware graphics acceleration",
      );
    }
    program = gl.createProgram();
    if (!program) throw new Error("Photo program unavailable");
    gl.attachShader(program, compile(gl.VERTEX_SHADER, vertex));
    gl.attachShader(program, compile(gl.FRAGMENT_SHADER, fragment));
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS))
      throw new Error("Photo program unsupported");
    gl.useProgram(program);
    buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
      gl.STATIC_DRAW,
    );
    const position = gl.getAttribLocation(program, "aPosition");
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
    for (const name of [
      "uPhoto",
      "uField",
      "uFrame",
      "uCover",
      "uCrop",
      "uShift",
      "uScale",
      "uProgress",
      "uFeather",
      "uFramed",
    ])
      uniforms[name] = gl.getUniformLocation(program, name);
    const max = gl.getParameter(gl.MAX_TEXTURE_SIZE) as number;
    if (photo.naturalWidth > max || photo.naturalHeight > max)
      throw new Error("Native photo exceeds GPU texture size");
    for (const [index, source] of [photo, field, frame].entries()) {
      const texture = gl.createTexture();
      if (!texture) throw new Error("Photo texture unavailable");
      textures.push(texture);
      gl.activeTexture(gl.TEXTURE0 + index);
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
      if (source)
        gl.texImage2D(
          gl.TEXTURE_2D,
          0,
          gl.RGBA,
          gl.RGBA,
          gl.UNSIGNED_BYTE,
          source,
        );
      else
        gl.texImage2D(
          gl.TEXTURE_2D,
          0,
          gl.RGBA,
          1,
          1,
          0,
          gl.RGBA,
          gl.UNSIGNED_BYTE,
          new Uint8Array([255, 255, 255, 255]),
        );
      gl.uniform1i(uniforms[["uPhoto", "uField", "uFrame"][index]], index);
    }
    if (gl.getError() !== gl.NO_ERROR)
      throw new Error("Photo texture upload failed");
    gl.uniform1f(uniforms.uFeather, featherFor(options.style));
    gl.uniform1f(uniforms.uFramed, frame ? 1 : 0);
  } catch (error) {
    cleanup();
    gl.getExtension("WEBGL_lose_context")?.loseContext();
    throw error;
  }
  function camera(now: number) {
    if (frozen) return frozen;
    const elapsed =
      started === null
        ? 0
        : Math.max(0, ((pausedAt ?? now) - started - pausedFor) / 1000);
    const e = filmEase((elapsed * 1000) / duration),
      z = Math.min(1, elapsed / options.lifetime);
    const scale = photoZoom(elapsed, options.zoom, options.lifetime),
      x = panX * z,
      y = panY * z;
    const es = entrance.scale + (settled.scale - entrance.scale) * e;
    let ds = 1,
      dx = 0,
      dy = 0;
    if (departure) {
      const p = filmEase((now - departure.started) / departure.duration),
        end = departurePose;
      ds = 1 + (end.scale - 1) * p;
      dx = end.x * p;
      dy = end.y * p;
    }
    return {
      scale: scale * es * ds,
      x: dx + ds * (entrance.x * (1 - e) + es * x),
      y: dy + ds * (entrance.y * (1 - e) + es * y),
    };
  }
  function draw(now = performance.now()) {
    if (disposed || suspended || gl!.isContextLost()) return;
    const c = camera(now);
    gl!.uniform2f(uniforms.uShift, c.x, c.y);
    gl!.uniform1f(uniforms.uScale, c.scale);
    gl!.uniform1f(uniforms.uProgress, progress);
    gl!.drawArrays(gl!.TRIANGLES, 0, 6);
  }
  let lastFrame = 0,
    slowFrames = 0,
    samples = 0;
  function tick(now: number) {
    if (disposed || suspended) {
      raf = 0;
      return;
    }
    if (
      lastFrame &&
      now - lastFrame < 500 &&
      options.quality !== "high" &&
      !document.hidden
    ) {
      samples++;
      if (now - lastFrame > 34) slowFrames++;
      if (samples >= 30) {
        if (slowFrames > 15) automaticBlockedUntil = Date.now() + 600000;
        samples = 0;
        slowFrames = 0;
      }
    }
    lastFrame = now;
    raf = 0;
    draw(now);
    const moving =
      started !== null &&
      !frozen &&
      (now - started - pausedFor <
        Math.max(duration, options.zoom > 0 ? options.lifetime * 1000 : 0) ||
        (departure && now < departure.started + departure.duration));
    if (moving || progress < 1) raf = requestAnimationFrame(tick);
  }
  function requestDraw() {
    if (!raf && !disposed && !suspended) raf = requestAnimationFrame(tick);
  }
  function resize() {
    const w = canvas.clientWidth || innerWidth,
      h = canvas.clientHeight || innerHeight,
      size = photoBufferSize(
        w,
        h,
        devicePixelRatio,
        gl!.getParameter(gl!.MAX_TEXTURE_SIZE),
      );
    if (canvas.width !== size.width || canvas.height !== size.height) {
      canvas.width = size.width;
      canvas.height = size.height;
      gl!.viewport(0, 0, size.width, size.height);
    }
    const f = focalPoint(focus, h > w),
      uv = coverUV(w, h, photo.naturalWidth, photo.naturalHeight, f.x, f.y);
    gl!.uniform2f(uniforms.uCover, ...(uv.scale as [number, number]));
    gl!.uniform2f(uniforms.uCrop, ...(uv.offset as [number, number]));
    draw();
    requestDraw();
  }
  function lost(event: Event) {
    event.preventDefault();
    cancelAnimationFrame(raf);
    if (!disposed) options.onLost();
  }
  canvas.addEventListener("webglcontextlost", lost);
  addEventListener("resize", resize);
  resize();
  // Release rendering bandwidth once the three-second photo fade finishes,
  // especially during the final ten seconds and the fireworks reveal.
  const slideshow = canvas.closest(".slideshow");
  let suspendTimer: ReturnType<typeof setTimeout> | undefined;
  const visibility = () => {
    clearTimeout(suspendTimer);
    if (slideshow?.classList.contains("faded")) {
      suspendTimer = setTimeout(() => {
        suspended = true;
        cancelAnimationFrame(raf);
        raf = 0;
      }, 3050);
    } else {
      suspended = false;
      requestDraw();
    }
  };
  const observer = new MutationObserver(visibility);
  if (slideshow)
    observer.observe(slideshow, {
      attributes: true,
      attributeFilter: ["class"],
    });
  visibility();
  return {
    start(at: number, ms: number) {
      if (started === null) {
        started = at;
        duration = ms;
      }
      requestDraw();
    },
    progress(p: number) {
      progress = p;
      if (p >= 1) draw();
      requestDraw();
    },
    focus(value?: PhotoFocus) {
      focus = value;
      resize();
    },
    departure(value: typeof departure) {
      departure = value;
      departurePose = value
        ? transformParts(entryPose(value.style, options.seed).exit)
        : { x: 0, y: 0, scale: 1 };
      requestDraw();
    },
    reduced(value: boolean) {
      const now = performance.now();
      if (value && !frozen) {
        frozen = camera(now);
        pausedAt = now;
      }
      if (!value && frozen) {
        pausedFor += now - (pausedAt ?? now);
        pausedAt = null;
        frozen = null;
      }
      requestDraw();
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      clearTimeout(suspendTimer);
      observer.disconnect();
      canvas.removeEventListener("webglcontextlost", lost);
      removeEventListener("resize", resize);
      cleanup();
      gl!.getExtension("WEBGL_lose_context")?.loseContext();
    },
  };
}
