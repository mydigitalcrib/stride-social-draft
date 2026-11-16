// The hand-tracking model, on a thread of its own (started by hand-motion.ts). A pass over one camera frame takes
// tens of milliseconds: here, that never holds up the page. It's sent the camera's frames one at a time and answers
// each with what it saw: whether there's a hand, where its palm is, how open it is, and whether the model calls it a
// fist. Nothing leaves the visitor's device.
// It runs on the processor, not the graphics card, on purpose: on the card it was twice as quick, but it took the
// card from the canvas it's there to move, which fell to half its frames (measured, 2026-11-10).
import { GestureRecognizer } from '@mediapipe/tasks-vision';

type Start = { type: 'start'; loader: string; binary: string; model: string };
type Frame = { type: 'frame'; bitmap: ImageBitmap; at: number };
export type Seen = { type: 'hand'; at: number; seen: boolean; x: number; y: number; open: number; fist: number };
export type FromWorker = Seen | { type: 'ready' } | { type: 'failed' };

type Point = { x: number; y: number; z: number };
const PALM = [0, 5, 9, 13, 17]; // the wrist and the four knuckles
const FINGERS = [
  [8, 5],
  [12, 9],
  [16, 13],
  [20, 17],
]; // each finger's tip and knuckle (not the thumb: it closes sideways)
const between = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
// How open the hand is: how far the fingertips are from the wrist, in knuckle distances (about 1.8 flat, 1 in a fist).
const openness = (hand: Point[]) => FINGERS.reduce((sum, [tip, knuckle]) => sum + between(hand[tip], hand[0]) / (between(hand[knuckle], hand[0]) || 1), 0) / FINGERS.length;

const scope = self as unknown as { postMessage(message: FromWorker): void; onmessage: ((e: MessageEvent<Start | Frame>) => void) | null };
let recogniser: GestureRecognizer | null = null;

scope.onmessage = async (e) => {
  const message = e.data;
  if (message.type === 'start') {
    try {
      const files = { wasmLoaderPath: message.loader, wasmBinaryPath: message.binary };
      recogniser = await GestureRecognizer.createFromOptions(files, { baseOptions: { modelAssetPath: message.model, delegate: 'CPU' }, runningMode: 'VIDEO', numHands: 1 });
      scope.postMessage({ type: 'ready' });
    } catch {
      scope.postMessage({ type: 'failed' });
    }
    return;
  }
  const answer: Seen = { type: 'hand', at: message.at, seen: false, x: 0.5, y: 0.5, open: 2, fist: 0 };
  try {
    const result = recogniser?.recognizeForVideo(message.bitmap, message.at);
    const marks = result?.landmarks[0];
    if (result && marks) {
      const said = result.gestures[0]?.[0];
      answer.seen = true;
      answer.x = PALM.reduce((sum, i) => sum + marks[i].x, 0) / PALM.length;
      answer.y = PALM.reduce((sum, i) => sum + marks[i].y, 0) / PALM.length;
      // In the hand's own proportions (its joints in space), so its distance from the camera doesn't matter.
      answer.open = openness(result.worldLandmarks[0] ?? marks);
      answer.fist = said?.categoryName === 'Closed_Fist' ? said.score : 0;
    }
  } catch {
    // A frame it couldn't read: no hand in it.
  }
  message.bitmap.close();
  scope.postMessage(answer);
};
