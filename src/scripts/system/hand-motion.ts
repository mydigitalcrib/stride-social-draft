// Moving things with your hand, through the camera (Our Work's canvas, work-canvas.ts). Only when the visitor turns it
// on, and all on their device: nothing is recorded or sent anywhere.
// It follows the hand itself: the camera's frames go, one at a time, to a hand-tracking model that runs in the
// browser, on a thread of its own so the page never waits for it (hand-worker.ts; MediaPipe's gesture recogniser: its
// engine comes from the npm package, its model is public/assets/vendor/mediapipe/gesture_recognizer.task; see
// docs/ASSET-SOURCES.md). Both are fetched only when the camera is turned on. A frame is only sent once the last one
// has been answered, so it never falls behind.
// Where the hand is: the middle of the palm (the wrist and the four knuckles), which hardly moves when the fingers do,
// so closing the hand doesn't drag what's under it. Mirrored, so it moves the way you do, and steadied without lag (a
// filter that smooths slow movement and follows fast movement closely).
// A fist: the model says so, or the fingertips are folded back to the palm (measured in the hand's own proportions, so
// its distance from the camera doesn't matter). A plain fist is believed at once; anything less sure, and opening
// again, takes two answers in a row (the model answers some ten times a second).
// Moving a hand one way and bringing it back would undo the move, so the way back is ignored: a movement against the
// last one, starting soon after it, doesn't count until the hand pauses. A fist moves nothing, nor does the hand for
// a moment after it closes or opens. Handed on with each answer: where the hand is, how fast it's moving (in frame
// widths and heights a second), whether that should move things, and whether it's a fist.
import loaderUrl from '@mediapipe/tasks-vision/vision_wasm_module_internal.js?url';
import binaryUrl from '@mediapipe/tasks-vision/vision_wasm_module_internal.wasm?url';
import type { FromWorker, Seen } from './hand-worker';

const MODEL = '/assets/vendor/mediapipe/gesture_recognizer.task';
const START_MS = 30000; // longer than this for the model to arrive, and it's given up
const LOST_MS = 400; // gone this long, the hand is taken as new when it's seen again
const MIN_SPEED = 0.14; // frame widths a second: slower than this, it's pointing, not moving things
const RETURN_MS = 450; // a movement the other way starting within this of the last one is the hand coming back
const PAUSE_MS = 160; // still this long, a movement is over
const SETTLE_MS = 260; // after closing or opening, the hand moves nothing for this long
const FIST_SURE = 0.5; // how sure the model must be that it's a fist
const CLOSED = 1.12; // fingertips this near the wrist (in knuckle distances) is a fist whatever the model says...
const OPEN = 1.4; // ...and beyond this it isn't, whatever it says
const BELIEVE = 2; // answers in a row before a change of open or closed is believed...
const PLAIN = 0.75; // ...unless the model is this sure it's a fist,
const TIGHT = 1; // or the fingertips are this near the wrist: then it's believed at once

export type HandFrame = {
  x: number; // where the palm is, 0 to 1 across the (mirrored) picture
  y: number;
  vx: number; // how fast it's moving things, in frame widths (heights) a second; 0 when it shouldn't
  vy: number;
  moving: boolean; // it's moving things now
  seen: boolean; // the camera sees a hand
  fist: boolean; // it's closed into a fist
};

// A one-euro filter: steady when slow, quick when fast. (Casiez, Roussel and Vogel, 2012.)
function smoother(minCutoff = 1.4, beta = 5, dCutoff = 1.2) {
  let value: number | null = null;
  let speed = 0;
  const alpha = (cutoff: number, dt: number) => 1 / (1 + 1 / (2 * Math.PI * cutoff * dt));
  return {
    next(v: number, dt: number) {
      if (value === null) return (value = v);
      const raw = (v - value) / dt;
      speed += alpha(dCutoff, dt) * (raw - speed);
      value += alpha(minCutoff + beta * Math.abs(speed), dt) * (v - value);
      return value;
    },
    reset() {
      value = null;
      speed = 0;
    },
  };
}

