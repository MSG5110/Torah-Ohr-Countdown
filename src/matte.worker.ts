import { makeMattePixels, type MatteRequest } from "./matteModel";
self.onmessage = async (event: MessageEvent<MatteRequest>) => {
  const request = event.data;
  try {
    const canvas = new OffscreenCanvas(request.width, request.height),
      g = canvas.getContext("2d");
    if (!g) throw new Error("No matte context");
    const image = g.createImageData(request.width, request.height);
    image.data.set(makeMattePixels(request));
    g.putImageData(image, 0, 0);
    const blob = await canvas.convertToBlob({ type: "image/png" });
    self.postMessage({ id: request.id, blob });
  } catch (error) {
    self.postMessage({ id: request.id, error: String(error) });
  }
};
