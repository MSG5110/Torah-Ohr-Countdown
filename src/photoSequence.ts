export type PhotoOrder = "ordered" | "shuffle";
export type PhotoSequence = {
  ids: string[];
  mode: PhotoOrder;
  cycle: string[];
  index: number;
  following: string[];
};
function shuffled(
  ids: string[],
  avoid: string | undefined,
  random: () => number,
) {
  const result = [...ids];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  // Each cycle contains every photo once; its first photo cannot repeat the
  // final photo of the preceding cycle when at least two photos exist.
  if (result.length > 1 && result[0] === avoid) {
    const j = 1 + Math.floor(random() * (result.length - 1));
    [result[0], result[j]] = [result[j], result[0]];
  }
  return result;
}
export function createPhotoSequence(
  ids: string[],
  mode: PhotoOrder,
  current?: string,
  random = Math.random,
): PhotoSequence {
  const keep = current !== undefined && ids.includes(current);
  const cycle =
    mode === "ordered"
      ? [...ids]
      : keep
        ? [
            current,
            ...shuffled(
              ids.filter((id) => id !== current),
              undefined,
              random,
            ),
          ]
        : shuffled(ids, undefined, random);
  return {
    ids: [...ids],
    mode,
    cycle,
    index: mode === "ordered" && keep ? ids.indexOf(current) : 0,
    following:
      mode === "ordered" ? [...ids] : shuffled(ids, cycle.at(-1), random),
  };
}
export function currentPhotoId(sequence: PhotoSequence) {
  return sequence.cycle[sequence.index];
}
export function nextPhotoId(sequence: PhotoSequence) {
  return sequence.cycle[sequence.index + 1] ?? sequence.following[0];
}
export function advancePhotoSequence(
  sequence: PhotoSequence,
  random = Math.random,
): PhotoSequence {
  if (!sequence.cycle.length) return sequence;
  if (sequence.index + 1 < sequence.cycle.length)
    return { ...sequence, index: sequence.index + 1 };
  const cycle = sequence.following;
  return {
    ...sequence,
    cycle,
    index: 0,
    following:
      sequence.mode === "ordered"
        ? [...sequence.ids]
        : shuffled(sequence.ids, cycle.at(-1), random),
  };
}
export function reconcilePhotoSequence(
  previous: PhotoSequence,
  ids: string[],
  mode: PhotoOrder,
  random = Math.random,
) {
  if (
    mode === previous.mode &&
    ids.length === previous.ids.length &&
    ids.every((id, i) => id === previous.ids[i])
  )
    return previous;
  return createPhotoSequence(ids, mode, currentPhotoId(previous), random);
}
