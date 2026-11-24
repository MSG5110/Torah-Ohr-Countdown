import {sharedEnabled,sharedSubscribe,cloudPhotos} from "./sharedClient";
import { useEffect, useState, useSyncExternalStore } from "react";
import { PhotoLibrary } from "./photoLibrary";
export function usePhotoLibrary(onFirstAdded: () => void) {
  const [library] = useState(() => new PhotoLibrary());
  library.onFirstAdded = onFirstAdded;
  const state = useSyncExternalStore(library.subscribe, library.getSnapshot);
  useEffect(() => { void library.load(); }, [library]);
  useEffect(()=>{
    if(!sharedEnabled())return;
    const update=()=>library.receiveRemote(cloudPhotos());update();return sharedSubscribe(update);
  },[library,state.saving,state.progress]);
  return { ...state, library };
}
export type GalleryController = ReturnType<typeof usePhotoLibrary>;
