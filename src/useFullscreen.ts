import { useEffect, useRef, useState } from "react";
import { displayIsFullscreen, toggleDisplayFullscreen, fullscreenHelp } from "./fullscreen";
export function useFullscreen(onEntered: () => void) {
  const [active, setActive] = useState(() => displayIsFullscreen());
  const [pending, setPending] = useState(false), [error, setError] = useState("");
  const locked = useRef(false), mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    const changed = () => setActive(displayIsFullscreen());
    document.addEventListener("fullscreenchange", changed);
    document.addEventListener("webkitfullscreenchange", changed);
    return () => {
      mounted.current = false;
      document.removeEventListener("fullscreenchange", changed);
      document.removeEventListener("webkitfullscreenchange", changed);
    };
  }, []);
  async function toggle() {
    if (locked.current) return;
    locked.current = true; setPending(true); setError("");
    try {
      const result = await toggleDisplayFullscreen();
      if (mounted.current) {
        setActive(displayIsFullscreen());
        if (result === "entered") onEntered();
      }
    } catch {
      if (mounted.current) setError(fullscreenHelp());
    } finally {
      locked.current = false;
      if (mounted.current) setPending(false);
    }
  }
  return { active, pending, error, toggle };
}
