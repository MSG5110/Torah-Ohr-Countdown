// Fixed trail storage avoids allocating and shifting thousands of points every
// frame during the launch. Newest-to-oldest drawing order is retained.
export class TrailBuffer {
  readonly values: Float64Array;
  head = 0;
  length = 0;
  constructor(readonly capacity: number) {
    this.values = new Float64Array(capacity * 2);
  }
  push(x: number, y: number) {
    this.head = (this.head + this.capacity - 1) % this.capacity;
    this.values[this.head * 2] = x;
    this.values[this.head * 2 + 1] = y;
    this.length = Math.min(this.capacity, this.length + 1);
  }
  x(i: number) {
    return this.values[((this.head + i) % this.capacity) * 2];
  }
  y(i: number) {
    return this.values[((this.head + i) % this.capacity) * 2 + 1];
  }
}
export function removeUnordered<T>(rows: T[], index: number) {
  const last = rows.pop()!;
  if (index < rows.length) rows[index] = last;
}
// Depth does not change after birth; ordered insertion avoids a per-frame sort.
export function insertDepth<T extends { z: number }>(rows: T[], item: T) {
  let low = 0,
    high = rows.length;
  while (low < high) {
    const mid = (low + high) >>> 1;
    if (rows[mid].z <= item.z) low = mid + 1;
    else high = mid;
  }
  rows.splice(low, 0, item);
}
