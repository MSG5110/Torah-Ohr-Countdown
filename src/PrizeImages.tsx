import {acquirePhoto} from "./photoResources";
import { useEffect, useState } from "react";
import type { Photo } from "./storage";
export function usePrizeURL(prize?: Photo) {
  const [url, setURL] = useState("");
  useEffect(() => {
    if (!prize) {
      setURL("");
      return;
    }
    const lease=acquirePhoto(prize);
    setURL(lease.url);
    return lease.release;
  }, [prize?.blob,prize?.remoteUrl]);
  return url;
}
export function PrizeThumb({ prize }: { prize: Photo }) {
  const thumbnail = prize.thumbnailUrl ? {...prize,remoteUrl:prize.thumbnailUrl} : prize.thumbnail
    ? { ...prize, blob: prize.thumbnail,remoteUrl:prize.thumbnailUrl??prize.remoteUrl }
    : prize;
  const url = usePrizeURL(thumbnail);
  return (
    <img
      loading="lazy"
      decoding="async"
      src={url || undefined}
      alt={prize.name}
    />
  );
}
