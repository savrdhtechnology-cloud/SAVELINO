/**
 * Finds faces in product photos so creatives can start below the chin ("hide faces").
 * Runs fully in the browser with Google's free MediaPipe face detector, loaded on demand
 * from a CDN the first time it is needed. Returns the face's lower edge as a fraction of
 * the photo height, or null when no face is visible.
 */
const VERSION = "0.10.14";
const BUNDLE = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${VERSION}/vision_bundle.mjs`;
const WASM = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${VERSION}/wasm`;
const MODEL = "https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite";

type Detection = { boundingBox?: { originX: number; originY: number; width: number; height: number }; categories?: { score: number }[] };
type Detector = { detect: (img: HTMLCanvasElement) => { detections: Detection[] } };

let detector: Promise<Detector> | null = null;

function load(): Promise<Detector> {
  if (!detector) {
    detector = (async () => {
      const vision = await import(/* webpackIgnore: true */ BUNDLE);
      const files = await vision.FilesetResolver.forVisionTasks(WASM);
      return (await vision.FaceDetector.createFromOptions(files, {
        baseOptions: { modelAssetPath: MODEL, delegate: "CPU" },
        runningMode: "IMAGE",
        minDetectionConfidence: 0.45,
      })) as Detector;
    })();
    detector.catch(() => {
      detector = null; // allow a retry later
    });
  }
  return detector;
}

/** Lower edge of the lowest face (plus a little room for the chin), 0–1 of the photo height. */
export async function findFaceBottom(bitmap: ImageBitmap): Promise<number | null> {
  const det = await load();
  const scale = Math.min(1, 768 / Math.max(bitmap.width, bitmap.height));
  const c = document.createElement("canvas");
  c.width = Math.round(bitmap.width * scale);
  c.height = Math.round(bitmap.height * scale);
  c.getContext("2d")?.drawImage(bitmap, 0, 0, c.width, c.height);
  const { detections } = det.detect(c);
  let bottom: number | null = null;
  for (const d of detections ?? []) {
    const b = d.boundingBox;
    if (!b) continue;
    const y = (b.originY + b.height * 1.28) / c.height; // box ends near the mouth — add the chin
    bottom = Math.max(bottom ?? 0, Math.min(0.75, y));
  }
  return bottom;
}
