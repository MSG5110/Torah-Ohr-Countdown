import type { PhotoFocus } from "./photoFraming";
import type { TransitionStyle } from "./photoTransitions";
export type SlideItem = {
  url: string;
  token: number;
  seed: number;
  style: TransitionStyle;
  focus?: PhotoFocus;
};
export type PhotoHandoff = {
  shown: SlideItem | null;
  incoming: SlideItem | null;
  pending: SlideItem | null;
};
export const emptyHandoff = (): PhotoHandoff => ({
  shown: null,
  incoming: null,
  pending: null,
});
export function beginPhoto(state: PhotoHandoff, item: SlideItem): PhotoHandoff {
  if (
    state.incoming?.url === item.url &&
    state.incoming.focus === item.focus &&
    !state.pending
  )
    return state;
  if (state.incoming?.url === item.url)
    return {
      ...state,
      incoming: { ...state.incoming, focus: item.focus },
      pending: null,
    };
  if (
    !state.incoming &&
    state.shown?.url === item.url &&
    state.shown.focus === item.focus
  )
    return state;
  if (!state.incoming && state.shown?.url === item.url)
    return { ...state, shown: { ...state.shown, focus: item.focus } };
  return state.incoming
    ? { ...state, pending: item }
    : { ...state, incoming: item, pending: null };
}
export function completePhoto(
  state: PhotoHandoff,
  token: number,
): PhotoHandoff {
  if (state.incoming?.token !== token) return state;
  const next = state.pending;
  return {
    shown: state.incoming,
    incoming: next?.url === state.incoming.url ? null : next,
    pending: null,
  };
}
export function failPhoto(state: PhotoHandoff, token: number): PhotoHandoff {
  return state.incoming?.token === token
    ? { shown: state.shown, incoming: state.pending, pending: null }
    : state;
}