/** Turns the camera on and starts watching. Resolves to a stop function, or rejects if the camera or the model isn't available. */
export async function startHandMotion(preview: HTMLVideoElement, onFrame: (f: HandFrame) => void): Promise<() => void> {
  const stream = await navigator.mediaDevices.getUserMedia({
    video: { width: { ideal: 640 }, height: { ideal: 480 }, frameRate: { ideal: 30 }, facingMode: 'user' },
    audio: false,
  });
  preview.srcObject = stream;
  preview.muted = true;
  await preview.play().catch(() => {});

  // The model, on its own thread.
  const worker = new Worker(new URL('./hand-worker.ts', import.meta.url), { type: 'module' });
  const release = () => {
    worker.terminate();
    stream.getTracks().forEach((t) => t.stop());
    preview.srcObject = null;
  };
  const here = (path: string) => new URL(path, window.location.href).href;
  try {
    await new Promise<void>((ready, failed) => {
      const late = window.setTimeout(() => failed(new Error('hand model: too long')), START_MS);
      worker.onmessage = (e: MessageEvent<FromWorker>) => {
        window.clearTimeout(late);
        if (e.data.type === 'ready') ready();
        else failed(new Error('hand model: failed'));
      };
      worker.onerror = () => {
        window.clearTimeout(late);
        failed(new Error('hand model: failed'));
      };
      worker.postMessage({ type: 'start', loader: here(loaderUrl), binary: here(binaryUrl), model: here(MODEL) });
    });
  } catch (error) {
    release();
    throw error;
  }

  const fx = smoother();
  const fy = smoother();
  let x = 0.5;
  let y = 0.5;
  let lastSeen = 0; // when the hand was last seen
  let lastMove = 0; // when it last moved things
  let lastAt = 0; // when the last answered frame was taken
  let prevX = 0.5;
  let prevY = 0.5;
  let vx = 0;
  let vy = 0;
  let had = false; // seen in the frame before
  let fist = false;
  let doubt = 0; // answers in a row that disagree with `fist`
  let changedAt = 0; // when it last closed or opened
  // The way it last moved things, and when; and whether it's on its way back now.
  let wayX = 0;
  let wayY = 0;
  let wayAt = 0;
  let returning = false;
  let running = true;
  let busy = false; // a frame is with the model
  let lastVideoTime = -1;

  // What the model saw in a frame (taken at `at`).
  const read = (hand: Seen) => {
    const now = hand.at;
    const dt = lastAt ? Math.min(0.2, Math.max(0.001, (now - lastAt) / 1000)) : 1 / 30;
    lastAt = now;
    if (hand.seen) {
      if (now - lastSeen > LOST_MS) {
        fx.reset();
        fy.reset();
        had = false;
      }
      lastSeen = now;
      // Mirrored: your right hand is on the right.
      x = fx.next(1 - hand.x, dt);
      y = fy.next(hand.y, dt);
      // Its speed, from how far the steadied palm moved (none on the first frame it's seen: it just arrived).
      const rx = had ? (x - prevX) / dt : 0;
      const ry = had ? (y - prevY) / dt : 0;
      vx += (rx - vx) * 0.5;
      vy += (ry - vy) * 0.5;
      prevX = x;
      prevY = y;
      had = true;
      // Open or closed.
      const closed = hand.open < OPEN && (hand.open < CLOSED || hand.fist >= FIST_SURE);
      const plain = closed && (hand.fist >= PLAIN || hand.open < TIGHT);
      doubt = closed === fist ? 0 : doubt + 1;
      if (doubt >= BELIEVE || (doubt && plain)) {
        fist = closed;
        doubt = 0;
        changedAt = now;
      }
    } else {
      had = false;
      vx *= 0.5;
      vy *= 0.5;
      // Out of sight for a while, it's no longer a fist (so coming back closed counts as closing).
      if (fist && now - lastSeen > LOST_MS) {
        fist = false;
        doubt = 0;
      }
    }
    // Moving things, or pointing, or coming back.
    const speed = Math.hypot(vx, vy);
    let moving = hand.seen && !fist && now - changedAt > SETTLE_MS && speed > MIN_SPEED;
    if (moving) {
      const ux = vx / speed;
      const uy = vy / speed;
      const along = ux * wayX + uy * wayY;
      // Back the first way again (a wave, with no pause): that counts.
      if (returning && along > 0.25) returning = false;
      else if (!returning && wayAt && now - wayAt < RETURN_MS && along < -0.25) returning = true;
      if (returning) moving = false;
      else {
        wayX = ux;
        wayY = uy;
        wayAt = now;
      }
      lastMove = now;
    } else if (now - lastMove > PAUSE_MS) {
      returning = false;
    }
    onFrame({ x, y, vx: moving ? vx : 0, vy: moving ? vy : 0, moving, seen: hand.seen, fist: hand.seen && fist });
  };
  worker.onmessage = (e: MessageEvent<FromWorker>) => {
    if (e.data.type !== 'hand') return;
    busy = false;
    if (running) read(e.data);
  };

  // Each new frame of the camera's goes to the model, unless it's still on the last one.
  const send = async () => {
    if (busy || !running || preview.readyState < 2) return;
    busy = true;
    const at = performance.now();
    try {
      const bitmap = await createImageBitmap(preview);
      if (!running) return bitmap.close();
      worker.postMessage({ type: 'frame', bitmap, at }, [bitmap]);
    } catch {
      busy = false;
    }
  };
  type Rvfc = HTMLVideoElement & { requestVideoFrameCallback(cb: () => void): number; cancelVideoFrameCallback(id: number): void };
  const video = preview as Rvfc;
  const perFrame = 'requestVideoFrameCallback' in HTMLVideoElement.prototype;
  let handle = 0;
  const next = () => {
    if (!running) return;
    if (perFrame) {
      handle = video.requestVideoFrameCallback(() => {
        void send();
        next();
      });
    } else {
      handle = requestAnimationFrame(() => {
        if (preview.currentTime !== lastVideoTime) {
          lastVideoTime = preview.currentTime;
          void send();
        }
        next();
      });
    }
  };
  next();

  return () => {
    running = false;
    if (perFrame) video.cancelVideoFrameCallback(handle);
    else cancelAnimationFrame(handle);
    release();
  };
}
